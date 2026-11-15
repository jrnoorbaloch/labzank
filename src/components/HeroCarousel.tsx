"use client";

/**
 * Image carousel hero. Slides come from Admin → Literature → Hero slider
 * (hero_slides). A slide without an uploaded image uses the built-in artwork
 * for its position. Autoplays, pauses on hover/focus, swipes on touch.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Tx, useLang } from "@/lib/i18n";
import { heroArt } from "@/lib/content";
import { useContent } from "@/lib/content-store";
import { page, PageName } from "@/lib/links";

const INTERVAL = 6500;

function href(h: string) {
  if (h.startsWith("@")) return page(h.slice(1) as PageName);
  return h;
}

export default function HeroCarousel() {
  const { heroSlides } = useContent();
  const { pick } = useLang();
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const touch = useRef<number | null>(null);
  const n = heroSlides.length;
  const go = useCallback((d: number) => setI((x) => (x + d + n) % n), [n]);

  useEffect(() => {
    if (i >= n) setI(0);
  }, [n, i]);
  useEffect(() => {
    if (paused || n < 2 || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setTimeout(() => go(1), INTERVAL);
    return () => clearTimeout(id);
  }, [i, paused, n, go]);

  if (!n) return null;
  return (
    <section
      id="top"
      className="relative overflow-hidden bg-[var(--ink-2)]"
      aria-roledescription="carousel"
      aria-label="Featured"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touch.current === null) return;
        const dx = e.changedTouches[0].clientX - touch.current;
        if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
        touch.current = null;
      }}
      data-hero
    >
      <div className="relative h-[480px] md:h-[clamp(380px,36vw,540px)]">
        {heroSlides.map((s, k) => {
          const img = s.image ?? heroArt[k % heroArt.length];
          const on = k === i;
          return (
            <div
              key={k}
              className={`absolute inset-0 transition-opacity duration-700 ${on ? "opacity-100" : "pointer-events-none opacity-0"}`}
              aria-hidden={!on}
              role="group"
              aria-roledescription="slide"
              aria-label={`${k + 1} / ${n}`}
              data-slide={k}
            >
              {/* phones: artwork on top, text below; wider screens: text over the calm right side */}
              <picture className="absolute inset-x-0 top-0 block h-[210px] overflow-hidden md:inset-0 md:h-full">
                {s.imageMobile && <source media="(max-width: 767px)" srcSet={s.imageMobile} />}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img} alt="" className="h-full w-full object-cover object-left" loading={k === 0 ? "eager" : "lazy"} />
              </picture>
              <div className="absolute inset-x-0 bottom-0 top-[210px] flex flex-col items-center justify-center bg-[#faf6ee] px-6 pb-8 text-center md:inset-y-0 md:left-auto md:right-[5%] md:top-0 md:w-[48%] md:bg-transparent md:pb-0">
                <Tx
                  v={s.heading}
                  as="h1"
                  className="display text-[clamp(30px,4.2vw,64px)] text-[#5c3d0e]"
                />
                {pick(s.description).text && (
                  <Tx v={s.description} as="p" className="mt-3 max-w-[40ch] text-[clamp(15px,1.35vw,20px)] leading-relaxed text-[#3d3427]" />
                )}
                {s.cta && (
                  <a href={href(s.cta.href)} tabIndex={on ? 0 : -1} className="mt-6 inline-flex items-center rounded-full bg-[#3b4a1f] px-7 py-2.5 text-[16px] font-medium tracking-wide text-[#f3e3b5] shadow-[0_10px_24px_-12px_rgba(0,0,0,.6)] transition hover:bg-[#2c3816]">
                    <Tx v={s.cta.label} />
                  </a>
                )}
              </div>
            </div>
          );
        })}

        {n > 1 && (
          <>
            <button onClick={() => go(-1)} className="absolute left-3 top-[105px] grid h-10 w-10 -translate-y-1/2 md:top-1/2 place-items-center rounded-md bg-white/70 text-[var(--text)] shadow hover:bg-white" aria-label="Previous slide">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 6-6 6 6 6" /></svg>
            </button>
            <button onClick={() => go(1)} className="absolute right-3 top-[105px] grid h-10 w-10 -translate-y-1/2 md:top-1/2 place-items-center rounded-md bg-white/70 text-[var(--text)] shadow hover:bg-white" aria-label="Next slide">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 6 6 6-6 6" /></svg>
            </button>
            <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2" dir="ltr">
              {heroSlides.map((_, k) => (
                <button
                  key={k}
                  onClick={() => setI(k)}
                  className={`h-2 rounded-full transition-all ${k === i ? "w-6 bg-[var(--gold)]" : "w-2 bg-[#3d3427]/30 hover:bg-[#3d3427]/50"}`}
                  aria-label={`Slide ${k + 1}`}
                  aria-current={k === i}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
