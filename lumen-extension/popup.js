const estadoEl = document.getElementById("estado");
const scoreEl = document.getElementById("score");
const toggleBtn = document.getElementById("toggleOverlay");
const lumeImg = document.getElementById("lume");
const modeEl = document.getElementById("mode");
const domainEl = document.getElementById("domain");

function setUI(score, lastMode, domain) {
  estadoEl.classList.remove("verde", "amarelo", "vermelho");

  let estado = "";
  if (score >= 70) {
    estado = "Verde";
    estadoEl.classList.add("verde");
    lumeImg.src = "lume-verde.gif";
  } else if (score >= 40) {
    estado = "Amarelo";
    estadoEl.classList.add("amarelo");
    lumeImg.src = "lume-amarelo.gif";
  } else {
    estado = "Vermelho";
    estadoEl.classList.add("vermelho");
    lumeImg.src = "lume-vermelho.gif";
  }

  estadoEl.innerText = estado;
  scoreEl.innerText = `Score: ${score}`;
  modeEl.innerText = lastMode ? `Modo: ${lastMode}` : "";
  domainEl.innerText = domain ? `Domínio: ${domain}` : "";
}

chrome.storage.local.get(["score", "overlayAtivo", "lastMode", "domain"], (result) => {
  const score = result.score ?? 50;
  setUI(score, result.lastMode, result.domain);

  const ativo = result.overlayAtivo ?? true;
  toggleBtn.innerText = ativo ? "Desativar Overlay" : "Ativar Overlay";
});

toggleBtn.addEventListener("click", () => {
  chrome.storage.local.get(["overlayAtivo"], (result) => {
    const novoEstado = !(result.overlayAtivo ?? true);

    chrome.storage.local.set({ overlayAtivo: novoEstado }, async () => {
      toggleBtn.innerText = novoEstado ? "Desativar Overlay" : "Ativar Overlay";

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { type: "LUMEN_UPDATE", overlayAtivo: novoEstado });
      }
    });
  });
});

document.getElementById("reanalyze").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "FORCE_ANALYZE_ACTIVE_TAB" }, () => {
    chrome.storage.local.get(["score", "lastMode", "domain"], (r) => {
      setUI(r.score ?? 50, r.lastMode, r.domain);
    });
  });
});