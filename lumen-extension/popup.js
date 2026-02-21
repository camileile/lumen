const estadoEl = document.getElementById("estado");
const scoreEl = document.getElementById("score");
const toggleBtn = document.getElementById("toggleOverlay");
const lumeImg = document.getElementById("lume");

chrome.storage.local.get(["score", "overlayAtivo"], (result) => {
  const score = result.score ?? 50;

  let estado = "";

  // remove classes antigas
  estadoEl.classList.remove("verde", "amarelo", "vermelho");

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

  const ativo = result.overlayAtivo ?? true;
  toggleBtn.innerText = ativo ? "Desativar Overlay" : "Ativar Overlay";
});

toggleBtn.addEventListener("click", () => {
  chrome.storage.local.get(["overlayAtivo"], (result) => {
    const novoEstado = !(result.overlayAtivo ?? true);

    chrome.storage.local.set({ overlayAtivo: novoEstado });

    toggleBtn.innerText = novoEstado
      ? "Desativar Overlay"
      : "Ativar Overlay";

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) chrome.tabs.reload(tabs[0].id);
    });
  });
});