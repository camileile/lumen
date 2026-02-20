chrome.storage.local.get(["historico", "lumePos"], (result) => {
  const historico = result.historico || [];
  const lume = document.getElementById("lume");

  if (historico.length === 0) {
    document.getElementById("estado").innerText = "Sem dados ainda";
    return;
  }

  const soma = historico.reduce((a, b) => a + b, 0);
  const media = soma / historico.length;

  const score = Math.round(((media + 5) / 8) * 100);

  let estado = "";
  let cor = "";

  if (score >= 70) {
    estado = "Verde";
    cor = "#2ECC71";
    lume.src = "lume-verde.gif";
  } else if (score >= 40) {
    estado = "Amarelo";
    cor = "#F4D03F";
    lume.src = "lume-amarelo.gif";
  } else {
    estado = "Vermelho";
    cor = "#E74C3C";
    lume.src = "lume-vermelho.gif";
  }

  const estadoEl = document.getElementById("estado");
  estadoEl.innerText = estado;
  estadoEl.style.color = cor;

  document.getElementById("score").innerText = `Score: ${score}`;

  // Restaurar posição do Lume
  if (result.lumePos) {
    lume.style.left = result.lumePos.x + "px";
    lume.style.top = result.lumePos.y + "px";
  } else {
    lume.style.left = "120px";
    lume.style.top = "120px";
  }

  // Drag logic
  let offsetX = 0;
  let offsetY = 0;
  let isDragging = false;

  lume.addEventListener("mousedown", (e) => {
    isDragging = true;
    offsetX = e.clientX - lume.offsetLeft;
    offsetY = e.clientY - lume.offsetTop;
    lume.style.cursor = "grabbing";
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;

    let x = e.clientX - offsetX;
    let y = e.clientY - offsetY;

    x = Math.max(0, Math.min(x, window.innerWidth - lume.offsetWidth));
    y = Math.max(0, Math.min(y, window.innerHeight - lume.offsetHeight));

    lume.style.left = x + "px";
    lume.style.top = y + "px";
  });

  document.addEventListener("mouseup", () => {
    if (!isDragging) return;

    isDragging = false;
    lume.style.cursor = "grab";

    chrome.storage.local.set({
      lumePos: {
        x: lume.offsetLeft,
        y: lume.offsetTop
      }
    });
  });
});