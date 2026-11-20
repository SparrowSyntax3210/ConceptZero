(() => {
  if (window.__stackedBackendWaitInstalled) return;
  window.__stackedBackendWaitInstalled = true;

  const directFetch = window.fetch.bind(window);
  const apiOrigin = "https://conceptzero-stacked-api.onrender.com";
  const healthPath = "/api/health";
  const healthUrl = `${apiOrigin}${healthPath}`;
  const maxWaitMs = 120_000;
  let ready = false;
  let waiting;
  let notice;
  const startupScreen = document.getElementById("backend-startup");
  const startupTitle = document.getElementById("backend-startup-title");
  const startupDetail = document.getElementById("backend-startup-detail");
  const retryButton = document.getElementById("backend-startup-retry");

  function showNotice() {
    if (startupScreen) {
      startupScreen.hidden = false;
      startupScreen.setAttribute("aria-busy", "true");
      startupTitle.textContent = "Waking up STACKED";
      startupDetail.textContent = "Starting the service and connecting to your habit space…";
      retryButton.hidden = true;
      return;
    }

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
    if (startupScreen) {
      startupScreen.hidden = true;
      startupScreen.setAttribute("aria-busy", "false");
    }
    notice?.remove();
    notice = null;
  }

  function showFailure() {
    if (!startupScreen) return;
    startupScreen.hidden = false;
    startupScreen.setAttribute("aria-busy", "false");
    startupTitle.textContent = "STACKED is taking longer to start";
    startupDetail.textContent = "The server hasn’t connected yet. Try again in a moment.";
    retryButton.hidden = false;
  }

  async function waitUntilReady() {
    const deadline = Date.now() + maxWaitMs;
    let attempt = 0;
    const noticeTimer = window.setTimeout(showNotice, 1200);
    if (startupScreen) showNotice();

    // Call Render directly. The first request wakes the service; retries wait
    // until the API and database are ready.
    while (Date.now() < deadline) {
      try {
        const response = await directFetch(healthUrl, {
          method: "GET",
          cache: "no-store",
          credentials: "include",
          mode: "cors",
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(8000),
        });

        if (response.ok && (response.headers.get("content-type") || "").includes("application/json")) {
          const health = await response.json();
          if (health.status === "ok" && health.database === "connected") {
            ready = true;
            window.clearTimeout(noticeTimer);
            hideNotice();
            return;
          }
        }
        if (startupScreen && attempt === 0) {
          startupDetail.textContent = "Waking Render and waiting for the database connection…";
        }
      } catch (_error) {
        // A proxy HTML error or a starting backend is temporary; try again.
      }

      attempt += 1;
      const delay = Math.min(1000 * 1.5 ** (attempt - 1), 6000);
      await new Promise((resolve) => window.setTimeout(resolve, delay));
    }

    window.clearTimeout(noticeTimer);
    showFailure();
    if (!startupScreen) hideNotice();
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

    const isBackendApi =
      url.pathname.startsWith("/api/") &&
      (url.origin === window.location.origin || url.origin === apiOrigin);
    if (!isBackendApi) return directFetch(input, options);

    const backendUrl = `${apiOrigin}${url.pathname}${url.search}`;
    const backendOptions = { ...options, credentials: "include", mode: "cors" };
    if (url.pathname === healthPath) return directFetch(backendUrl, backendOptions);
    return ensureReady().then(() => directFetch(backendUrl, backendOptions));
  };

  retryButton?.addEventListener("click", () => {
    ready = false;
    waiting = null;
    ensureReady().catch((error) => {
      showFailure();
      console.warn(error.message);
    });
  });

  // Warm pages begin checking in the background. API calls wait for the same
  // health check instead of racing the backend while it is starting.
  ensureReady().catch((error) => {
    showFailure();
    console.warn(error.message);
  });
})();
