const API_URL = "http://localhost:3000";

const confiaveis = ["bbc.com", "reuters.com", "apnews.com", "nytimes.com", "theguardian.com"];
const neutros = ["gov.br", "un.org", "who.int", "ibge.gov.br"];
const sensacionalistas = ["metropoles.com", "r7.com", "terra.com.br"];
const desinformacao = ["infowars.com", "naturalnews.com"];

const pesos = { A: 3, B: 1, C: -2, D: -5 };

function normalizeDomain(url) {
  return new URL(url).hostname.replace(/^www\./, "");
}

function classificarLocal(url) {
  const dominio = normalizeDomain(url);
  if (confiaveis.some((s) => dominio.includes(s))) return "A";
  if (neutros.some((s) => dominio.includes(s))) return "B";
  if (sensacionalistas.some((s) => dominio.includes(s))) return "C";
  if (desinformacao.some((s) => dominio.includes(s))) return "D";
  return "B";
}

function scoreFromHistorico(historico) {
  const soma = historico.reduce((a, b) => a + b, 0);
  const media = soma / historico.length;
  let score = Math.round(((media + 5) / 8) * 100);
  score = Math.max(0, Math.min(100, score));
  return score;
}

function scoreToState(score) {
  if (score >= 70) return "verde";
  if (score >= 40) return "amarelo";
  return "vermelho";
}

async function setIconByScore(score) {
  const state = scoreToState(score);
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
  const label = classificarLocal(url); // A/B/C/D
  const peso = pesos[label];

  const { historico = [] } = await chrome.storage.local.get(["historico"]);
  const next = [...historico, peso].slice(-20);
  const score = scoreFromHistorico(next);

  const summary =
    label === "A"
      ? "Fonte com histórico mais confiável (lista local)."
      : label === "B"
      ? "Fonte neutra / institucional (lista local)."
      : label === "C"
      ? "Fonte com tendência sensacionalista (lista local)."
      : "Fonte associada a desinformação (lista local).";

  await chrome.storage.local.set({ historico: next });

  return {
    mode: "local",
    score,
    category: label, // A/B/C/D
    summary,
    domain: normalizeDomain(url),
    historico: next,
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
  if (!url || !url.startsWith("http")) return;

  // evita reprocessar mesma url
  const { lastUrl } = await chrome.storage.local.get(["lastUrl"]);
  if (lastUrl === url) return;

  const { overlayAtivo = true } = await chrome.storage.local.get(["overlayAtivo"]);

  // 1) LOCAL (instantâneo)
  const local = await analyzeLocal(url);

  let payload = {
    score: local.score,
    category: local.category,
    summary: local.summary,
    domain: local.domain,
    historico: local.historico,
    lastUrl: url,
    lastMode: local.mode, // "local"
    lastUpdatedAt: Date.now(),
  };

  await applyPayloadToUI(tabId, payload, overlayAtivo);

  // 2) REMOTO (final) -> se der certo, sobrescreve score/category/summary/mode
  try {
    const remote = await analyzeRemote(url);

    // evita race condition: se o usuário já mudou de site enquanto a IA respondia,
    // não atualiza com resultado velho
    const { lastUrl: currentLastUrl } = await chrome.storage.local.get(["lastUrl"]);
    if (currentLastUrl && currentLastUrl !== url) return;

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
  } catch (e) {
    // backend offline/sem token/erro IA -> mantém local
    console.warn("Remote analyze falhou, mantendo local:", String(e));
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
    if (msg.type === "SET_TOKEN") {
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