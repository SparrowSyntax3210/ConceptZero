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

function initIntroAnimation() {
  const curtain = document.querySelector(".intro-curtain");
  if (!curtain) return;
  const removeCurtain = () => {
    document.body.classList.remove("intro-active");
    curtain.remove();
  };

  if (
    !window.gsap ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    removeCurtain();
    return;
  }

  document.body.classList.add("intro-active");
  const { gsap } = window;
  const leftBeam = curtain.querySelector(".intro-panel-left .intro-beam");
  const rightBeam = curtain.querySelector(".intro-panel-right .intro-beam");
  const timeline = gsap.timeline({
    defaults: { ease: "power2.inOut" },
    onComplete: () => {
      removeCurtain();
      window.ScrollTrigger?.refresh();
    },
  });

  timeline
    .fromTo(
      ".intro-brand",
      { autoAlpha: 0, scale: 0.86, filter: "blur(12px)" },
      { autoAlpha: 1, scale: 1, filter: "blur(0px)", duration: 0.55, ease: "power3.out" },
    )
    .fromTo(
      ".intro-tagline",
      { autoAlpha: 0, y: 10 },
      { autoAlpha: 1, y: 0, duration: 0.32, ease: "power2.out" },
      "-=0.2",
    )
    .to([leftBeam, rightBeam], { autoAlpha: 0.9, duration: 0.12 }, 0.52)
    .to(leftBeam, { x: "125vw", duration: 0.78, ease: "power2.inOut" }, 0.56)
    .to(rightBeam, { x: "-125vw", duration: 0.78, ease: "power2.inOut" }, 0.56)
    .to(".intro-brand", { textShadow: "0 0 42px #e7ffc8, 0 0 120px #c5f51a", duration: 0.2 }, 0.95)
    .to(".intro-tagline", { autoAlpha: 0, duration: 0.18 }, 1.12)
    .to(".intro-brand", { autoAlpha: 0, scale: 1.08, duration: 0.3 }, 1.22)
    .to(".intro-panel-left", { xPercent: -105, duration: 0.9, ease: "power4.inOut" }, 1.32)
    .to(".intro-panel-right", { xPercent: 105, duration: 0.9, ease: "power4.inOut" }, 1.32);
  timeline.timeScale(0.42);
}

initIntroAnimation();

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
  const approachSection = document.querySelector(".approach-section");
  if (habitSection && differenceSection) {
    const createHabitTransition = () => {
      const getTransitionShift = () => {
        const margin = parseFloat(getComputedStyle(habitSection).marginBottom) || 0;
        return -(habitSection.offsetHeight + margin);
      };
      const syncApproachPosition = () => {
        if (approachSection) approachSection.style.marginTop = `${getTransitionShift()}px`;
      };

      syncApproachPosition();
      ScrollTrigger.addEventListener("refreshInit", syncApproachPosition);
      gsap.set(habitSection, { transformOrigin: "center top" });
      gsap.set(differenceSection, { transformOrigin: "center center" });
      gsap.timeline({
        scrollTrigger: {
          trigger: habitSection,
          start: "top top",
          end: () => `+=${Math.round(window.innerHeight * 0.65)}`,
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
            y: getTransitionShift,
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

      return () => {
        ScrollTrigger.removeEventListener("refreshInit", syncApproachPosition);
        if (approachSection) approachSection.style.marginTop = "";
      };
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
      ".story-card, .path-card, .insight-chart-card, .goal-preview-list article, .goals-character, .summit-art",
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

    if (section.classList.contains("approach-section")) {
      const journeyCards = section.querySelectorAll(".step-card");
      if (journeyCards.length) {
        const journeyMotion = gsap.matchMedia();
        journeyMotion.add(
          "(min-width: 721px) and (prefers-reduced-motion: no-preference)",
          () => {
            const timeline = gsap.timeline({
              scrollTrigger: {
                trigger: section,
                start: "top top",
                end: () => `+=${Math.round(window.innerHeight * 1.35)}`,
                pin: true,
                pinSpacing: true,
                scrub: 0.9,
                anticipatePin: 1,
                invalidateOnRefresh: true,
              },
            });
            timeline.fromTo(
              journeyCards,
              {
                autoAlpha: 0,
                x: (index) =>
                  (index % 2 === 0 ? -1 : 1) * window.innerWidth * 0.9,
                y: (index) => (index % 2 === 0 ? 54 : -54),
                scale: 0.82,
                rotation: (index) => (index % 2 === 0 ? -7 : 7),
              },
              {
                autoAlpha: 1,
                x: 0,
                y: 0,
                scale: 1,
                rotation: 0,
                duration: 1,
                stagger: 0.17,
                ease: "power2.out",
              },
            );
          },
        );
        journeyMotion.add("(max-width: 720px) and (prefers-reduced-motion: no-preference)", () => {
          gsap.fromTo(
            journeyCards,
            { autoAlpha: 0, y: 32 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.65,
              stagger: 0.12,
              ease: "power2.out",
              scrollTrigger: { trigger: section, start: "top 76%", once: true },
            },
          );
        });
      }
    }
  });

  window.addEventListener("load", () => ScrollTrigger.refresh(), { once: true });
}

initScrollAnimations();
