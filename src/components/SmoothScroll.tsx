"use client";

/**
 * Locomotive Scroll v5 (Lenis inside) driving smooth scrolling and data-scroll parallax,
 * ticked by GSAP so ScrollTrigger animations stay in sync. Skipped for people who
 * prefer reduced motion. Used on the public reading pages, not in admin.
 */

import { ReactNode, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "locomotive-scroll/dist/locomotive-scroll.css";

gsap.registerPlugin(ScrollTrigger);

export default function SmoothScroll({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let destroyed = false;
    let instance: { destroy: () => void; start?: () => void; stop?: () => void } | null = null;
    const onSearch = (e: Event) => {
      // the search overlay is a fixed layer: pause page scrolling while it is open
      const open = (e as CustomEvent<boolean>).detail;
      if (open) instance?.stop?.();
      else instance?.start?.();
    };
    (async () => {
      const { default: LocomotiveScroll } = await import("locomotive-scroll");
      if (destroyed) return;
      instance = new LocomotiveScroll({
        lenisOptions: { lerp: 0.1, smoothWheel: true, anchors: { offset: -70 } },
        scrollCallback: () => ScrollTrigger.update(),
        initCustomTicker: (render) => gsap.ticker.add(render),
        destroyCustomTicker: (render) => gsap.ticker.remove(render),
      });
      gsap.ticker.lagSmoothing(0);
      ScrollTrigger.refresh();
    })();
    addEventListener("labzaank:search-open", onSearch);
    return () => {
      destroyed = true;
      removeEventListener("labzaank:search-open", onSearch);
      instance?.destroy();
    };
  }, []);
  return <>{children}</>;
}
