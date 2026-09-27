importScripts("score-contract.js", "domain-classifier.js", "handshake-policy.js", "privacy-url.js", "extension-auth.js");

const API_URL = "http://localhost:3000";

const { categoryWeights, windowSize, calculateScoreFromWeights, scoreState, methodVersion } =
  LumenScoreContract;
const { classifyUrl } = LumenDomainClassifier;
const { createChallengeRegistry, isTrustedDashboardUrl } = LumenHandshakePolicy;
const connectChallenges = createChallengeRegistry();

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
async function analyzeRemote(url) {
  const session = await LumenExtensionAuth.readSession(chrome.storage.local);
  if (!session.connected) throw new Error("Sem sessão da extensão");

  const res = await fetch(`${API_URL}/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.token}`,
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

async function processUrlForTab(tabId, url) {
  const sanitizedUrl = LumenPrivacyUrl.sanitizeForAnalysis(url);
  if (!sanitizedUrl || !classifyUrl(sanitizedUrl)) return;

  // evita reprocessar mesma url
  const { lastUrl } = await chrome.storage.local.get(["lastUrl"]);
  if (lastUrl === sanitizedUrl) return;

  const { overlayAtivo = true } = await chrome.storage.local.get(["overlayAtivo"]);

  // 1) LOCAL (instantâneo)
  const local = await analyzeLocal(sanitizedUrl);

  let payload = {
    score: local.score,
    category: local.category,
    summary: local.summary,
    domain: local.domain,
    historico: local.historico,
    lastUrl: sanitizedUrl,
    lastMode: local.mode, // "local"
    lastUpdatedAt: Date.now(),
  };

  await applyPayloadToUI(tabId, payload, overlayAtivo);

  // 2) REMOTO (final) -> se der certo, sobrescreve score/category/summary/mode
  try {
    const remote = await analyzeRemote(sanitizedUrl);

    // evita race condition: se o usuário já mudou de site enquanto a IA respondia,
    // não atualiza com resultado velho
    const { lastUrl: currentLastUrl } = await chrome.storage.local.get(["lastUrl"]);
    if (currentLastUrl && currentLastUrl !== sanitizedUrl) return;

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
}

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  if (!tab?.id || !tab?.url) return;
  processUrlForTab(tab.id, tab.url);
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab?.url) processUrlForTab(tabId, tab.url);
  if (changeInfo.url) processUrlForTab(tabId, changeInfo.url);
});

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

async function accountStatus() {
  const session = await LumenExtensionAuth.readSession(chrome.storage.local);
  if (!session.connected) return { ok: true, connected: false };
  return { ok: true, connected: true, user: session.user, expiresAt: session.expiresAt };
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
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
      await LumenExtensionAuth.clearSession(chrome.storage.local, chrome.storage.session);
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
      if (!response.ok || typeof data?.token !== "string" || !data?.user) {
        return sendResponse({ ok: false, error: "Authorization exchange failed" });
      }
      await LumenExtensionAuth.storeSession(chrome.storage.local, {
        token: data.token,
        user: data.user,
        expiresAt: Date.now() + Number(data.expiresInSeconds || 0) * 1000,
      });
      await chrome.storage.session.remove([LumenExtensionAuth.keys.pending]);
      sendResponse({ ok: true, user: data.user });
      return;
    }

    if (msg.type === "FORCE_ANALYZE_ACTIVE_TAB") {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id || !tab?.url) return sendResponse({ ok: false, error: "Sem aba/URL" });

      await chrome.storage.local.set({ lastUrl: null }); // força reprocessar
      await processUrlForTab(tab.id, tab.url);

      sendResponse({ ok: true });
      return;
    }

    sendResponse({ ok: false, error: "Unknown msg" });
  })().catch(() => sendResponse({ ok: false, error: "Extension operation failed" }));

  return true;
});
