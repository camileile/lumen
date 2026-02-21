chrome.storage.local.get(["score", "lumePos", "overlayAtivo"], (result) => {

  if (result.overlayAtivo === false) return;

  const score = result.score ?? 50;

  const lume = document.createElement("img");
  lume.id = "lume-overlay";
  lume.style.position = "fixed";
  lume.style.zIndex = "999999";
  lume.style.width = "80px";
  lume.style.cursor = "grab";

  if (score >= 70) {
    lume.src = chrome.runtime.getURL("lume-verde.gif");
  } else if (score >= 40) {
    lume.src = chrome.runtime.getURL("lume-amarelo.gif");
  } else {
    lume.src = chrome.runtime.getURL("lume-vermelho.gif");
  }

  document.body.appendChild(lume);

  if (result.lumePos) {
    lume.style.left = result.lumePos.x + "px";
    lume.style.top = result.lumePos.y + "px";
  } else {
    lume.style.left = "120px";
    lume.style.top = "120px";
  }

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