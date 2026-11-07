// O dashboard recebe apenas um desafio descartável. Tokens nunca atravessam window.postMessage.
window.addEventListener("message", async (event) => {
  if (event.source !== window || !LumenHandshakePolicy.isTrustedOrigin(event.origin)) return;

  if (event.data?.type === "LUMEN_ACCOUNT_STATUS_REQUEST" &&
      LumenHandshakePolicy.isTrustedDashboardUrl(window.location.href, "/dashboard") &&
      LumenHandshakePolicy.isValidNonce(event.data.requestId)) {
    const response = await chrome.runtime.sendMessage({ type: "GET_ACCOUNT_STATUS" });
    window.postMessage({ type: "LUMEN_ACCOUNT_STATUS_RESULT", requestId: event.data.requestId, ...response }, LumenHandshakePolicy.trustedDashboardOrigin);
    return;
  }

  if (event.data?.type === "LUMEN_START_ACCOUNT_CONNECTION" &&
      LumenHandshakePolicy.isTrustedDashboardUrl(window.location.href, "/dashboard") &&
      LumenHandshakePolicy.isValidNonce(event.data.requestId)) {
    const response = await chrome.runtime.sendMessage({ type: "START_ACCOUNT_CONNECTION" });
    window.postMessage({ type: "LUMEN_START_ACCOUNT_RESULT", requestId: event.data.requestId, ...response }, LumenHandshakePolicy.trustedDashboardOrigin);
    return;
  }

  if (event.data?.type === "LUMEN_CONNECT_REQUEST" &&
      LumenHandshakePolicy.isTrustedDashboardUrl(window.location.href, "/extension/connect") &&
      LumenHandshakePolicy.isValidNonce(event.data.requestId) &&
      LumenHandshakePolicy.isValidInstallationId(event.data.installationId) &&
      LumenHandshakePolicy.isValidPkceChallenge(event.data.codeChallenge)) {
    const response = await chrome.runtime.sendMessage({
      type: "PREPARE_EXTENSION_AUTH",
      requestId: event.data.requestId,
      installationId: event.data.installationId,
      codeChallenge: event.data.codeChallenge,
    });
    if (!response?.ok || !LumenHandshakePolicy.isValidNonce(response.challenge)) return;
    window.postMessage(
      { type: "LUMEN_CONNECT_CHALLENGE", requestId: event.data.requestId, challenge: response.challenge },
      LumenHandshakePolicy.trustedDashboardOrigin,
    );
    return;
  }

  if (event.data?.type === "LUMEN_CONNECT_COMMIT" &&
      LumenHandshakePolicy.isTrustedDashboardUrl(window.location.href, "/extension/connect")) {
    if (!LumenHandshakePolicy.isValidNonce(event.data.requestId) ||
        !LumenHandshakePolicy.isValidNonce(event.data.challenge) ||
        !LumenHandshakePolicy.isValidInstallationId(event.data.installationId) ||
        !LumenHandshakePolicy.isValidPkceChallenge(event.data.codeChallenge) ||
        !LumenHandshakePolicy.isValidAuthorizationCode(event.data.authorizationCode)) return;
    const response = await chrome.runtime.sendMessage({
      type: "COMPLETE_EXTENSION_AUTH",
      requestId: event.data.requestId,
      challenge: event.data.challenge,
      installationId: event.data.installationId,
      codeChallenge: event.data.codeChallenge,
      authorizationCode: event.data.authorizationCode,
    });
    window.postMessage(
      { type: "LUMEN_CONNECT_RESULT", requestId: event.data.requestId, ok: response?.ok === true },
      LumenHandshakePolicy.trustedDashboardOrigin,
    );
  }
});

function getGifForScore(score) {
  const state = LumenScoreContract.scoreState(score).key;
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

  const score =
    typeof payload?.score === "number" && Number.isFinite(payload.score) ? payload.score : null;
  const category = payload?.category ?? "";
  const mode = payload?.lastMode ?? payload?.mode ?? "local";
  const domain = payload?.domain ?? "";
  const summary = payload?.summary ?? "";

  lume.src = getGifForScore(score);

  // atualiza tooltip
  tip.innerHTML = `
    <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;">
      <div style="font-weight:700;font-size:13px;">Lumen</div>
      <div style="opacity:.85;">${score === null ? "—" : `${score}/100`}</div>
    </div>
    <div style="margin-top:6px;opacity:.9;">
      <div><b>Domínio:</b> ${escapeHtml(domain || "—")}</div>
      <div><b>Categoria:</b> ${escapeHtml(String(category || "Evidência insuficiente"))} <span style="opacity:.75;">(${escapeHtml(String(mode))})</span></div>
    </div>
    <div style="margin-top:8px;opacity:.95;">
      ${escapeHtml(summary || "Sem resumo.")}
    </div>
    <div style="margin-top:8px;opacity:.75;">
      Estimativa automatizada baseada principalmente no domínio. Não é checagem factual.
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
      score: typeof st.score === "number" ? st.score : null,
      category: st.category ?? "",
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
