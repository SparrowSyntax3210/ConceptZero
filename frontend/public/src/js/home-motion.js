(() => {
  const gsap = window.gsap;
  if (!gsap || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (window.ScrollTrigger) gsap.registerPlugin(window.ScrollTrigger);

  const hero = document.querySelector(".dashboard-hero");
  if (!hero) return;
  document.documentElement.classList.add("home-motion-ready");
  const revealTargets = [
    ".welcome-copy > *",
    ".character-stage .hero-person",
    ".character-stage .current-state-pill",
    ".character-stage .hero-insight-card",
    ".character-stage .hero-score-card",
    ".home-section-intro",
    ".home-habit-card",
    ".comparison-preview",
    ".runner-score",
    ".journey-steps > *",
    ".home-insights-band > *",
    ".home-community > *",
    ".home-final-cta > :not(img)",
  ].join(",");
  const elements = gsap.utils.toArray(revealTargets);
  gsap.set(elements, { autoAlpha: 0, y: 20 });

  const heroItems = gsap.utils.toArray(
    ".welcome-copy > *, .character-stage .hero-person, .character-stage .current-state-pill, .character-stage .hero-insight-card, .character-stage .hero-score-card",
  );
  gsap.to(heroItems, {
    autoAlpha: 1,
    y: 0,
    duration: 0.85,
    stagger: 0.075,
    ease: "power3.out",
    delay: 0.12,
  });

  if (window.ScrollTrigger) {
    gsap.utils.toArray(".home-habits, .home-comparison, .home-journey, .home-insights-band, .home-community, .home-final-cta").forEach((section) => {
      const sectionItems = section.querySelectorAll(
        ".home-section-intro, .home-habit-card, .comparison-preview, .runner-score, .journey-steps > *, .home-insights-band > *, .home-community > *, .home-final-cta > :not(img)",
      );
      gsap.fromTo(
        sectionItems,
        { autoAlpha: 0, y: 28 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.7,
          stagger: 0.08,
          ease: "power2.out",
          scrollTrigger: {
            trigger: section,
            start: "top 82%",
            once: true,
          },
        },
      );
    });
  } else {
    gsap.to(elements, { autoAlpha: 1, y: 0, duration: 0.65, stagger: 0.05 });
  }

  gsap.to(".stage-glow", {
    opacity: 0.82,
    scale: 1.06,
    duration: 3,
    repeat: -1,
    yoyo: true,
    ease: "sine.inOut",
  });
})();
