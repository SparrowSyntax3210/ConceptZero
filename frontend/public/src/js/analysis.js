const root = document.querySelector("#comparisonRoot");
const categories = [
  ["health-fitness", "Health & Fitness"],
  ["mind-digital", "Mind & Digital Wellbeing"],
  ["academics-career", "Academics & Career Growth"],
  ["lifestyle-growth", "Lifestyle & Personal Growth"],
];

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(parsed) : "—";
}

function scoreLabel(score) {
  if (score >= 80) return "Strong foundation";
  if (score >= 60) return "On track, with room to grow";
  return "A good place to start";
}

function quantities(items = []) {
  if (!items.length) return '<div class="quantity-row"><span>No saved quantities yet</span><strong>—</strong></div>';
  return items.map((item) => `<div class="quantity-row"><span>${escapeHtml(item.metric)}</span><strong>${number(item.value)} ${escapeHtml(item.unit)}</strong></div>`).join("");
}

function recommendations(items = []) {
  if (!items.length) return '<div class="change-item"><span>No measurable target available for this section yet.</span><strong>—</strong></div>';
  return items.map((item) => `<div class="change-item"><span>${escapeHtml(item.metric)}</span><strong>${number(item.currentValue)} → ${number(item.targetValue)} ${escapeHtml(item.unit)}</strong><small>${escapeHtml(item.reason)}</small></div>`).join("");
}

function render(data, available) {
  const current = data.current?.categories?.[0];
  const future = data.future?.categories?.[0];
  if (!current || !future) throw new Error("This section has no comparison data yet.");
  const score = Math.max(0, Math.min(100, Number(current.score) || 0));
  const futureScore = Math.max(0, Math.min(100, Number(future.score) || 0));
  const insights = (data.keyInsights || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  const limits = (data.limits || []).map(escapeHtml).join(" • ");
  const tabs = available.map((category) => `<button type="button" class="insight-side-link ${category.id === data.categoryId ? "active" : ""}" data-insight-category="${category.id}"><span>${escapeHtml(category.label)}</span><small>View analysis →</small></button>`).join("");
  const goalCount = data.goals?.length || 0;

  root.innerHTML = `<div class="insights-shell">
    <aside class="insights-sidebar"><h2>Insights</h2><p>Explore a profile area</p><button type="button" class="insight-side-link ${data.categoryId === "overview" ? "active" : ""}" data-insight-overview><span>Overview</span><small>Summary</small></button>${tabs}<a class="insight-side-link" href="/tracker.html"><span>Back to Tracker</span><small>Daily check-ins →</small></a></aside>
    <div class="insights-content"><section class="comparison-heading reveal">
      <span class="eyebrow">YOUR PERSONAL INSIGHTS</span>
      <h1>Understand your <span>progress.</span></h1>
      <p>Current quantities and personalized targets for ${escapeHtml(data.timeHorizon || "the next few weeks")}.</p>
      <div class="insight-period" aria-label="Analysis period">Based on your latest saved check-in</div>
    </section>
    <section class="comparison-grid" aria-label="Current and suggested section comparison">
      <article class="comparison-card current-card reveal">
        <div class="card-kicker"><span class="kicker-dot">⌁</span>Your Current Path</div>
        <h2>${escapeHtml(scoreLabel(score))}</h2>
        <p class="card-subtitle">${escapeHtml(current.label)} · measured from your saved profile.</p>
        <div class="score-and-quantities">
          <div class="score-ring" style="--score:${score}" role="img" aria-label="${score}% category score"><div class="score-copy"><strong>${score}%</strong><span>Profile score</span></div></div>
          <div class="quantity-list">${quantities(current.quantities)}</div>
        </div>
        ${insights ? `<div class="changes-box"><h3>Key insights</h3><ul>${insights}</ul></div>` : ""}
      </article>
      <figure class="middle-figure" aria-hidden="true"><div class="figure-halo"></div><img src="./assets/dashboard.png" alt="" /></figure>
      <article class="comparison-card future-card reveal">
        <div class="card-kicker"><span class="kicker-dot">✦</span>With Our Suggestions</div>
        <h2>${escapeHtml(future.summary || "A more intentional direction.")}</h2>
        <p class="card-subtitle">Suggested score ${futureScore}% · ${escapeHtml(data.confidence || "low")} confidence · ${escapeHtml(data.timeHorizon || "8 weeks")}</p>
        <div class="score-and-quantities">
          <div class="score-ring" style="--score:${futureScore}" role="img" aria-label="${futureScore}% suggested score"><div class="score-copy"><strong>${futureScore}%</strong><span>Suggested score</span></div></div>
          <div class="quantity-list">${recommendations(future.changes)}</div>
        </div>
        <div class="auto-goal-note"><strong>✦ ${goalCount} AI goal${goalCount === 1 ? "" : "s"} added automatically</strong><span>Suggested quantities are ready for daily check-ins.</span><a href="/goals.html">View Goals →</a></div>
      </article>
    </section>
    <p class="comparison-note">${limits || "Suggestions are measurable planning targets, not guaranteed outcomes."} · Confidence: ${escapeHtml(data.confidence || "low")}.</p>
    <div class="comparison-footer"><a href="/tracker.html">Go to your tracker&nbsp; →</a></div></div></div>`;

  root.querySelectorAll("[data-insight-category]").forEach((button) => {
    button.addEventListener("click", () => loadInsight(button.dataset.insightCategory, available));
  });
  root.querySelector("[data-insight-overview]")?.addEventListener("click", () => loadInsight(available[0].id, available));
}

async function loadInsight(categoryId, available) {
  localStorage.setItem("lastInsightCategoryId", categoryId);
  root.innerHTML = `<section class="comparison-loading"><span class="analysis-loader"><i></i><i></i><i></i></span><p>Refreshing ${escapeHtml(categories.find(([id]) => id === categoryId)?.[1] || "your insight")}…</p></section>`;
  try {
    const response = await fetch(`/api/analysis/category/${encodeURIComponent(categoryId)}`, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: "{}" });
    const result = await response.json();
    if (response.status === 401) return window.location.replace("/login.html");
    if (!response.ok) throw new Error(result.message || "Could not load this insight.");
    render(result, available);
  } catch (error) {
    root.innerHTML = `<section class="comparison-error"><h1>Insight unavailable</h1><p>${escapeHtml(error.message)}</p><a href="/forms.html">Update your profile</a></section>`;
  }
}

async function startInsights() {
  root.innerHTML = '<section class="comparison-loading"><span class="analysis-loader"><i></i><i></i><i></i></span><p>Loading your insights…</p></section>';
  try {
    const statusResponse = await fetch("/api/categories", { credentials: "same-origin" });
    const status = await statusResponse.json();
    if (statusResponse.status === 401) return window.location.replace("/login.html");
    if (!statusResponse.ok) throw new Error(status.message || "Could not load your profile sections.");
    const available = (status.categories || []).filter((item) => item.completed).map((item) => ({ id: item.id, label: item.label }));
    if (!available.length) {
      root.innerHTML = '<section class="comparison-error"><h1>Your insights start with a check-in.</h1><p>Save any one profile section to see its current quantities and suggested targets.</p><a href="/forms.html">Complete a profile section →</a></section>';
      return;
    }

    root.dataset.available = JSON.stringify(available);
    root.dataset.activeCategory = "";

    const oneTimeCategory = sessionStorage.getItem("stackedSubmittedCategory");
    const cached = sessionStorage.getItem("stackedAnalysisResult");
    sessionStorage.removeItem("stackedSubmittedCategory");
    sessionStorage.removeItem("stackedAnalysisResult");
    const requestedCategory = new URLSearchParams(window.location.search).get("category");
    if (cached && oneTimeCategory && !requestedCategory && oneTimeCategory === JSON.parse(cached).categoryId && available.some((item) => item.id === oneTimeCategory)) {
      localStorage.setItem("lastInsightCategoryId", oneTimeCategory);
      render(JSON.parse(cached), available);
      return;
    }

    const preferred = requestedCategory || localStorage.getItem("lastInsightCategoryId");
    const categoryId = available.some((item) => item.id === preferred) ? preferred : available[0].id;
    await loadInsight(categoryId, available);
  } catch (error) {
    root.innerHTML = `<section class="comparison-error"><h1>Insights unavailable</h1><p>${escapeHtml(error.message)}</p><a href="/tracker.html">Go to Tracker</a></section>`;
  }
}

startInsights();
