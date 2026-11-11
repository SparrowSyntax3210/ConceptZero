const goalsRoot = document.querySelector("#todayGoals");
const areasRoot = document.querySelector("#trackerAreas");
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
  const completedCount = active.filter((goal) =>
    goal.logs?.some((log) => log.date === key && log.completed),
  ).length;
  document.querySelector("#todayCount").textContent =
    `${completedCount}/${active.length}`;
  document.querySelector("#activeCount").textContent = String(active.length);
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
  renderAreaCards();
  renderHeatmap();
  renderStreak();
}

function renderAreaCards() {
  areasRoot.innerHTML = trackerCategories
    .map((category) => {
      const areaGoals = goals.filter(
        (goal) => goal.active && goal.categoryId === category.id,
      );
      const done = areaGoals.filter((goal) =>
        goal.logs?.some(
          (log) => log.date === dateKey(selectedDate) && log.completed,
        ),
      ).length;
      return `<article class="tracker-area-card" data-open-profile="${category.id}" tabindex="0" role="link" aria-label="Open ${escapeHtml(category.label)} details form">
      <div class="tracker-area-art" role="img" aria-label="Illustration placeholder for ${escapeHtml(category.label)}"><span aria-hidden="true">${category.icon}</span></div>
      <div class="tracker-area-head"><small>${category.short} · ${areaGoals.length} GOALS</small><span class="tracker-area-count">${done}/${areaGoals.length} today</span></div>
      <h2>${category.label}</h2><p>${category.copy}</p>
      <div class="tracker-area-actions"><a href="/forms.html" data-profile-category="${category.id}">Update details ↗</a><a class="area-add" href="/analysis.html?category=${category.id}">View insights →</a></div>
    </article>`;
    })
    .join("");
  areasRoot
    .querySelectorAll("[data-profile-category]")
    .forEach((link) =>
      link.addEventListener("click", () =>
        localStorage.setItem(
          "selectedCategoryId",
          link.dataset.profileCategory,
        ),
      ),
    );
  areasRoot.querySelectorAll("[data-open-profile]").forEach((card) => {
    const open = () => {
      localStorage.setItem("selectedCategoryId", card.dataset.openProfile);
      window.location.assign("/forms.html");
    };
    card.addEventListener("click", (event) => {
      if (!event.target.closest("a,button")) open();
    });
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open();
      }
    });
  });
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
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(today.getDate() - today.getDay() - (26 * 7 - 1));
  const cells = [];
  for (let week = 0; week < 26; week += 1) {
    for (let day = 0; day < 7; day += 1) {
      const date = new Date(start);
      date.setDate(start.getDate() + week * 7 + day);
      if (date > today) continue;
      const key = dateKey(date);
      const eligible = goals.filter((goal) => {
        const created = dateKey(new Date(goal.createdAt));
        const archived = goal.archivedAt
          ? dateKey(new Date(goal.archivedAt))
          : null;
        return created <= key && (!archived || archived >= key);
      });
      const count = eligible.filter((goal) =>
        goal.logs?.some((log) => log.date === key && log.completed),
      ).length;
      const ratio = eligible.length ? count / eligible.length : 0;
      const level =
        count === 0
          ? 0
          : ratio < 0.25
            ? 1
            : ratio < 0.5
              ? 2
              : ratio < 0.75
                ? 3
                : 4;
      cells.push(
        `<span class="heat-cell" data-level="${level}" title="${escapeHtml(date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }))}: ${count}/${eligible.length} goals completed" aria-label="${key}: ${count} of ${eligible.length} goals"></span>`,
      );
    }
  }
  document.querySelector("#heatmap").innerHTML = cells.join("");
}

function renderStreak() {
  const active = goals.filter((goal) => goal.active);
  const dates = new Set(
    active.flatMap((goal) =>
      (goal.logs || []).filter((log) => log.completed).map((log) => log.date),
    ),
  );
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  if (!dates.has(dateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (dates.has(dateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  document.querySelector("#streakCount").textContent =
    `${streak} ${streak === 1 ? "day" : "days"}`;
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

document.querySelectorAll(".tracker-sidebar a[href^='#']").forEach((link) =>
  link.addEventListener("click", () => {
    document
      .querySelectorAll(".tracker-sidebar a")
      .forEach((item) => item.classList.toggle("active", item === link));
  }),
);

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
