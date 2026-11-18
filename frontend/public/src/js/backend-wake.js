(() => {
  if (window.__stackedBackendWakeInstalled) return;
  window.__stackedBackendWakeInstalled = true;

  const nativeFetch = window.fetch.bind(window);
  const readyEndpoint = "/api/health";
  const maxWaitMs = 120_000;
  let ready = false;
  let readinessPromise;
  let notice;
  let noticeTimer;

  function showNotice(message = "Waking up your workspace…") {
    if (!notice) {
      notice = document.createElement("div");
      notice.setAttribute("role", "status");
      notice.setAttribute("aria-live", "polite");
      Object.assign(notice.style, {
        position: "fixed",
        zIndex: "10000",
        top: "12px",
        left: "50%",
        transform: "translateX(-50%) translateY(-8px)",
        padding: "10px 16px",
        border: "1px solid #c5f51a55",
        borderRadius: "999px",
        background: "#102017f2",
        boxShadow: "0 8px 30px #0005",
        color: "#e9f3e4",
        font: "600 12px/1.3 'DM Sans', Arial, sans-serif",
        opacity: "0",
        transition: "opacity .2s ease, transform .2s ease",
        pointerEvents: "none",
        whiteSpace: "nowrap",
      });
      document.body.append(notice);
      requestAnimationFrame(() => {
        notice.style.opacity = "1";
        notice.style.transform = "translateX(-50%) translateY(0)";
      });
    }
    notice.textContent = message;
  }

  function hideNotice() {
    if (!notice) return;
    notice.style.opacity = "0";
    notice.style.transform = "translateX(-50%) translateY(-8px)";
    window.setTimeout(() => notice?.remove(), 250);
    notice = null;
  }

  async function waitForRender() {
    const deadline = Date.now() + maxWaitMs;
    let attempt = 0;
    noticeTimer = window.setTimeout(() => showNotice(), 700);

    while (Date.now() < deadline) {
      try {
        const response = await nativeFetch(readyEndpoint, {
          method: "GET",
          cache: "no-store",
          credentials: "same-origin",
          signal: AbortSignal.timeout(12_000),
          headers: { Accept: "application/json" },
        });
        const contentType = response.headers.get("content-type") || "";
        if (response.ok && contentType.includes("application/json")) {
          const health = await response.json();
          if (health.status === "ok" && health.database === "connected") {
            ready = true;
            window.clearTimeout(noticeTimer);
            hideNotice();
            return;
          }
        }
      } catch (_error) {
        // Render may still be starting or Vercel may return its transient
        // proxy error page. Keep probing until the normal health check passes.
      }

      attempt += 1;
      await new Promise((resolve) => window.setTimeout(resolve, Math.min(1800 + attempt * 900, 6000)));
    }

    window.clearTimeout(noticeTimer);
    showNotice("The API is taking longer than expected. Retrying on your next action.");
    throw new Error("STACKED API is still starting. Please try again in a few seconds.");
  }

  function ensureBackendReady() {
    if (ready) return Promise.resolve();
    if (!readinessPromise) {
      readinessPromise = waitForRender().catch((error) => {
        readinessPromise = null;
        throw error;
      });
    }
    return readinessPromise;
  }

  window.fetch = (input, init) => {
    let requestUrl;
    try {
      requestUrl = new URL(typeof input === "string" ? input : input.url, window.location.href);
    } catch (_error) {
      return nativeFetch(input, init);
    }
    const sameOriginApi = requestUrl.origin === window.location.origin && requestUrl.pathname.startsWith("/api/");
    if (!sameOriginApi || requestUrl.pathname === readyEndpoint) return nativeFetch(input, init);
    return ensureBackendReady().then(() => nativeFetch(input, init));
  };

  // Start the wake-up on page entry. Every API request waits for this one
  // readiness check; timeline interactions do not issue new wake or AI calls.
  ensureBackendReady().catch((error) => {
    console.warn(error.message);
    showNotice("API unavailable. It will retry when you use the page.");
  });
})();
