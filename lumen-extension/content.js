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
  const old = document.getElementById("lume-overlay-wrap");
  if (old) old.remove();
}

function ensureOverlay(payload, lumePos) {
  let wrap = document.getElementById("lume-overlay-wrap");
  let lume = document.getElementById("lume-overlay");
  let tip = document.getElementById("lume-tip");

  if (!wrap) {
    wrap = document.createElement("div");
    wrap.id = "lume-overlay-wrap";
    wrap.style.position = "fixed";
    wrap.style.zIndex = "999999";
    wrap.style.left = "120px";
    wrap.style.top = "120px";
    wrap.style.userSelect = "none";

    // imagem (lume)
    lume = document.createElement("img");
    lume.id = "lume-overlay";
    lume.style.width = "80px";
    lume.style.cursor = "grab";
    lume.style.filter = "drop-shadow(0 6px 10px rgba(0,0,0,.25))";
    lume.draggable = false;

    // tooltip
    tip = document.createElement("div");
    tip.id = "lume-tip";
    tip.style.position = "absolute";
    tip.style.left = "90px";
    tip.style.top = "0px";
    tip.style.minWidth = "220px";
    tip.style.maxWidth = "320px";
    tip.style.padding = "10px 12px";
    tip.style.borderRadius = "12px";
    tip.style.background = "rgba(15, 15, 15, 0.92)";
    tip.style.color = "#fff";
    tip.style.fontFamily = "system-ui, -apple-system, Segoe UI, Roboto, Arial";
    tip.style.fontSize = "12px";
    tip.style.lineHeight = "1.25";
    tip.style.boxShadow = "0 10px 24px rgba(0,0,0,.25)";
    tip.style.display = "none";

    wrap.appendChild(lume);
    wrap.appendChild(tip);
    document.body.appendChild(wrap);

    // hover: mostra tip
    wrap.addEventListener("mouseenter", () => (tip.style.display = "block"));
    wrap.addEventListener("mouseleave", () => (tip.style.display = "none"));

    // drag
    let offsetX = 0;
    let offsetY = 0;
    let isDragging = false;

    lume.addEventListener("mousedown", (e) => {
      isDragging = true;
      offsetX = e.clientX - wrap.offsetLeft;
      offsetY = e.clientY - wrap.offsetTop;
      lume.style.cursor = "grabbing";
      e.preventDefault();
    });

    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;

      let x = e.clientX - offsetX;
      let y = e.clientY - offsetY;

      x = Math.max(0, Math.min(x, window.innerWidth - wrap.offsetWidth));
      y = Math.max(0, Math.min(y, window.innerHeight - wrap.offsetHeight));

      wrap.style.left = x + "px";
      wrap.style.top = y + "px";
    });

    document.addEventListener("mouseup", () => {
      if (!isDragging) return;

      isDragging = false;
      lume.style.cursor = "grab";

      chrome.storage.local.set({
        lumePos: { x: wrap.offsetLeft, y: wrap.offsetTop },
      });
    });
  }

  const score = Number(payload?.score ?? 50);
  const category = payload?.category ?? "B";
  const mode = payload?.lastMode ?? payload?.mode ?? "local";
  const domain = payload?.domain ?? "";
  const summary = payload?.summary ?? "";

  lume.src = getGifForScore(score);

  // atualiza tooltip
  tip.innerHTML = `
    <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;">
      <div style="font-weight:700;font-size:13px;">Lumen</div>
      <div style="opacity:.85;">${score}/100</div>
    </div>
    <div style="margin-top:6px;opacity:.9;">
      <div><b>Domínio:</b> ${escapeHtml(domain || "—")}</div>
      <div><b>Categoria:</b> ${escapeHtml(String(category))} <span style="opacity:.75;">(${escapeHtml(String(mode))})</span></div>
    </div>
    <div style="margin-top:8px;opacity:.95;">
      ${escapeHtml(summary || "Sem resumo.")}
    </div>
  `;

  if (lumePos) {
    wrap.style.left = lumePos.x + "px";
    wrap.style.top = lumePos.y + "px";
  }
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function boot() {
  const st = await chrome.storage.local.get([
    "score",
    "category",
    "summary",
    "domain",
    "lastMode",
    "lumePos",
    "overlayAtivo",
  ]);

  if (st.overlayAtivo === false) return removeOverlay();

  ensureOverlay(
    {
      score: st.score ?? 50,
      category: st.category ?? "B",
      summary: st.summary ?? "Sem resumo.",
      domain: st.domain ?? "",
      lastMode: st.lastMode ?? "local",
    },
    st.lumePos
  );
}

boot();

// 3) Atualiza overlay quando o background mandar novo payload
chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type !== "LUMEN_UPDATE") return;

  if (msg.overlayAtivo === false) {
    removeOverlay();
    return;
  }

  chrome.storage.local.get(["lumePos", "overlayAtivo"], (st) => {
    if (st.overlayAtivo === false) return removeOverlay();
    ensureOverlay(msg, st.lumePos);
  });
});