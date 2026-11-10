const estadoEl = document.getElementById("estado");
const scoreEl = document.getElementById("score");
const toggleBtn = document.getElementById("toggleOverlay");
const lumeImg = document.getElementById("lume");
const modeEl = document.getElementById("mode");
const domainEl = document.getElementById("domain");
const accountStatusEl = document.getElementById("accountStatus");
const accountIdentityEl = document.getElementById("accountIdentity");
const connectAccountBtn = document.getElementById("connectAccount");
const logoutAccountBtn = document.getElementById("logoutAccount");
const monitoringStatusEl = document.getElementById("monitoringStatus");
const toggleMonitoringBtn = document.getElementById("toggleMonitoring");
const clearLocalDataBtn = document.getElementById("clearLocalData");

function renderMonitoring(enabled) {
  monitoringStatusEl.innerText = enabled ? "Ativada para fontes reconhecidas" : "Desativada";
  toggleMonitoringBtn.innerText = enabled ? "Desativar observação automática" : "Ativar observação automática";
  toggleMonitoringBtn.setAttribute("aria-pressed", String(enabled));
}

function renderAccount(status) {
  const connected = status?.ok && status.connected;
  accountStatusEl.innerText = connected ? "Conectado como" : "Não conectado";
  accountIdentityEl.innerText = connected ? (status.user?.email || status.user?.name || "Conta Lumen") : "";
  connectAccountBtn.hidden = connected;
  logoutAccountBtn.hidden = !connected;
}

async function refreshAccount() {
  renderAccount(await chrome.runtime.sendMessage({ type: "GET_ACCOUNT_STATUS" }).catch(() => ({ ok: false })));
}

function modeLabel(mode) {
  if (mode === "ai") return "IA (backend)";
  if (mode === "local-fallback") return "Fallback (backend)";
  if (mode === "local") return "Local (extensão)";
  return mode ? String(mode) : "";
}

function stateFromScore(score) {
  const state = LumenScoreContract.scoreState(score);
  const gif =
    state.key === "verde"
      ? "lume-verde.gif"
      : state.key === "amarelo"
      ? "lume-amarelo.gif"
      : "lume-vermelho.gif";
  return { ...state, gif };
}

function setUI({ score = null, lastMode = "", domain = "", category = "" }) {
  const normalizedScore = typeof score === "number" && Number.isFinite(score) ? score : null;
  const st = stateFromScore(normalizedScore);

  estadoEl.classList.remove("verde", "amarelo", "vermelho");
  estadoEl.classList.add(st.key);

  lumeImg.src = st.gif;

  // Ex: "Verde • A"
  estadoEl.innerText = category ? `${st.label} • ${category}` : st.label;

  scoreEl.innerText = normalizedScore === null ? "Score: indisponível" : `Score: ${normalizedScore}`;
  modeEl.innerText = lastMode ? `Modo: ${modeLabel(lastMode)}` : "";
  domainEl.innerText = domain ? `Domínio: ${domain}` : "";
}

function readState() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["score", "overlayAtivo", "lastMode", "domain", "category", "lastUpdatedAt"], (r) => {
      resolve(r);
    });
  });
}

// Atualiza UI ao abrir popup
(async () => {
  const st = await readState();
  setUI({
    score: typeof st.score === "number" ? st.score : null,
    lastMode: st.lastMode ?? "",
    domain: st.domain ?? "",
    category: st.category ?? "",
  });

  const ativo = st.overlayAtivo ?? true;
  toggleBtn.innerText = ativo ? "Desativar Overlay" : "Ativar Overlay";
  const monitoring = await chrome.storage.local.get(["automaticObservationEnabled"]);
  renderMonitoring(monitoring.automaticObservationEnabled === true);
  await refreshAccount();
})();

toggleMonitoringBtn.addEventListener("click", async () => {
  const current = await chrome.storage.local.get(["automaticObservationEnabled"]);
  const enabled = current.automaticObservationEnabled !== true;
  await chrome.storage.local.set({ automaticObservationEnabled: enabled });
  renderMonitoring(enabled);
});

clearLocalDataBtn.addEventListener("click", async () => {
  if (!window.confirm("Limpar os resultados e o histórico de score guardados neste navegador?")) return;
  clearLocalDataBtn.disabled = true;
  const result = await chrome.runtime.sendMessage({ type: "CLEAR_LOCAL_ANALYSIS_DATA" }).catch(() => ({ ok: false }));
  clearLocalDataBtn.disabled = false;
  if (result?.ok) setUI({ score: null, lastMode: "", domain: "", category: "" });
  else estadoEl.innerText = "Não foi possível limpar";
});

connectAccountBtn.addEventListener("click", async () => {
  connectAccountBtn.disabled = true;
  connectAccountBtn.innerText = "Abrindo Lumen…";
  const result = await chrome.runtime.sendMessage({ type: "START_ACCOUNT_CONNECTION" }).catch(() => ({ ok: false }));
  if (result?.ok) window.close();
  else {
    connectAccountBtn.disabled = false;
    connectAccountBtn.innerText = "Entrar com Lumen";
    accountStatusEl.innerText = "Não foi possível iniciar a conexão";
  }
});

logoutAccountBtn.addEventListener("click", async () => {
  logoutAccountBtn.disabled = true;
  await chrome.runtime.sendMessage({ type: "LOGOUT_EXTENSION" });
  logoutAccountBtn.disabled = false;
  await refreshAccount();
});

toggleBtn.addEventListener("click", () => {
  chrome.storage.local.get(["overlayAtivo"], async (result) => {
    const novoEstado = !(result.overlayAtivo ?? true);

    chrome.storage.local.set({ overlayAtivo: novoEstado }, async () => {
      toggleBtn.innerText = novoEstado ? "Desativar Overlay" : "Ativar Overlay";

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { type: "LUMEN_UPDATE", overlayAtivo: novoEstado }).catch(() => {});
      }
    });
  });
});

// Analisa explicitamente e aguarda o storage mudar (evita ler cedo demais).
document.getElementById("reanalyze").addEventListener("click", async () => {
  const before = await readState();
  estadoEl.innerText = "Reanalisando...";
  scoreEl.innerText = "";
  modeEl.innerText = "";
  domainEl.innerText = "";

  chrome.runtime.sendMessage({ type: "FORCE_ANALYZE_ACTIVE_TAB" }, async (result) => {
    if (!result?.ok) {
      setUI(before);
      modeEl.innerText = "Não foi possível analisar esta página";
      return;
    }
    if (result.duplicate) {
      setUI(before);
      modeEl.innerText = "Esta página já foi analisada";
      return;
    }

    // Poll curto até mudar lastUpdatedAt (ou score) — máximo ~2.5s
    const start = Date.now();
    while (Date.now() - start < 2500) {
      const now = await readState();

      const updated =
        (now.lastUpdatedAt && now.lastUpdatedAt !== before.lastUpdatedAt) ||
        now.score !== before.score ||
        now.lastMode !== before.lastMode;

      if (updated) {
        setUI({
          score: typeof now.score === "number" ? now.score : null,
          lastMode: now.lastMode ?? "",
          domain: now.domain ?? "",
          category: now.category ?? "",
        });
        return;
      }

      await new Promise((r) => setTimeout(r, 150));
    }

    // se não atualizou dentro do tempo, mostra o que tiver
    const final = await readState();
    setUI({
      score: typeof final.score === "number" ? final.score : null,
      lastMode: final.lastMode ?? "",
      domain: final.domain ?? "",
      category: final.category ?? "",
    });
  });
});
