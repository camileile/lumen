const estadoEl = document.getElementById("estado");
const scoreEl = document.getElementById("score");
const toggleBtn = document.getElementById("toggleOverlay");
const lumeImg = document.getElementById("lume");
const modeEl = document.getElementById("mode");
const domainEl = document.getElementById("domain");

function modeLabel(mode) {
  if (mode === "ai") return "IA (backend)";
  if (mode === "local-fallback") return "Fallback (backend)";
  if (mode === "local") return "Local (extensão)";
  return mode ? String(mode) : "";
}

function stateFromScore(score) {
  if (score >= 70) return { key: "verde", label: "Verde", gif: "lume-verde.gif" };
  if (score >= 40) return { key: "amarelo", label: "Amarelo", gif: "lume-amarelo.gif" };
  return { key: "vermelho", label: "Vermelho", gif: "lume-vermelho.gif" };
}

function setUI({ score = 50, lastMode = "", domain = "", category = "" }) {
  const st = stateFromScore(Number(score));

  estadoEl.classList.remove("verde", "amarelo", "vermelho");
  estadoEl.classList.add(st.key);

  lumeImg.src = st.gif;

  // Ex: "Verde • A"
  estadoEl.innerText = category ? `${st.label} • ${category}` : st.label;

  scoreEl.innerText = `Score: ${Number(score)}`;
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
    score: st.score ?? 50,
    lastMode: st.lastMode ?? "",
    domain: st.domain ?? "",
    category: st.category ?? "",
  });

  const ativo = st.overlayAtivo ?? true;
  toggleBtn.innerText = ativo ? "Desativar Overlay" : "Ativar Overlay";
})();

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

// Reanalisar: dispara e aguarda o storage mudar (evita ler cedo demais)
document.getElementById("reanalyze").addEventListener("click", async () => {
  const before = await readState();
  estadoEl.innerText = "Reanalisando...";
  scoreEl.innerText = "";
  modeEl.innerText = "";
  domainEl.innerText = "";

  chrome.runtime.sendMessage({ type: "FORCE_ANALYZE_ACTIVE_TAB" }, async () => {
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
          score: now.score ?? 50,
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
      score: final.score ?? 50,
      lastMode: final.lastMode ?? "",
      domain: final.domain ?? "",
      category: final.category ?? "",
    });
  });
});