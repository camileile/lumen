"use client";

import { useEffect } from "react";

const VISIBLE_ATTRIBUTE = "data-visible";

export function LandingMotion() {
  useEffect(() => {
    const page = document.querySelector<HTMLElement>("#landing-page");
    if (!page) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const revealElements = Array.from(page.querySelectorAll<HTMLElement>("[data-reveal]"));

    page.dataset.motionReady = "true";

    if (reduceMotion || !("IntersectionObserver" in window)) {
      revealElements.forEach((element) => element.setAttribute(VISIBLE_ATTRIBUTE, "true"));
      page.style.setProperty("--scroll-progress", "1");
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const hasReachedViewport = entry.boundingClientRect.top < window.innerHeight * 0.92;
          if (!entry.isIntersecting && !hasReachedViewport) return;
          entry.target.setAttribute(VISIBLE_ATTRIBUTE, "true");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );

    revealElements.forEach((element) => observer.observe(element));

    let animationFrame = 0;
    const updateProgress = () => {
      animationFrame = 0;
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
      page.style.setProperty("--scroll-progress", progress.toFixed(4));
    };
    const onScroll = () => {
      if (!animationFrame) animationFrame = window.requestAnimationFrame(updateProgress);
    };

    updateProgress();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      delete page.dataset.motionReady;
    };
  }, []);

  return null;
}
