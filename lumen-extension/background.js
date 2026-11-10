importScripts("config.js", "score-contract.js", "domain-classifier.js", "handshake-policy.js", "privacy-url.js", "observation-policy.js", "extension-auth.js");

const API_URL = LumenConfig.apiBaseUrl;

const { categoryWeights, windowSize, calculateScoreFromWeights, scoreState, methodVersion } =
  LumenScoreContract;
const { classifyUrl } = LumenDomainClassifier;
const { createChallengeRegistry, isTrustedDashboardUrl } = LumenHandshakePolicy;
const {
  automaticObservationKey,
  createNavigationTracker,
  localAnalysisKeys,
  shouldAutomaticallyObserve,
  updatedTabUrl,
} = LumenObservationPolicy;
const connectChallenges = createChallengeRegistry();
const navigationTracker = createNavigationTracker();
let refreshPromise = null;

void LumenExtensionAuth.configureTrustedStorage(chrome.storage.local, chrome.storage.session).catch(() => {});

function isExtensionSender(sender) {
  return sender?.id === chrome.runtime.id && String(sender?.url || "").startsWith(`chrome-extension://${chrome.runtime.id}/`);
}

function senderOrigin(sender) {
  try {
    return new URL(sender?.url ?? "").origin;
  } catch {
    return "";
  }
}

async function setIconByScore(score) {
  const state = scoreState(score).key;
  const path =
    state === "verde"
      ? "icon-verde.png"
      : state === "amarelo"
      ? "icon-amarelo.png"
      : "icon-vermelho.png";

  await chrome.action.setIcon({ path: { 128: path } });
}

async function sendOverlayUpdateToTab(tabId, payload) {
  try {
    await chrome.tabs.sendMessage(tabId, { type: "LUMEN_UPDATE", ...payload });
  } catch {
    // content script pode não estar pronto (página especial, etc.)
  }
}

/**
 * ✅ Atualiza score/ícone/overlay SEMPRE localmente (instantâneo)
 */
async function analyzeLocal(url) {
  const classification = classifyUrl(url);
  if (!classification) throw new Error("URL inválida");
  const label = classification.category;
  const peso = categoryWeights[label];

  const { historico = [] } = await chrome.storage.local.get(["historico"]);
  const next = [...historico, peso].slice(-windowSize);
  const score = calculateScoreFromWeights(next);

  const summary =
    !classification.knownSource
      ? "Fonte não reconhecida pela lista local; evidência insuficiente. Não é checagem factual."
      : label === "A"
      ? "Sinais compatíveis com uma fonte de referência (lista local). Não é checagem factual."
      : label === "B"
      ? "Sinais neutros ou institucionais (lista local). Não é checagem factual."
      : label === "C"
      ? "Sinais associados a uma abordagem sensacionalista (lista local). Não é checagem factual."
      : "Sinais de risco associados à fonte (lista local). Não é checagem factual.";

  await chrome.storage.local.set({ historico: next });

  return {
    mode: "local",
    score,
    category: label, // A/B/C/D
    summary,
    domain: classification.hostname,
    historico: next,
    methodologyVersion: methodVersion,
  };
}

/**
 * ✅ Chama backend e DEVOLVE a análise final (IA ou fallback do backend)
 * Também serve pra salvar no banco pro dashboard, já que o controller salva.
 */
async function refreshAccountSession() {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    const current = await LumenExtensionAuth.readSession(chrome.storage.local, chrome.storage.session);
    if (!current.canRefresh || !current.refreshToken) throw new Error("Sem sessão renovável da extensão");
    const installationId = await LumenExtensionAuth.ensureInstallationId(chrome.storage.local);
    const response = await fetch(`${API_URL}/extension/session/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ installationId, refreshToken: current.refreshToken }),
    });
    const data = await response.json().catch(() => ({}));
    if (response.status === 400 || response.status === 401) {
      await LumenExtensionAuth.clearSession(chrome.storage.local, chrome.storage.session);
      throw new Error("Não foi possível renovar a sessão da extensão");
    }
    if (!response.ok) throw new Error("Serviço de sessão temporariamente indisponível");
    if (typeof data?.accessToken !== "string" || typeof data?.refreshToken !== "string") {
      await LumenExtensionAuth.clearSession(chrome.storage.local, chrome.storage.session);
      throw new Error("Resposta de sessão inválida");
    }
    await storeAccountSession(data);
    return LumenExtensionAuth.readSession(chrome.storage.local, chrome.storage.session);
  })().finally(() => { refreshPromise = null; });
  return refreshPromise;
}

async function currentAccountSession() {
  const session = await LumenExtensionAuth.readSession(chrome.storage.local, chrome.storage.session);
  if (session.connected) return session;
  if (session.canRefresh) return refreshAccountSession();
  throw new Error("Sem sessão da extensão");
}

async function authenticatedFetch(path, init) {
  let session = await currentAccountSession();
  const request = (accessToken) => fetch(`${API_URL}${path}`, {
    ...init,
    headers: { ...(init?.headers || {}), Authorization: `Bearer ${accessToken}` },
  });
  let response = await request(session.accessToken);
  if (response.status === 401 && session.canRefresh) {
    session = await refreshAccountSession();
    response = await request(session.accessToken);
  }
  return response;
}

async function storeAccountSession(data) {
  const accessExpiresInSeconds = Number(data.accessExpiresInSeconds);
  const refreshExpiresAt = Date.parse(data.refreshExpiresAt);
  if (!Number.isSafeInteger(accessExpiresInSeconds) || accessExpiresInSeconds <= 0 ||
      !Number.isFinite(refreshExpiresAt) || !data.user) {
    throw new Error("Resposta de sessão inválida");
  }
  await LumenExtensionAuth.storeSession(chrome.storage.local, chrome.storage.session, {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    user: data.user,
    accessExpiresAt: Date.now() + accessExpiresInSeconds * 1000,
    refreshExpiresAt,
  });
}

async function analyzeRemote(url) {
  const res = await authenticatedFetch("/analyze", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || `HTTP ${res.status}`);
  }

  const a = data?.analysis || data?.analysis?.analysis || data?.analysis;
  // normalmente: { analysis: { url, domain, category, score, summary, ... }, mode, modelUsed }

  if (!a || typeof a.score !== "number" || !a.category) {
    throw new Error("Resposta do backend inválida");
  }

  return {
    mode: data?.mode || "ai", // "ai" | "local-fallback"
    score: a.score,
    category: a.category, // "A/B/C/D"
    summary: a.summary,
    domain: a.domain,
    modelUsed: data?.modelUsed,
    methodologyVersion: data?.methodology?.version || methodVersion,
  };
}

async function applyPayloadToUI(tabId, payload, overlayAtivo) {
  await chrome.storage.local.set(payload);
  await setIconByScore(payload.score);

  if (overlayAtivo) {
    await sendOverlayUpdateToTab(tabId, payload);
  } else {
    await sendOverlayUpdateToTab(tabId, { overlayAtivo: false });
  }
}

async function processUrlForTab(tabId, url, options = {}) {
  const sanitizedUrl = LumenPrivacyUrl.sanitizeForAnalysis(url);
  const classification = sanitizedUrl ? classifyUrl(sanitizedUrl) : null;
  if (!sanitizedUrl || !classification) return { processed: false, invalid: true };

  if (options.automatic) {
    const settings = await chrome.storage.local.get([automaticObservationKey]);
    if (!shouldAutomaticallyObserve(settings[automaticObservationKey], classification)) {
      return { processed: false, policySkipped: true };
    }
  }

  const generation = navigationTracker.begin(tabId, sanitizedUrl);
  if (generation === null) return { processed: false, duplicate: true };
  const sourceUrl = LumenPrivacyUrl.minimizeToSource(sanitizedUrl);
  if (!sourceUrl) return { processed: false, invalid: true };

  const { overlayAtivo = true } = await chrome.storage.local.get(["overlayAtivo"]);

  // 1) LOCAL (instantâneo)
  const local = await analyzeLocal(sanitizedUrl);

  let payload = {
    score: local.score,
    category: local.category,
    summary: local.summary,
    domain: local.domain,
    historico: local.historico,
    lastUrl: sourceUrl,
    lastMode: local.mode, // "local"
    lastUpdatedAt: Date.now(),
  };

  await applyPayloadToUI(tabId, payload, overlayAtivo);

  // 2) REMOTO (final) -> se der certo, sobrescreve score/category/summary/mode
  try {
    const remote = await analyzeRemote(sourceUrl);

    // evita race condition: se o usuário já mudou de site enquanto a IA respondia,
    // não atualiza com resultado velho
    if (!navigationTracker.isCurrent(tabId, sanitizedUrl, generation)) {
      return { processed: true, staleResponseIgnored: true };
    }

    payload = {
      ...payload,
      score: remote.score,
      category: remote.category,
      summary: remote.summary,
      domain: remote.domain,
      lastMode: remote.mode, // "ai" | "local-fallback"
      lastUpdatedAt: Date.now(),
      modelUsed: remote.modelUsed,
    };

    await applyPayloadToUI(tabId, payload, overlayAtivo);
  } catch {
    // backend offline/sem token/erro IA -> mantém local
    console.warn("Remote analyze indisponível; mantendo resultado local.");
  }

  return { processed: true };
}

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  if (!tab?.id || !tab?.url) return;
  processUrlForTab(tab.id, tab.url, { automatic: true });
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  const url = updatedTabUrl(changeInfo, tab);
  if (url) processUrlForTab(tabId, url, { automatic: true });
});

chrome.tabs.onRemoved.addListener((tabId) => {
  navigationTracker.clear(tabId);
});

async function minimizeLegacyStoredUrl() {
  const { lastUrl } = await chrome.storage.local.get(["lastUrl"]);
  if (typeof lastUrl !== "string") return;
  const sourceUrl = LumenPrivacyUrl.minimizeToSource(lastUrl);
  if (sourceUrl) await chrome.storage.local.set({ lastUrl: sourceUrl });
  else await chrome.storage.local.remove(["lastUrl"]);
}

void minimizeLegacyStoredUrl().catch(() => {});

async function startAccountConnection() {
  const installationId = await LumenExtensionAuth.ensureInstallationId(chrome.storage.local);
  const pending = await LumenExtensionAuth.createPendingConnection(chrome.storage.session, installationId);
  const query = new URLSearchParams({
    requestId: pending.requestId,
    installationId: pending.installationId,
    codeChallenge: pending.codeChallenge,
  });
  await chrome.tabs.create({ url: `${LumenHandshakePolicy.trustedDashboardOrigin}/extension/connect?${query}` });
  return { ok: true };
}

function isTrustedPageSender(sender, pathname) {
  return isTrustedDashboardUrl(sender?.url ?? "", pathname);
}

function isContentScriptSender(sender) {
  return sender?.id === chrome.runtime.id && Number.isInteger(sender?.tab?.id);
}

async function safeContentState() {
  return chrome.storage.local.get([
    "score",
    "category",
    "summary",
    "domain",
    "lastMode",
    "lumePos",
    "overlayAtivo",
    "lastUrl",
  ]);
}

async function accountStatus() {
  let session;
  try {
    session = await currentAccountSession();
  } catch {
    return { ok: true, connected: false };
  }
  if (!session.connected) return { ok: true, connected: false };
  return { ok: true, connected: true, user: session.user, expiresAt: session.refreshExpiresAt };
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    if (msg.type === "GET_CONTENT_STATE") {
      if (!isContentScriptSender(sender)) return sendResponse({ ok: false, error: "Invalid sender" });
      sendResponse({ ok: true, state: await safeContentState() });
      return;
    }

    if (msg.type === "SAVE_OVERLAY_POSITION") {
      if (!isContentScriptSender(sender)) return sendResponse({ ok: false, error: "Invalid sender" });
      const x = Number(msg.position?.x);
      const y = Number(msg.position?.y);
      if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0 || x > 100_000 || y > 100_000) {
        return sendResponse({ ok: false, error: "Invalid position" });
      }
      await chrome.storage.local.set({ lumePos: { x: Math.round(x), y: Math.round(y) } });
      sendResponse({ ok: true });
      return;
    }

    if (msg.type === "START_ACCOUNT_CONNECTION") {
      if (!isExtensionSender(sender) && !isTrustedPageSender(sender, "/dashboard")) {
        return sendResponse({ ok: false, error: "Invalid sender" });
      }
      sendResponse(await startAccountConnection());
      return;
    }

    if (msg.type === "GET_ACCOUNT_STATUS") {
      if (!isExtensionSender(sender) && !isTrustedPageSender(sender, "/dashboard")) {
        return sendResponse({ ok: false, error: "Invalid sender" });
      }
      sendResponse(await accountStatus());
      return;
    }

    if (msg.type === "LOGOUT_EXTENSION") {
      if (!isExtensionSender(sender)) return sendResponse({ ok: false, error: "Invalid sender" });
      try {
        const session = await currentAccountSession();
        if (session.accessToken) {
          await fetch(`${API_URL}/extension/session/logout`, {
            method: "POST",
            headers: { Authorization: `Bearer ${session.accessToken}` },
          });
        }
      } catch {
        // Local cleanup still runs when the server session already expired or is unavailable.
      }
      await LumenExtensionAuth.clearSession(chrome.storage.local, chrome.storage.session);
      sendResponse({ ok: true });
      return;
    }

    if (msg.type === "CLEAR_LOCAL_ANALYSIS_DATA") {
      if (!isExtensionSender(sender)) return sendResponse({ ok: false, error: "Invalid sender" });
      await chrome.storage.local.remove(localAnalysisKeys);
      navigationTracker.clearAll();
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) await sendOverlayUpdateToTab(tab.id, { overlayAtivo: false });
      sendResponse({ ok: true });
      return;
    }

    if (msg.type === "PREPARE_EXTENSION_AUTH") {
      const origin = senderOrigin(sender);
      if (!isTrustedPageSender(sender, "/extension/connect")) return sendResponse({ ok: false, error: "Origin not allowed" });
      const stored = await chrome.storage.session.get([LumenExtensionAuth.keys.pending]);
      const pending = stored[LumenExtensionAuth.keys.pending];
      if (!pending || pending.requestId !== msg.requestId || pending.installationId !== msg.installationId ||
          pending.codeChallenge !== msg.codeChallenge || Date.now() - pending.createdAt > 2 * 60 * 1000) {
        await chrome.storage.session.remove([LumenExtensionAuth.keys.pending]);
        return sendResponse({ ok: false, error: "Authorization request mismatch" });
      }
      const challenge = crypto.randomUUID().replaceAll("-", "");
      const context = { requestId: msg.requestId, installationId: msg.installationId, codeChallenge: msg.codeChallenge };
      if (!connectChallenges.issue(origin, challenge, context)) {
        return sendResponse({ ok: false, error: "Invalid authorization request" });
      }
      sendResponse({ ok: true, challenge });
      return;
    }

    if (msg.type === "COMPLETE_EXTENSION_AUTH") {
      const origin = senderOrigin(sender);
      const context = { requestId: msg.requestId, installationId: msg.installationId, codeChallenge: msg.codeChallenge };
      if (!isTrustedPageSender(sender, "/extension/connect") || !connectChallenges.consume(origin, msg.challenge, context)) {
        return sendResponse({ ok: false, error: "Invalid or expired challenge" });
      }
      const stored = await chrome.storage.session.get([LumenExtensionAuth.keys.pending]);
      const pending = stored[LumenExtensionAuth.keys.pending];
      if (!pending || pending.requestId !== msg.requestId || pending.installationId !== msg.installationId ||
          pending.codeChallenge !== msg.codeChallenge || Date.now() - pending.createdAt > 2 * 60 * 1000) {
        await chrome.storage.session.remove([LumenExtensionAuth.keys.pending]);
        return sendResponse({ ok: false, error: "Authorization request mismatch" });
      }

      const response = await fetch(`${API_URL}/extension/session/exchange`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: msg.authorizationCode,
          installationId: pending.installationId,
          codeVerifier: pending.verifier,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || typeof data?.accessToken !== "string" || typeof data?.refreshToken !== "string" || !data?.user) {
        return sendResponse({ ok: false, error: "Authorization exchange failed" });
      }
      await storeAccountSession(data);
      await chrome.storage.session.remove([LumenExtensionAuth.keys.pending]);
      sendResponse({ ok: true, user: data.user });
      return;
    }

    if (msg.type === "FORCE_ANALYZE_ACTIVE_TAB") {
      if (!isExtensionSender(sender)) return sendResponse({ ok: false, error: "Invalid sender" });
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id || !tab?.url) return sendResponse({ ok: false, error: "Sem aba/URL" });

      const result = await processUrlForTab(tab.id, tab.url);
      sendResponse({ ok: true, ...result });
      return;
    }

    sendResponse({ ok: false, error: "Unknown msg" });
  })().catch(() => sendResponse({ ok: false, error: "Extension operation failed" }));

  return true;
});
