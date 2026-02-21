const estadoEl = document.getElementById("estado");
const scoreEl = document.getElementById("score");
const toggleBtn = document.getElementById("toggleOverlay");

chrome.storage.local.get(["score", "overlayAtivo"], (result) => {
  const score = result.score ?? 50;

  let estado = "";
  let cor = "";

  if (score >= 70) {
    estado = "Verde";
    cor = "#2ECC71";
  } else if (score >= 40) {
    estado = "Amarelo";
    cor = "#F4D03F";
  } else {
    estado = "Vermelho";
    cor = "#E74C3C";
  }

  estadoEl.innerText = estado;
  estadoEl.style.color = cor;
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