const letterRoot = document.querySelector("#letterRoot");
const cachePrefix = "stackedFutureSelfLetterV2";
let selectedMonths = 3;

function escapeLetter(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function introMarkup() {
  return `<section class="letter-intro"><span class="letter-eyebrow">A MOMENT FROM THE FUTURE</span><h1>A note from <span>you.</span></h1><p>Choose a horizon. Your letter reflects your profile and the activity you have actually logged.</p></section>
    <div class="letter-horizon" role="group" aria-label="Letter time horizon">
      <button type="button" data-months="3" class="${selectedMonths === 3 ? "active" : ""}" aria-pressed="${selectedMonths === 3}">3 months</button>
      <button type="button" data-months="6" class="${selectedMonths === 6 ? "active" : ""}" aria-pressed="${selectedMonths === 6}">6 months</button>
    </div>`;
}

function wireHorizon() {
  letterRoot.querySelectorAll("[data-months]").forEach((button) => {
    button.addEventListener("click", () => {
      const months = Number(button.dataset.months);
      if (months === selectedMonths) return;
      selectedMonths = months;
      loadLetter();
    });
  });
}

function renderLetter(result) {
  const letter = result.letter || {};
  const activity = result.activitySummary || {};
  const paragraphs = Array.isArray(letter.paragraphs) ? letter.paragraphs : [];
  const consistency = activity.consistencyPercent == null ? "Not enough data" : `${activity.consistencyPercent}%`;
  letterRoot.innerHTML = `${introMarkup()}
    <section class="letter-activity" aria-label="Recent activity summary">
      <div><span>Completed activities</span><strong>${Number(activity.completedActivities || 0)}</strong><small>Over the last ${Number(activity.windowDays || 30)} days</small></div>
      <div><span>Active days</span><strong>${Number(activity.activeDays || 0)}</strong><small>Days with at least one check-in</small></div>
      <div><span>Consistency</span><strong>${escapeLetter(consistency)}</strong><small>${Number(activity.activeGoals || 0)} active goals considered</small></div>
    </section>
    <article class="letter-card"><div class="letter-paper-mark" aria-hidden="true">✉</div><p class="letter-subject">${escapeLetter(letter.subject || `A letter from ${result.timeframeMonths || selectedMonths} months ahead`)}</p><p class="letter-greeting">${escapeLetter(letter.greeting || "Dear me,")}</p><div class="letter-body">${paragraphs.map((paragraph) => `<p>${escapeLetter(paragraph)}</p>`).join("")}</div><p class="letter-signoff">${escapeLetter(letter.signoff || "With care,")}</p><span class="letter-future-label">${escapeLetter(letter.futureSelfLabel || `You, ${result.timeframeMonths || selectedMonths} months from now`)}</span></article>
    <p class="letter-grounding">${escapeLetter(letter.groundingNote || result.disclaimer || "An imaginative reflection based on your profile and recent activity, not a prediction.")}</p>
    <div class="letter-actions"><button type="button" id="rewriteLetter">Write another reflection</button></div>`;
  wireHorizon();
  letterRoot.querySelector("#rewriteLetter")?.addEventListener("click", () => loadLetter(true));
}

async function loadLetter(force = false) {
  const cacheKey = `${cachePrefix}:${selectedMonths}`;
  if (!force) {
    try {
      const cached = JSON.parse(sessionStorage.getItem(cacheKey) || "null");
      if (cached?.letter) return renderLetter(cached);
    } catch { sessionStorage.removeItem(cacheKey); }
  }

  letterRoot.innerHTML = `${introMarkup()}<section class="letter-loading"><span class="letter-spinner"></span><p>Gathering your profile and recent activity…</p></section>`;
  wireHorizon();
  const requestMonths = selectedMonths;
  try {
    const response = await fetch("/api/analysis/letter", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timeframeMonths: requestMonths }),
    });
    const result = await response.json();
    if (response.status === 401) return window.location.replace("/login.html");
    if (!response.ok) throw new Error(result.message || "Could not write your letter.");
    sessionStorage.setItem(`${cachePrefix}:${requestMonths}`, JSON.stringify(result));
    if (requestMonths === selectedMonths) renderLetter(result);
  } catch (error) {
    if (requestMonths !== selectedMonths) return;
    letterRoot.innerHTML = `${introMarkup()}<section class="letter-error"><h2>Your letter is not ready yet.</h2><p>${escapeLetter(error.message)}</p><button type="button" id="retryLetter">Try again</button></section>`;
    wireHorizon();
    letterRoot.querySelector("#retryLetter")?.addEventListener("click", () => loadLetter(true));
  }
}

loadLetter();
