const accountButton = document.querySelector("#accountButton");
const logoutButton = document.querySelector("#logoutButton");
const avatarInitial = document.querySelector("#avatarInitial");
const welcomeLabel = document.querySelector("#welcomeLabel");
const completedCategories = document.querySelector("#completedCategories");
const goalCountElement = document.querySelector("#heroGoalCount");
const todayCountElement = document.querySelector("#heroTodayCount");
const streakElement = document.querySelector("#heroStreak");

let statusReady = false;

async function loadDashboard() {
  accountButton.disabled = true;

  try {
    const response = await fetch("/api/users/status", {
      credentials: "same-origin",
    });
    if (!response.ok) throw new Error("Could not check account status");

    const { authenticated, user } = await response.json();
    if (!authenticated || !user) {
      window.location.replace("/login.html");
      return;
    }

    document.body.dataset.userId = user.id;
    welcomeLabel.textContent = `WELCOME BACK, ${user.username.toUpperCase()}`;
    avatarInitial.textContent = user.username.charAt(0).toUpperCase();
    accountButton.setAttribute("aria-label", `Account for ${user.username}`);
    loadCategoryStatus();
    loadGoalSnapshot();
  } catch (error) {
    console.error(error);
    welcomeLabel.textContent = "YOUR PERSONAL DASHBOARD";
  } finally {
    statusReady = true;
    accountButton.disabled = false;
  }
}

accountButton.addEventListener("click", () => {
  if (!statusReady) return;
  logoutButton.hidden = !logoutButton.hidden;
  accountButton.setAttribute("aria-expanded", String(!logoutButton.hidden));
});

logoutButton.addEventListener("click", async () => {
  try {
    const response = await fetch("/api/users/logout", {
      method: "POST",
      credentials: "same-origin",
    });
    if (!response.ok) throw new Error("Could not log out");
    window.location.replace("/");
  } catch (error) {
    console.error(error);
    logoutButton.textContent = "Try logging out again";
  }
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".account-control")) {
    logoutButton.hidden = true;
    accountButton.setAttribute("aria-expanded", "false");
  }
});

loadDashboard();

async function loadCategoryStatus() {
  try {
    const response = await fetch("/api/categories", { credentials: "same-origin" });
    if (!response.ok) return;
    const { categories } = await response.json();
    const completed = categories.filter((category) => category.completed).length;
    completedCategories.textContent = `${completed}/4`;
  } catch (error) {
    console.error("Could not load category completion:", error);
  }
}

function localDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

async function loadGoalSnapshot() {
  try {
    const response = await fetch("/api/goals?includeArchived=true", { credentials: "same-origin" });
    if (!response.ok) return;
    const { goals = [] } = await response.json();
    const active = goals.filter((goal) => goal.active);
    const today = localDateKey(new Date());
    const completeToday = active.filter((goal) => goal.logs?.some((entry) => entry.date === today && entry.completed)).length;
    goalCountElement.textContent = `${active.length} active`;
    todayCountElement.textContent = `${completeToday} completed`;

    const completedDates = new Set(active.flatMap((goal) => (goal.logs || []).filter((entry) => entry.completed).map((entry) => entry.date)));
    const cursor = new Date(); cursor.setHours(0, 0, 0, 0);
    if (!completedDates.has(localDateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
    let streak = 0;
    while (completedDates.has(localDateKey(cursor))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    streakElement.textContent = `${streak} ${streak === 1 ? "day" : "days"} streak`;
  } catch (error) {
    console.error("Could not load goal summary:", error);
  }
}

function openCategoryForm(tile) {
  const categoryId = tile.dataset.categoryId;
  if (!categoryId) return;
  localStorage.setItem("selectedCategoryId", categoryId);
  localStorage.setItem("selectedCategoryFieldId", tile.id || categoryId);
  window.location.href = "/forms.html";
}

document.querySelectorAll("[data-category-id]").forEach((tile) => {
  tile.addEventListener("click", () => openCategoryForm(tile));
  tile.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openCategoryForm(tile);
    }
  });
});
