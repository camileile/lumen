// 1) Recebe token do dashboard (web) e salva na extensão
window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  if (event.data?.type === "LUMEN_CONNECT" && event.data?.token) {
    chrome.runtime.sendMessage({ type: "SET_TOKEN", token: event.data.token });
  }
});

function scoreToState(score) {
  if (score >= 70) return "verde";
  if (score >= 40) return "amarelo";
  return "vermelho";
}

function getGifForScore(score) {
  const state = scoreToState(score);
  if (state === "verde") return chrome.runtime.getURL("lume-verde.gif");
  if (state === "amarelo") return chrome.runtime.getURL("lume-amarelo.gif");
  return chrome.runtime.getURL("lume-vermelho.gif");
}

function removeOverlay() {
  const old = document.getElementById("lume-overlay");
  if (old) old.remove();
}

function ensureOverlay(score, lumePos) {
  let lume = document.getElementById("lume-overlay");

  if (!lume) {
    lume = document.createElement("img");
    lume.id = "lume-overlay";
    lume.style.position = "fixed";
    lume.style.zIndex = "999999";
    lume.style.width = "80px";
    lume.style.cursor = "grab";
    lume.style.userSelect = "none";
    lume.style.filter = "drop-shadow(0 6px 10px rgba(0,0,0,.25))";

    document.body.appendChild(lume);

    // drag
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
        lumePos: { x: lume.offsetLeft, y: lume.offsetTop },
      });
    });
  }

  lume.src = getGifForScore(score);

  if (lumePos) {
    lume.style.left = lumePos.x + "px";
    lume.style.top = lumePos.y + "px";
  } else {
    if (!lume.style.left) {
      lume.style.left = "120px";
      lume.style.top = "120px";
    }
  }
}

async function boot() {
  const { score = 50, lumePos, overlayAtivo = true } = await chrome.storage.local.get([
    "score",
    "lumePos",
    "overlayAtivo",
  ]);

  if (!overlayAtivo) return removeOverlay();
  ensureOverlay(score, lumePos);
}

boot();

// 3) Atualiza overlay quando o background mandar novo score
chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type !== "LUMEN_UPDATE") return;

  if (msg.overlayAtivo === false) {
    removeOverlay();
    return;
  }

  chrome.storage.local.get(["lumePos", "overlayAtivo"], (st) => {
    if (st.overlayAtivo === false) return removeOverlay();
    const score = msg.score ?? 50;
    ensureOverlay(score, st.lumePos);
  });
});