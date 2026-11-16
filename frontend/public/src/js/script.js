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

  gsap.fromTo(
    [
      ".topbar .brand",
      ".topbar nav a",
      ".topbar .account-control > *",
      ".copy-block > *",
      ".stage .side-character",
      ".stage .center-fallback",
      ".stage .state-pill",
      ".stage .hero-asset",
      ".hero > .mini-note",
      ".hero-bottom-asset",
    ].join(","),
    { autoAlpha: 0, y: 18 },
    {
      autoAlpha: 1,
      y: 0,
      duration: 0.75,
      stagger: 0.045,
      ease: "power3.out",
      delay: 0.12,
      immediateRender: false,
    },
  );

  gsap.to(".orbit", {
    opacity: 0.45,
    duration: 3.2,
    repeat: -1,
    yoyo: true,
    ease: "sine.inOut",
  });

  const hero = document.querySelector(".hero");
  if (hero) {
    const heroContent = hero.querySelectorAll(
      ".wordmark, .copy-block, .stage, .mini-note, .hero-bottom-asset, .bot, .bot-note, .edge-orbit, .scroll-cue",
    );
    gsap.timeline({
      scrollTrigger: {
        trigger: hero,
        start: "top top",
        end: () => `+=${Math.round(window.innerHeight * 1.05)}`,
        pin: true,
        pinSpacing: true,
        scrub: 0.7,
        invalidateOnRefresh: true,
        anticipatePin: 1,
      },
    }).to(heroContent, {
      autoAlpha: 0,
      y: -34,
      scale: 0.985,
      stagger: 0.015,
      ease: "none",
      duration: 0.76,
    }).to(hero, { autoAlpha: 0, ease: "none", duration: 0.24 }, 0.76);
  }

  const habitSection = document.querySelector(".habit-section");
  const differenceSection = document.querySelector(".difference-section");
  if (habitSection && differenceSection) {
    const createHabitTransition = () => {
      gsap.set(habitSection, { transformOrigin: "center top" });
      gsap.set(differenceSection, { transformOrigin: "center center" });
      gsap.timeline({
        scrollTrigger: {
          trigger: habitSection,
          start: "top top",
          end: () => `+=${Math.round(window.innerHeight * 1.25)}`,
          pin: true,
          pinSpacing: true,
          scrub: 0.8,
          invalidateOnRefresh: true,
          anticipatePin: 1,
        },
      })
        .fromTo(
          differenceSection,
          {
            autoAlpha: 0,
            scale: 0.78,
            y: 0,
            borderRadius: 42,
          },
          {
            autoAlpha: 1,
            scale: 1,
            y: () => {
              const margin = parseFloat(
                getComputedStyle(habitSection).marginBottom,
              ) || 0;
              return -(habitSection.offsetHeight + margin);
            },
            borderRadius: 0,
            ease: "none",
            duration: 1,
          },
          0,
        )
        .to(
          habitSection,
          { autoAlpha: 0, scale: 0.975, ease: "none", duration: 0.42 },
          0.58,
        );
    };
    gsap
      .matchMedia()
      .add("(min-width: 721px) and (prefers-reduced-motion: no-preference)", createHabitTransition);
  }

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
