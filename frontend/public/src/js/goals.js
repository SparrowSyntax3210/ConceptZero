const goalsList = document.querySelector("#goalsList");
const categoryLabels = {
  "health-fitness": "Health & Fitness",
  "mind-digital": "Mind & Digital Wellbeing",
  "academics-career": "Academics & Career Growth",
  "lifestyle-growth": "Lifestyle & Personal Growth",
};
const categoryIcons = { "health-fitness": "✣", "mind-digital": "◉", "academics-career": "▤", "lifestyle-growth": "✦" };
const goalCategories = Object.entries(categoryLabels).map(([id, label]) => ({ id, label }));
let activeGoalFilter = "all";
let goals = [];

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

function localKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getGoalProgress(goal, today) {
  const currentDate = new Date(`${today}T12:00:00`);
  const weekStart = new Date(currentDate);
  weekStart.setDate(currentDate.getDate() - currentDate.getDay());
  const weekStartKey = localKey(weekStart);
  const completedThisWeek = (goal.logs || []).filter((log) => log.completed && log.date >= weekStartKey && log.date <= today).length;
  const elapsedDays = Math.max(1, Math.floor((currentDate - weekStart) / 86400000) + 1);
  const target = goal.frequency === "weekly" ? Math.max(1, Number(goal.targetValue) || 1) : elapsedDays;
  return { count: completedThisWeek, target, percent: Math.min(100, Math.round((completedThisWeek / target) * 100)) };
}

function renderFilters() {
  const filters = document.querySelector("#goalFilters");
  filters.innerHTML = [{ id: "all", label: "All" }, ...goalCategories].map((category) => `<button type="button" class="goal-filter ${activeGoalFilter === category.id ? "active" : ""}" data-goal-filter="${category.id}">${esc(category.label)}</button>`).join("");
  filters.querySelectorAll("[data-goal-filter]").forEach((button) => button.addEventListener("click", () => {
    activeGoalFilter = button.dataset.goalFilter;
    render();
  }));
}

function render() {
  const today = localKey(new Date());
  const current = goals.filter((goal) => goal.active);
  const todayDone = current.filter((goal) => goal.logs?.some((log) => log.date === today && log.completed)).length;
  document.querySelector("#goalsTotal").textContent = String(current.length);
  document.querySelector("#goalsCompletedToday").textContent = String(todayDone);
  const rates = current.map((goal) => getGoalProgress(goal, today).percent);
  const weeklyRate = rates.length ? Math.round(rates.reduce((sum, rate) => sum + rate, 0) / rates.length) : null;
  document.querySelector("#goalsWeeklyRate").textContent = weeklyRate == null ? "—" : `${weeklyRate}%`;
  document.querySelector("#goalBannerTitle").textContent = weeklyRate == null ? "Small steps add up." : weeklyRate >= 75 ? "You’re building a strong rhythm." : "One check-in at a time.";
  document.querySelector("#goalBannerCopy").textContent = weeklyRate == null
    ? "Generate insights for any profile area and STACKED will create measurable goals for you."
    : `${todayDone} goal${todayDone === 1 ? "" : "s"} completed today. Keep checking in to build your consistency.`;

  renderFilters();
  const visibleGoals = activeGoalFilter === "all" ? current : current.filter((goal) => goal.categoryId === activeGoalFilter);
  if (!visibleGoals.length) {
    goalsList.innerHTML = `<div class="empty-state">${current.length ? "No goals in this area yet." : 'No AI goals yet. Complete a profile area in <a href="/tracker.html">Tracker</a>, then open <a href="/analysis.html">Insights</a> to generate personalized targets.'}</div>`;
    return;
  }

  goalsList.innerHTML = visibleGoals.map((goal) => {
    const progress = getGoalProgress(goal, today);
    const doneToday = goal.logs?.some((log) => log.date === today && log.completed);
    const label = categoryLabels[goal.categoryId] || goal.categoryId;
    return `<article class="goal-card goal-row">
      <div class="goal-art" role="img" aria-label="${esc(label)} illustration placeholder"><span>${categoryIcons[goal.categoryId] || "✦"}</span></div>
      <div class="goal-row-content"><div class="goal-row-title"><div><h3>${esc(goal.title)}</h3><p>Target: ${Number(goal.targetValue)} ${esc(goal.unit)} · ${goal.frequency === "weekly" ? "per week" : "daily"}</p></div><strong>${progress.percent}%</strong></div>
        <div class="goal-progress-track"><i style="width:${progress.percent}%"></i></div>
        <div class="goal-row-meta"><span>${esc(label)} · ${progress.count}/${progress.target} check-ins this week</span><span>${doneToday ? "Done today ✓" : "In progress"}</span></div>
        ${goal.reason ? `<small class="goal-reason">${esc(goal.reason)}</small>` : ""}
      </div>
      <button class="goal-menu" type="button" data-archive-goal="${goal._id}" aria-label="Remove ${esc(goal.title)}">···</button>
    </article>`;
  }).join("");
  goalsList.querySelectorAll("[data-archive-goal]").forEach((button) => button.addEventListener("click", () => archiveGoal(button.dataset.archiveGoal)));
}

async function loadGoals() {
  try {
    const response = await fetch("/api/goals", { credentials: "same-origin" });
    const result = await response.json();
    if (response.status === 401) return window.location.replace("/login.html");
    if (!response.ok) throw new Error(result.message || "Could not load goals.");
    goals = result.goals || [];
    render();
  } catch (error) {
    goalsList.innerHTML = `<div class="empty-state">${esc(error.message)}</div>`;
  }
}

async function archiveGoal(goalId) {
  if (!window.confirm("Remove this goal from your active list? Its check-in history will remain in your heatmap.")) return;
  try {
    const response = await fetch(`/api/goals/${encodeURIComponent(goalId)}`, { method: "DELETE", credentials: "same-origin" });
    if (response.status === 401) return window.location.replace("/login.html");
    if (!response.ok) {
      const result = await response.json();
      throw new Error(result.message || "Could not remove this goal.");
    }
    goals = goals.filter((goal) => goal._id !== goalId);
    render();
  } catch (error) {
    window.alert(error.message);
  }
}

loadGoals();
