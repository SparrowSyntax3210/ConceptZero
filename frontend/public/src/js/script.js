const setText = (selector, value) => {
  const element = document.querySelector(selector);
  if (element) element.textContent = value;
};

async function updateLandingStats() {
  try {
    const [categoryResponse, goalResponse, summaryResponse] = await Promise.all([
      fetch("/api/categories", { credentials: "same-origin" }),
      fetch("/api/goals?includeArchived=true", { credentials: "same-origin" }),
      fetch("/api/profile/summary", { credentials: "same-origin" }),
    ]);

    if (categoryResponse.ok) {
      const { categories = [] } = await categoryResponse.json();
      const completed = categories.filter((category) => category.completed).length;
      setText("#profile-count", `${completed}/4`);
    }

    if (goalResponse.ok) {
      const { goals = [] } = await goalResponse.json();
      const active = goals.filter((goal) => goal.active);
      const dateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      const today = dateKey(new Date());
      const completedToday = active.filter((goal) => goal.logs?.some((log) => log.date === today && log.completed)).length;
      const completedDates = new Set(active.flatMap((goal) => (goal.logs || []).filter((log) => log.completed).map((log) => log.date)));
      const cursor = new Date();
      cursor.setHours(0, 0, 0, 0);
      if (!completedDates.has(dateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
      let streak = 0;
      while (completedDates.has(dateKey(cursor))) {
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
      }
      setText("#landing-goal-count", String(active.length));
      setText("#landing-streak", String(streak));
      setText("#landing-today-count", String(completedToday));
      setText("#mobile-goal-count", String(active.length));
      setText("#mobile-streak", String(streak));
      setText("#mobile-today-count", String(completedToday));
    }

    if (summaryResponse.ok) {
      const { stats = {}, overallScore } = await summaryResponse.json();
      setText("#landing-weekly-score", Number.isFinite(stats.weeklyCompletionPct) ? `${stats.weeklyCompletionPct}%` : "—");
      setText("#profile-count-card", Number.isFinite(overallScore) ? `${overallScore}%` : "—");
    }
  } catch (error) {
    console.error("Could not load landing page summary:", error);
  }
}

updateLandingStats();

document.querySelectorAll('.topbar nav a[href^="#"]').forEach((link) => {
  link.addEventListener("click", () => {
    document.querySelectorAll(".topbar nav a").forEach((item) => item.classList.toggle("active", item === link));
  });
});

function initScrollAnimations() {
  if (!window.gsap || !window.ScrollTrigger) return;
  const { gsap, ScrollTrigger } = window;
  gsap.registerPlugin(ScrollTrigger);

  gsap.utils.toArray(".landing-section").forEach((section) => {
    const copy = section.querySelectorAll(
      ".section-intro > *, .insight-banner-copy > *, .closing-copy > *",
    );
    const visuals = section.querySelectorAll(
      ".story-card, .path-card, .step-card, .insight-chart-card, .goal-preview-list article, .goals-character, .summit-art",
    );
    const timeline = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: "top 78%",
        once: true,
      },
    });

    if (copy.length) {
      timeline.fromTo(
        copy,
        { autoAlpha: 0, y: 34 },
        { autoAlpha: 1, y: 0, duration: 0.65, stagger: 0.08, ease: "power2.out", immediateRender: false },
      );
    }
    if (visuals.length) {
      timeline.fromTo(
        visuals,
        { autoAlpha: 0, y: 48, scale: 0.96 },
        { autoAlpha: 1, y: 0, scale: 1, duration: 0.78, stagger: 0.11, ease: "power3.out", immediateRender: false },
        copy.length ? "-=0.2" : 0,
      );
    }
  });

  window.addEventListener("load", () => ScrollTrigger.refresh(), { once: true });
}

initScrollAnimations();
