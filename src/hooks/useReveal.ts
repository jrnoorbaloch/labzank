"use client";

import { RefObject, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * Non-scrubbed reveal for the brand sections below the film: every
 * [data-reveal] inside `root` gets `.in` once it crosses 82% of the viewport.
 * A small stagger comes from data-delay (seconds) on each element.
 */
export function useReveal(root: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!root.current) return;
    const els = [...root.current.querySelectorAll<HTMLElement>("[data-reveal]")];
    const triggers = els.map((el) =>
      ScrollTrigger.create({
        trigger: el,
        start: "top 88%",
        once: true,
        onEnter: () => {
          const d = parseFloat(el.dataset.delay || "0");
          el.style.transitionDelay = `${d}s`;
          el.classList.add("in");
        },
      })
    );
    // fallback: ScrollTrigger callbacks can be skipped on instant jumps (anchor
    // links) or in throttled tabs — reveal anything on screen on every scroll
    const revealNow = () =>
      root.current?.querySelectorAll<HTMLElement>("[data-reveal]:not(.in)").forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top < innerHeight * 0.92 && r.bottom > 0) el.classList.add("in");
      });
    addEventListener("scroll", revealNow, { passive: true });
    return () => {
      triggers.forEach((t) => t.kill());
      removeEventListener("scroll", revealNow);
    };
  }, [root]);
}
