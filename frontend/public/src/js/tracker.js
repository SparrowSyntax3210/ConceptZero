const goalsRoot = document.querySelector("#todayGoals");
const filtersRoot = document.querySelector("#trackerFilters");
const trackerCategories = [
  {
    id: "health-fitness",
    label: "Health & Fitness",
    short: "HEALTH",
    icon: "✣",
    copy: "Build routines for energy, movement, sleep, and nutrition.",
  },
  {
    id: "mind-digital",
    label: "Mind & Digital Wellbeing",
    short: "MIND",
    icon: "◉",
    copy: "Make more room for focus, calm, and intentional screen use.",
  },
  {
    id: "academics-career",
    label: "Academics & Career Growth",
    short: "LEARNING",
    icon: "▤",
    copy: "Turn study and career practice into steady progress.",
  },
  {
    id: "lifestyle-growth",
    label: "Lifestyle & Personal Growth",
    short: "LIFESTYLE",
    icon: "✦",
    copy: "Build consistency around your time and personal goals.",
  },
];
let goals = [];
let activeFilter = "all";
let selectedDate = new Date();
selectedDate.setHours(0, 0, 0, 0);

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ],
  );
}

function updateDateLabels() {
  const today = dateKey(new Date());
  const selected = dateKey(selectedDate);
  document.querySelector("#selectedDateShort").textContent =
    selectedDate.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  document.querySelector("#selectedDateLabel").textContent =
    selected === today
      ? "Today’s check-in"
      : selectedDate.toLocaleDateString(undefined, {
          weekday: "long",
          month: "long",
          day: "numeric",
        });
  document.querySelector("#nextDay").disabled = selected >= today;
}

function renderToday() {
  const active = goals.filter((goal) => goal.active);
  const key = dateKey(selectedDate);
  const visibleGoals =
    activeFilter === "all"
      ? active
      : active.filter((goal) => goal.categoryId === activeFilter);
  goalsRoot.innerHTML = visibleGoals.length
    ? visibleGoals
        .map((goal) => {
          const log = goal.logs?.find((item) => item.date === key);
          return `<label class="tracker-goal">
      <input type="checkbox" data-goal-check="${goal._id}" ${log?.completed ? "checked" : ""} aria-label="Mark ${escapeHtml(goal.title)} complete" />
      <span><h3>${escapeHtml(goal.title)}</h3><p>${numberText(goal.targetValue)} ${escapeHtml(goal.unit)} · ${goal.frequency} target</p></span>
      <input class="actual-value" type="number" min="0" step="any" inputmode="decimal" placeholder="Actual (opt.)" value="${log?.actualValue ?? ""}" data-actual="${goal._id}" aria-label="Actual amount for ${escapeHtml(goal.title)}" />
    </label>`;
        })
        .join("")
    : `<div class="empty-state">No ${activeFilter === "all" ? "active" : "saved"} goals in this view yet. Complete a profile area, then open <a href="/analysis.html${activeFilter === "all" ? "" : `?category=${encodeURIComponent(activeFilter)}`}">Insights</a> to generate AI targets.</div>`;

  goalsRoot.querySelectorAll("[data-goal-check]").forEach((checkbox) => {
    checkbox.addEventListener("change", () =>
      saveCheckin(checkbox.dataset.goalCheck, checkbox.checked),
    );
  });
  updateDateLabels();
  renderHeatmap();
  renderProgressLine();
}

function renderFilters() {
  filtersRoot.innerHTML = [
    { id: "all", label: "All areas" },
    ...trackerCategories.map(({ id, label }) => ({ id, label })),
  ]
    .map(
      (category) =>
        `<button type="button" class="tracker-filter ${activeFilter === category.id ? "active" : ""}" data-tracker-filter="${category.id}">${category.label}</button>`,
    )
    .join("");
  filtersRoot.querySelectorAll("[data-tracker-filter]").forEach((button) =>
    button.addEventListener("click", () => {
      activeFilter = button.dataset.trackerFilter;
      renderFilters();
      renderToday();
    }),
  );
}

function numberText(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric)
    ? new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(
        numeric,
      )
    : "—";
}

async function saveCheckin(goalId, completed) {
  const checkbox = goalsRoot.querySelector(`[data-goal-check="${goalId}"]`);
  const actualInput = goalsRoot.querySelector(`[data-actual="${goalId}"]`);
  checkbox.disabled = true;
  try {
    const actualValue =
      actualInput.value === "" ? undefined : Number(actualInput.value);
    const response = await fetch(
      `/api/goals/${encodeURIComponent(goalId)}/checkin`,
      {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: dateKey(selectedDate),
          completed,
          ...(actualValue !== undefined ? { actualValue } : {}),
        }),
      },
    );
    const result = await response.json();
    if (response.status === 401) return window.location.replace("/login.html");
    if (!response.ok)
      throw new Error(result.message || "Could not save this check-in.");
    goals = goals.map((goal) => (goal._id === goalId ? result.goal : goal));
    renderToday();
  } catch (error) {
    console.error(error);
    checkbox.checked = !completed;
    checkbox.disabled = false;
    window.alert(error.message);
  }
}

function renderHeatmap() {
  const heatmap = document.querySelector("#monthHeatmap");
  const monthLabel = document.querySelector("#monthHeatmapLabel");
  if (!heatmap || !monthLabel) return;

  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selectedKey = dateKey(selectedDate);
  monthLabel.textContent = selectedDate.toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });

  heatmap.innerHTML = Array.from({ length: daysInMonth }, (_, index) => {
    const date = new Date(year, month, index + 1);
    const key = dateKey(date);
    const future = date > today;
    const { completed, total } = future
      ? { completed: 0, total: 0 }
      : getGoalCompletion(date);
    const ratio = total ? completed / total : 0;
    const level =
      completed === 0
        ? 0
        : ratio < 0.25
          ? 1
          : ratio < 0.5
            ? 2
            : ratio < 0.75
              ? 3
              : 4;
    const label = date.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    return `<button class="tracker-month-dot" type="button" data-month-date="${key}" data-level="${level}" ${key === selectedKey ? 'aria-current="date"' : ""} ${future ? "disabled" : ""} title="${escapeHtml(label)}: ${completed}/${total} goals completed" aria-label="${escapeHtml(label)}: ${completed} of ${total} goals completed">${index + 1}</button>`;
  }).join("");

  heatmap.querySelectorAll("[data-month-date]").forEach((dot) =>
    dot.addEventListener("click", () => {
      const [dotYear, dotMonth, dotDay] = dot.dataset.monthDate
        .split("-")
        .map(Number);
      selectedDate = new Date(dotYear, dotMonth - 1, dotDay);
      renderToday();
    }),
  );
}

function getGoalCompletion(date) {
  const key = dateKey(date);
  const eligible = goals.filter((goal) => {
    const created = dateKey(new Date(goal.createdAt));
    const archived = goal.archivedAt ? dateKey(new Date(goal.archivedAt)) : null;
    return created <= key && (!archived || archived >= key);
  });
  const completed = eligible.filter((goal) =>
    goal.logs?.some((log) => log.date === key && log.completed),
  ).length;
  return { completed, total: eligible.length };
}

function renderProgressLine() {
  const line = document.querySelector("#trackerProgressLine");
  const area = document.querySelector("#trackerProgressArea");
  const points = document.querySelector("#trackerProgressPoints");
  const labels = document.querySelector("#trackerChartLabels");
  if (!line || !area || !points || !labels) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));
    const { completed, total } = getGoalCompletion(date);
    return {
      date,
      completed,
      total,
      percent: total ? Math.round((completed / total) * 100) : 0,
    };
  });
  const xAt = (index) => 28 + index * (644 / 6);
  const yAt = (percent) => 158 - percent * 1.25;
  const path = days
    .map((day, index) => `${index ? "L" : "M"}${xAt(index)} ${yAt(day.percent)}`)
    .join(" ");
  line.setAttribute("d", path);
  area.setAttribute(
    "d",
    `${path} L${xAt(days.length - 1)} 160 L${xAt(0)} 160 Z`,
  );
  points.innerHTML = days
    .map(
      (day, index) =>
        `<circle cx="${xAt(index)}" cy="${yAt(day.percent)}" r="5"><title>${escapeHtml(day.date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" }))}: ${day.percent}% (${day.completed}/${day.total})</title></circle>`,
    )
    .join("");
  labels.innerHTML = days
    .map(
      (day) =>
        `<span>${escapeHtml(day.date.toLocaleDateString(undefined, { weekday: "short" }))}</span>`,
    )
    .join("");
  const weeklyAverage = Math.round(
    days.reduce((sum, day) => sum + day.percent, 0) / days.length,
  );
  document.querySelector("#progressSummary").textContent =
    `${weeklyAverage}% average goal completion · last 7 days`;
}

document.querySelector("#previousDay").addEventListener("click", () => {
  selectedDate.setDate(selectedDate.getDate() - 1);
  renderToday();
});
document.querySelector("#nextDay").addEventListener("click", () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (selectedDate < today) selectedDate.setDate(selectedDate.getDate() + 1);
  renderToday();
});

async function loadGoals() {
  try {
    const response = await fetch("/api/goals?includeArchived=true", {
      credentials: "same-origin",
    });
    const result = await response.json();
    if (response.status === 401) return window.location.replace("/login.html");
    if (!response.ok)
      throw new Error(result.message || "Could not load goals.");
    goals = result.goals || [];
    renderFilters();
    renderToday();
  } catch (error) {
    goalsRoot.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
  }
}

loadGoals();
