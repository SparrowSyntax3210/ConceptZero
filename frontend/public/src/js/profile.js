const profileAreasRoot = document.querySelector("#profileAreaGrid");
const areaIcons = {
  "health-fitness": "♥",
  "mind-digital": "◉",
  "academics-career": "♧",
  "lifestyle-growth": "✦",
};

function esc(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ],
  );
}

function localDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatStat(value, suffix = "") {
  if (value == null || value === "") return "—";
  const number = Number(value);
  return Number.isFinite(number)
    ? `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(number)}${suffix}`
    : "—";
}

function areaDetail(area) {
  if (!area.completed || !area.quantities) return "No details yet";
  const first = Object.entries(area.quantities).find(
    ([, value]) => value != null,
  );
  if (!first)
    return area.satisfaction == null
      ? "Saved · add more details"
      : `Satisfaction · ${area.satisfaction}/10`;
  const [key, value] = first;
  const labels = {
    bmi: "BMI",
    dailySteps: "Steps/day",
    workoutsPerWeek: "Workouts/week",
    sleepHours: "Sleep hours",
    waterMlPerDay: "Water ml/day",
    screenTimeMinutesPerDay: "Screen minutes/day",
    mood: "Mood rating",
    stress: "Stress rating",
    relaxationSessionsPerWeek: "Relaxation/week",
    currentGradePct: "Current grade",
    weeklyStudyHours: "Study hours/week",
    attendancePct: "Attendance",
    skillsInProgress: "Skills in progress",
    planningDaysPerWeek: "Planning days/week",
    procrastinationDaysPerWeek: "Procrastination days/week",
    socialHoursPerWeek: "Social hours/week",
    goalProgressPct: "Goal progress",
  };
  return `${labels[key] || key} · ${formatStat(value)}`;
}

function renderProfile(data) {
  const user = data.user || {};
  const username = user.username || "STACKED member";
  document.querySelector("#profileName").textContent = username;
  document.querySelector("#profileEmail").textContent =
    user.email || "Email not available";
  document.querySelector("#profileInitial").textContent = username
    .charAt(0)
    .toUpperCase();
  document.querySelector("#navAvatar").textContent = username
    .charAt(0)
    .toUpperCase();

  const score = data.overallScore;
  document.querySelector("#overallScore").textContent = formatStat(
    score,
    score == null ? "" : "%",
  );
  document
    .querySelector("#overallScoreRing")
    .style.setProperty("--score", Number(score) || 0);
  document.querySelector("#overallScoreCaption").textContent =
    score == null
      ? "Complete a profile area to get your first score."
      : "Your score is based on the profile areas you’ve filled in.";

  const stats = data.stats || {};
  const streak = formatStat(stats.currentStreak);
  document.querySelector("#profileStreak").textContent = streak;
  document.querySelector("#statStreak").textContent = streak;
  document.querySelector("#statWeekly").textContent = formatStat(
    stats.weeklyCompletionPct,
    stats.weeklyCompletionPct == null ? "" : "%",
  );
  document.querySelector("#statGoals").textContent = formatStat(
    stats.activeGoals,
  );
  document.querySelector("#journeyWeekly").textContent = formatStat(
    stats.weeklyCompletionPct,
    stats.weeklyCompletionPct == null ? "" : "%",
  );

  const areas = data.profileAreas || [];
  profileAreasRoot.innerHTML = areas
    .map((area) => {
      const scoreValue = formatStat(area.score, area.score == null ? "" : "%");
      const status = area.completed ? areaDetail(area) : "Not filled yet";
      return `<article class="profile-area-card ${area.completed ? "" : "incomplete"}">
      <span class="profile-area-icon" role="img" aria-label="${esc(area.label)} icon placeholder">${areaIcons[area.id] || "✦"}</span>
      <h3>${esc(area.label)}</h3><div class="area-score">${scoreValue}<em>${area.score == null ? "" : " score"}</em></div>
      <p>${esc(status)}</p><a href="/tracker.html">${area.completed ? "View tracker" : "Add details"} →</a>
    </article>`;
    })
    .join("");
}

async function loadProfile() {
  try {
    const response = await fetch(
      `/api/profile/summary?date=${localDateKey(new Date())}`,
      { credentials: "same-origin" },
    );
    const result = await response.json();
    if (response.status === 401) return window.location.replace("/login.html");
    if (!response.ok)
      throw new Error(result.message || "Could not load your profile.");
    renderProfile(result);
  } catch (error) {
    profileAreasRoot.innerHTML = `<div class="profile-empty">${esc(error.message)}</div>`;
  }
}

document.querySelector("#profileLogout").addEventListener("click", async () => {
  const button = document.querySelector("#profileLogout");
  button.disabled = true;
  try {
    const response = await fetch("/api/users/logout", {
      method: "POST",
      credentials: "same-origin",
    });
    if (!response.ok) throw new Error("Could not log out.");
    window.location.replace("/");
  } catch (error) {
    button.disabled = false;
    button.textContent = error.message;
  }
});

loadProfile();
