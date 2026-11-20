(() => {
  if (window.__stackedBackendWaitInstalled) return;
  window.__stackedBackendWaitInstalled = true;

  const directFetch = window.fetch.bind(window);
  const wakeUrl = "/api/wake";
  const healthUrl = "/api/health";
  const readyKey = "stacked-backend-ready";
  const reloadKey = "stacked-backend-ready-reload";
  const maxWaitMs = 120_000;
  let ready = false;
  let waiting;
  let notice;
  let refreshWhenReady = false;

  try {
    const isReadyReload = sessionStorage.getItem(reloadKey) === "1";
    if (isReadyReload) sessionStorage.removeItem(reloadKey);
    refreshWhenReady = !isReadyReload && sessionStorage.getItem(readyKey) !== "1";
  } catch (_error) {
    // Continue normally if this browser blocks session storage.
  }

  function showNotice() {
    if (!notice) {
      notice = document.createElement("div");
      notice.setAttribute("role", "status");
      notice.setAttribute("aria-live", "polite");
      Object.assign(notice.style, {
        position: "fixed",
        zIndex: "10000",
        top: "12px",
        left: "50%",
        transform: "translateX(-50%)",
        padding: "9px 15px",
        border: "1px solid #c5f51a55",
        borderRadius: "999px",
        background: "#102017f2",
        color: "#e9f3e4",
        font: "600 12px/1.3 'DM Sans', Arial, sans-serif",
      });
      document.body.append(notice);
    }
    notice.textContent = "Connecting to STACKED…";
  }

  function hideNotice() {
    notice?.remove();
    notice = null;
  }

  async function waitUntilReady() {
    const deadline = Date.now() + maxWaitMs;
    let attempt = 0;
    const noticeTimer = window.setTimeout(showNotice, 1200);

    // Vercel proxies this to Render's lightweight /health route. The first
    // request wakes a sleeping Render instance; readiness is checked below.
    try {
      await directFetch(wakeUrl, {
        method: "GET",
        cache: "no-store",
        credentials: "same-origin",
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
      });
    } catch (_error) {
      // Render may still be starting. Continue polling its readiness route.
    }

    while (Date.now() < deadline) {
      try {
        const response = await directFetch(healthUrl, {
          method: "GET",
          cache: "no-store",
          credentials: "same-origin",
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(8000),
        });

        if (response.ok && (response.headers.get("content-type") || "").includes("application/json")) {
          const health = await response.json();
          if (health.status === "ok" && health.database === "connected") {
            ready = true;
            window.clearTimeout(noticeTimer);
            hideNotice();

            try {
              sessionStorage.setItem(readyKey, "1");
              if (refreshWhenReady) {
                sessionStorage.setItem(reloadKey, "1");
                window.location.reload();
                // Keep waiting API calls from racing the page reload.
                return new Promise(() => {});
              }
            } catch (_error) {
              // If storage is unavailable, keep the page usable without reload.
            }
            return;
          }
        }
        try {
          sessionStorage.removeItem(readyKey);
          refreshWhenReady = true;
        } catch (_error) {
          // Readiness polling still works without session storage.
        }
      } catch (_error) {
        try {
          sessionStorage.removeItem(readyKey);
          refreshWhenReady = true;
        } catch (_storageError) {
          // Readiness polling still works without session storage.
        }
        // A proxy HTML error or a starting backend is temporary; try again.
      }

      attempt += 1;
      const delay = Math.min(1000 * 1.5 ** (attempt - 1), 6000);
      await new Promise((resolve) => window.setTimeout(resolve, delay));
    }

    window.clearTimeout(noticeTimer);
    hideNotice();
    throw new Error("STACKED is still starting. Please try your request again shortly.");
  }

  function ensureReady() {
    if (ready) return Promise.resolve();
    if (!waiting) {
      waiting = waitUntilReady().catch((error) => {
        waiting = null;
        throw error;
      });
    }
    return waiting;
  }

  window.fetch = (input, options) => {
    let url;
    try {
      url = new URL(typeof input === "string" ? input : input.url, window.location.href);
    } catch (_error) {
      return directFetch(input, options);
    }

    const isApiRequest = url.origin === window.location.origin && url.pathname.startsWith("/api/");
    if (!isApiRequest || url.pathname === healthUrl) return directFetch(input, options);
    return ensureReady().then(() => directFetch(input, options));
  };

  // Warm pages begin checking in the background. API calls wait for the same
  // health check instead of racing the backend while it is starting.
  ensureReady().catch((error) => console.warn(error.message));
})();
