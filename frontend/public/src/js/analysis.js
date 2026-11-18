const root = document.querySelector("#comparisonRoot");
const loadedViews = new Map();
const inFlightViews = new Map();
const persistentCacheKey = "stackedInsightsViewsV1";
let activeViewKey = null;

function readPersistentCache() {
  try {
    const value = JSON.parse(sessionStorage.getItem(persistentCacheKey) || "null");
    return value && typeof value === "object" ? value : null;
  } catch {
    return null;
  }
}

function persistView(viewKey, data, available) {
  loadedViews.set(viewKey, data);
  try {
    const previous = readPersistentCache() || {};
    const views = { ...(previous.views || {}), [viewKey]: data };
    sessionStorage.setItem(
      persistentCacheKey,
      JSON.stringify({ views, available, lastView: viewKey }),
    );
  } catch (error) {
    console.warn("Could not persist Insights view for this tab:", error);
  }
}

function rememberLastView(viewKey, available) {
  try {
    const previous = readPersistentCache() || {};
    sessionStorage.setItem(
      persistentCacheKey,
      JSON.stringify({
        ...previous,
        available,
        lastView: viewKey,
        views: Object.fromEntries(loadedViews),
      }),
    );
  } catch (error) {
    console.warn("Could not persist Insights view selection:", error);
  }
}
const categories = [
  ["health-fitness", "Health & Fitness"],
  ["mind-digital", "Mind & Digital Wellbeing"],
  ["academics-career", "Academics & Career Growth"],
  ["lifestyle-growth", "Lifestyle & Personal Growth"],
];

function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ],
  );
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(
        parsed,
      )
    : "—";
}

function scoreLabel(score) {
  if (score >= 80) return "Strong foundation";
  if (score >= 60) return "On track, with room to grow";
  return "A good place to start";
}

function quantities(items = []) {
  if (!items.length)
    return '<div class="quantity-row"><span>No saved quantities yet</span><strong>—</strong></div>';
  return items
    .map(
      (item) =>
        `<div class="quantity-row"><span>${escapeHtml(item.metric)}</span><strong>${number(item.value)} ${escapeHtml(item.unit)}</strong></div>`,
    )
    .join("");
}

function recommendations(items = []) {
  if (!items.length)
    return '<div class="change-item"><span>No measurable target available for this section yet.</span><strong>—</strong></div>';
  return items
    .map(
      (item) =>
        `<div class="change-item"><span>${escapeHtml(item.metric)}</span><strong>${number(item.currentValue)} → ${number(item.targetValue)} ${escapeHtml(item.unit)}</strong><small>${escapeHtml(item.reason)}</small></div>`,
    )
    .join("");
}

function overviewSidebar(available) {
  return `<aside class="insights-sidebar"><h2>Insights</h2><p>Explore a profile area</p><button type="button" class="insight-side-link active" data-insight-overview><span>Overview</span><small>Both paths</small></button>${available
    .map((category) => `<button type="button" class="insight-side-link" data-insight-category="${category.id}"><span>${escapeHtml(category.label)}</span><small>View analysis →</small></button>`)
    .join("")}<a class="insight-side-link" href="/tracker.html"><span>Back to Tracker</span><small>Daily check-ins →</small></a></aside>`;
}

function graphPath(points, property) {
  const width = 600;
  const left = 44;
  const right = width - 18;
  const top = 18;
  const bottom = 174;
  return points.map((point, index) => {
    const x = left + ((right - left) * index) / Math.max(1, points.length - 1);
    const y = bottom - ((bottom - top) * Math.max(0, Math.min(100, Number(point[property]) || 0))) / 100;
    return `${index ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");
}

function summaryPointers(value, fallback) {
  const sentences = String(value || fallback)
    .split(/(?<=[.!?])\s+(?=[A-Z0-9])|\n+|;\s*/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  return `<ul class="path-pointers">${sentences
    .map((sentence) => `<li>${escapeHtml(sentence)}</li>`)
    .join("")}</ul>`;
}

function renderOverview(data, available) {
  const trajectory = Array.isArray(data.trajectory) ? data.trajectory : [];
  if (trajectory.length < 2) throw new Error("The overview response did not include enough graph points.");
  const currentLine = graphPath(trajectory, "currentScore");
  const guidelineLine = graphPath(trajectory, "guidelineScore");
  const xPositions = trajectory.map((_, index) => 44 + ((582 - 44) * index) / (trajectory.length - 1));
  const currentDots = trajectory.map((point, index) => `<circle class="scenario-dot current-dot" cx="${xPositions[index].toFixed(1)}" cy="${(174 - (156 * Math.max(0, Math.min(100, Number(point.currentScore) || 0))) / 100).toFixed(1)}" r="4" />`).join("");
  const guidelineDots = trajectory.map((point, index) => `<circle class="scenario-dot guideline-dot" cx="${xPositions[index].toFixed(1)}" cy="${(174 - (156 * Math.max(0, Math.min(100, Number(point.guidelineScore) || 0))) / 100).toFixed(1)}" r="4" />`).join("");
  const weekLabels = trajectory.map((point) => `<span>Week ${Number(point.week) || 0}</span>`).join("");
  const insightItems = (data.keyInsights || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  const assumptions = (data.assumptions || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  const guidelines = (data.guidelinePath?.guidelines || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  const analyzedAreas = data.sections?.length || 0;
  const horizon = Number(data.timeHorizonWeeks) || 8;

  root.innerHTML = `<div class="insights-shell">
    ${overviewSidebar(available)}
    <div class="insights-content overview-content">
      <section class="comparison-heading reveal"><span class="eyebrow">YOUR PERSONAL INSIGHTS</span><h1>Your progress</h1><p>See how your habits may develop over ${horizon} weeks, and what could change when you follow your guidelines.</p><div class="insight-period">Based on ${analyzedAreas} completed profile area${analyzedAreas === 1 ? "" : "s"}</div></section>
      <section class="overview-main-grid" aria-label="Progress overview and key insights">
        <div class="overview-left-column">
          <section class="overview-stats" aria-label="Insight summary">
            <article class="overview-stat"><span class="overview-stat-icon">◎</span><div><small>Profile areas</small><strong>${analyzedAreas}</strong><span>included in this view</span></div></article>
            <article class="overview-stat"><span class="overview-stat-icon">◉</span><div><small>Current baseline</small><strong>${number(data.baselineScore)}</strong><span>illustrative index</span></div></article>
            <article class="overview-stat overview-stat-guided"><span class="overview-stat-icon">↗</span><div><small>With guidelines</small><strong>${number(data.guidelinePath?.projectedScore)}</strong><span>possible index at ${horizon} weeks</span></div></article>
          </section>
          <aside class="overview-key-insights"><div class="key-insights-heading"><span class="page-kicker">PATTERNS TO NOTICE</span><h2>Key insights</h2></div>${insightItems ? `<ul>${insightItems}</ul>` : "<p>Save more profile details to get a more useful comparison.</p>"}</aside>
        </div>
        <div class="overview-primary-column">
          <section class="scenario-module" aria-labelledby="scenarioTitle">
            <div class="scenario-heading"><div><span class="page-kicker">A DIRECTIONAL SCENARIO</span><h2 id="scenarioTitle">Your progress overview</h2><p>Illustrative score index from your saved baseline. It is not a measured forecast.</p></div><span class="confidence-badge">${escapeHtml(data.confidence || "low")} confidence</span></div>
            <div class="scenario-legend"><span><i class="legend-guideline"></i>With guidelines</span><span><i class="legend-current"></i>Current patterns</span><small>Illustrative index · 0–100</small></div>
            <div class="scenario-chart" role="img" aria-label="Scenario chart comparing current patterns and following personalized guidelines over ${horizon} weeks">
              <div class="chart-y-labels"><span>100</span><span>75</span><span>50</span><span>25</span><span>0</span></div>
              <svg viewBox="0 0 600 190" preserveAspectRatio="none" aria-hidden="true"><path class="chart-gridline" d="M44 18H582 M44 57H582 M44 96H582 M44 135H582 M44 174H582"/><path class="scenario-line current-line" d="${currentLine}"/><path class="scenario-line guideline-line" d="${guidelineLine}"/>${currentDots}${guidelineDots}</svg>
            </div>
            <div class="chart-x-labels">${weekLabels}</div>
            <div class="scenario-paths"><article class="scenario-path current-path"><span class="path-label">IF CURRENT PATTERNS CONTINUE</span>${summaryPointers(data.currentPath?.summary, "Your current baseline may hold steady.")}<p class="path-projection">${data.baselineScore == null ? "—" : `${number(data.baselineScore)} index points`} now <span aria-hidden="true">→</span> ${number(data.currentPath?.projectedScore)} illustrative points at week ${horizon}</p></article><article class="scenario-path guided-path"><span class="path-label">IF YOU FOLLOW THESE GUIDELINES</span>${summaryPointers(data.guidelinePath?.summary, "Small, consistent actions may support progress.")}<p class="path-projection">${data.baselineScore == null ? "—" : `${number(data.baselineScore)} index points`} now <span aria-hidden="true">→</span> ${number(data.guidelinePath?.projectedScore)} illustrative points at week ${horizon}</p></article></div>
          </section>
          <section class="overview-detail-grid"><article class="overview-detail-card guideline-card"><span class="page-kicker">PRACTICAL NEXT STEPS</span><h2>Your guidelines</h2>${guidelines ? `<ul>${guidelines}</ul>` : "<p>No guidelines were returned for this profile yet.</p>"}<a href="/goals.html">Review your AI goals →</a></article></section>
        </div>
      </section>
      ${assumptions ? `<details class="scenario-assumptions"><summary>Assumptions and limitations</summary><ul>${assumptions}</ul></details>` : ""}
      <p class="comparison-note scenario-disclaimer">${escapeHtml(data.disclaimer || "These illustrative scenarios are estimates from a single check-in. Actual outcomes vary and are not guaranteed.")}</p>
      <div class="comparison-footer"><a href="/tracker.html">Go to your tracker&nbsp; →</a><a href="/future.html">Explore your future&nbsp; →</a></div>
    </div>
  </div>`;

  root.querySelectorAll("[data-insight-category]").forEach((button) => {
    button.addEventListener("click", () => loadInsight(button.dataset.insightCategory, available));
  });
  root.querySelector("[data-insight-overview]")?.addEventListener("click", () => loadOverview(available));
}

async function loadOverview(available) {
  const viewKey = "overview";
  activeViewKey = viewKey;
  if (loadedViews.has(viewKey)) {
    rememberLastView(viewKey, available);
    renderOverview(loadedViews.get(viewKey), available);
    return;
  }
  root.innerHTML = '<section class="comparison-loading"><span class="analysis-loader"><i></i><i></i><i></i></span><p>Comparing your current path with your guideline path…</p></section>';
  try {
    const result = await requestAnalysisView(viewKey, "/api/analysis/overview");
    persistView(viewKey, result, available);
    if (activeViewKey === viewKey) renderOverview(result, available);
  } catch (error) {
    if (activeViewKey !== viewKey) return;
    root.innerHTML = `<section class="comparison-error"><h1>Overview unavailable</h1><p>${escapeHtml(error.message)}</p><button type="button" id="retryOverview">Try again</button><a href="/tracker.html">Return to Tracker</a></section>`;
    root.querySelector("#retryOverview")?.addEventListener("click", () => loadOverview(available));
  }
}

function requestAnalysisView(viewKey, url) {
  if (inFlightViews.has(viewKey)) return inFlightViews.get(viewKey);
  const request = (async () => {
    const response = await fetch(url, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    const result = await response.json();
    if (response.status === 401) {
      window.location.replace("/login.html");
      throw new Error("Authentication required.");
    }
    if (!response.ok) throw new Error(result.message || "Could not load this analysis.");
    return result;
  })().finally(() => inFlightViews.delete(viewKey));
  inFlightViews.set(viewKey, request);
  return request;
}

function render(data, available) {
  const current = data.current?.categories?.[0];
  const future = data.future?.categories?.[0];
  if (!current || !future)
    throw new Error("This section has no comparison data yet.");
  const score = Math.max(0, Math.min(100, Number(current.score) || 0));
  const futureScore = Math.max(0, Math.min(100, Number(future.score) || 0));
  const futureSummary = String(future.summary || "A more intentional direction.")
    .replace(/\s+/g, " ")
    .trim();
  const compactFutureSummary = futureSummary.length > 150
    ? `${futureSummary.slice(0, 147).replace(/\s+\S*$/, "")}…`
    : futureSummary;
  const insights = (data.keyInsights || [])
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
  const limits = (data.limits || []).map(escapeHtml).join(" • ");
  const tabs = available
    .map(
      (category) =>
        `<button type="button" class="insight-side-link ${category.id === data.categoryId ? "active" : ""}" data-insight-category="${category.id}"><span>${escapeHtml(category.label)}</span><small>View analysis →</small></button>`,
    )
    .join("");
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
        <h2>A more intentional direction</h2>
        <p class="future-summary">${escapeHtml(compactFutureSummary)}</p>
        <p class="card-subtitle">Suggested score ${futureScore}% · ${escapeHtml(data.confidence || "low")} confidence · ${escapeHtml(data.timeHorizon || "8 weeks")}</p>
        <div class="score-and-quantities">
          <div class="score-ring" style="--score:${futureScore}" role="img" aria-label="${futureScore}% suggested score"><div class="score-copy"><strong>${futureScore}%</strong><span>Suggested score</span></div></div>
          <div class="quantity-list">${recommendations(future.changes)}</div>
        </div>
        <div class="auto-goal-note"><strong>✦ ${goalCount} AI goal${goalCount === 1 ? "" : "s"} added automatically</strong><span>Suggested quantities are ready for daily check-ins.</span><a href="/goals.html">View Goals →</a></div>
      </article>
    </section>
    <p class="comparison-note">${limits || "Suggestions are measurable planning targets, not guaranteed outcomes."} · Confidence: ${escapeHtml(data.confidence || "low")}.</p>
    <div class="comparison-footer"><a href="/tracker.html">Go to your tracker&nbsp; →</a><a href="/future.html">Explore your future&nbsp; →</a></div></div></div>`;

  root.querySelectorAll("[data-insight-category]").forEach((button) => {
    button.addEventListener("click", () =>
      loadInsight(button.dataset.insightCategory, available),
    );
  });
  root
    .querySelector("[data-insight-overview]")
    ?.addEventListener("click", () => loadOverview(available));
}

async function loadInsight(categoryId, available) {
  const viewKey = `category:${categoryId}`;
  activeViewKey = viewKey;
  localStorage.setItem("lastInsightCategoryId", categoryId);
  if (loadedViews.has(viewKey)) {
    rememberLastView(viewKey, available);
    render(loadedViews.get(viewKey), available);
    return;
  }
  root.innerHTML = `<section class="comparison-loading"><span class="analysis-loader"><i></i><i></i><i></i></span><p>Loading ${escapeHtml(categories.find(([id]) => id === categoryId)?.[1] || "your insight")}…</p></section>`;
  try {
    const result = await requestAnalysisView(
      viewKey,
      `/api/analysis/category/${encodeURIComponent(categoryId)}`,
    );
    persistView(viewKey, result, available);
    if (activeViewKey === viewKey) render(result, available);
  } catch (error) {
    if (activeViewKey !== viewKey) return;
    root.innerHTML = `<section class="comparison-error"><h1>Insight unavailable</h1><p>${escapeHtml(error.message)}</p><a href="/forms.html">Update your profile</a><button type="button" id="retryInsight">Try again</button></section>`;
    root.querySelector("#retryInsight")?.addEventListener("click", () => loadInsight(categoryId, available));
  }
}

async function startInsights() {
  const savedCache = readPersistentCache();
  if (Array.isArray(savedCache?.available)) {
    for (const [key, value] of Object.entries(savedCache.views || {})) {
      loadedViews.set(key, value);
    }
  }

  const availableCache = savedCache?.available;
  const oneTimeCategory = sessionStorage.getItem("stackedSubmittedCategory");
  const submittedResult = sessionStorage.getItem("stackedAnalysisResult");
  sessionStorage.removeItem("stackedSubmittedCategory");
  sessionStorage.removeItem("stackedAnalysisResult");

  if (
    submittedResult &&
    oneTimeCategory &&
    availableCache?.some((item) => item.id === oneTimeCategory)
  ) {
    try {
      const result = JSON.parse(submittedResult);
      if (result.categoryId === oneTimeCategory) {
        loadedViews.delete("overview");
        const updatedViews = Object.fromEntries(loadedViews);
        sessionStorage.setItem(
          persistentCacheKey,
          JSON.stringify({ views: updatedViews, available: availableCache, lastView: `category:${oneTimeCategory}` }),
        );
        persistView(`category:${oneTimeCategory}`, result, availableCache);
        activeViewKey = `category:${oneTimeCategory}`;
        render(result, availableCache);
        return;
      }
    } catch (error) {
      console.warn("Could not restore the submitted analysis result:", error);
    }
  }

  const requestedCategory = new URLSearchParams(window.location.search).get("category");
  const preferredView = requestedCategory
    ? `category:${requestedCategory}`
    : savedCache?.lastView;
  if (
    !submittedResult &&
    availableCache?.length &&
    preferredView &&
    loadedViews.has(preferredView)
  ) {
    root.dataset.available = JSON.stringify(availableCache);
    root.dataset.activeCategory = preferredView.startsWith("category:")
      ? preferredView.slice("category:".length)
      : "";
    activeViewKey = preferredView;
    if (preferredView === "overview") {
      renderOverview(loadedViews.get(preferredView), availableCache);
    } else {
      render(loadedViews.get(preferredView), availableCache);
    }
    return;
  }

  root.innerHTML =
    '<section class="comparison-loading"><span class="analysis-loader"><i></i><i></i><i></i></span><p>Loading your insights…</p></section>';
  try {
    const statusResponse = await fetch("/api/categories", {
      credentials: "same-origin",
    });
    const status = await statusResponse.json();
    if (statusResponse.status === 401)
      return window.location.replace("/login.html");
    if (!statusResponse.ok)
      throw new Error(
        status.message || "Could not load your profile sections.",
      );
    const available = (status.categories || [])
      .filter((item) => item.completed)
      .map((item) => ({ id: item.id, label: item.label }));
    if (!available.length) {
      root.innerHTML =
        '<section class="comparison-error"><h1>Your insights start with a check-in.</h1><p>Save any one profile section to see its current quantities and suggested targets.</p><a href="/forms.html">Complete a profile section →</a></section>';
      return;
    }

    root.dataset.available = JSON.stringify(available);
    root.dataset.activeCategory = "";

    if (
      submittedResult &&
      oneTimeCategory &&
      available.some((item) => item.id === oneTimeCategory)
    ) {
      const submittedAnalysis = JSON.parse(submittedResult);
      if (submittedAnalysis.categoryId === oneTimeCategory) {
        loadedViews.delete("overview");
        persistView(`category:${oneTimeCategory}`, submittedAnalysis, available);
        activeViewKey = `category:${oneTimeCategory}`;
        render(submittedAnalysis, available);
        return;
      }
    }

    if (requestedCategory && available.some((item) => item.id === requestedCategory)) {
      await loadInsight(requestedCategory, available);
      return;
    }
    await loadOverview(available);
  } catch (error) {
    root.innerHTML = `<section class="comparison-error"><h1>Insights unavailable</h1><p>${escapeHtml(error.message)}</p><a href="/tracker.html">Go to Tracker</a></section>`;
  }
}

startInsights();
