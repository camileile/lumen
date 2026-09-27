importScripts("score-contract.js", "domain-classifier.js", "handshake-policy.js", "privacy-url.js");

const API_URL = "http://localhost:3000";

const { categoryWeights, windowSize, calculateScoreFromWeights, scoreState, methodVersion } =
  LumenScoreContract;
const { classifyUrl } = LumenDomainClassifier;
const { createChallengeRegistry, isTrustedOrigin, isValidToken } = LumenHandshakePolicy;
const connectChallenges = createChallengeRegistry();

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
  const { lumen_token } = await chrome.storage.local.get(["lumen_token"]);
  if (!lumen_token) throw new Error("Sem token");

  const res = await fetch(`${API_URL}/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lumen_token}`,
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

// recebe token do site (Conectar extensão) e comandos do popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    if (msg.type === "CREATE_CONNECT_CHALLENGE") {
      const origin = senderOrigin(sender);
      if (!isTrustedOrigin(origin)) return sendResponse({ ok: false, error: "Origin not allowed" });
      const challenge = crypto.randomUUID().replaceAll("-", "");
      connectChallenges.issue(origin, challenge);
      sendResponse({ ok: true, challenge });
      return;
    }

    if (msg.type === "SET_TOKEN") {
      const origin = senderOrigin(sender);
      if (!isTrustedOrigin(origin) || !connectChallenges.consume(origin, msg.challenge)) {
        return sendResponse({ ok: false, error: "Invalid or expired challenge" });
      }
      if (!isValidToken(msg.token)) return sendResponse({ ok: false, error: "Invalid token" });
      await chrome.storage.local.set({ lumen_token: msg.token });
      sendResponse({ ok: true });
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
  })();

  return true;
});
