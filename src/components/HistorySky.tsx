"use client";

/**
 * "A sky of voices" — the history of Balochi literature as a constellation.
 * Every poet is a star (node), placed in time order from left to right and joined by a
 * line; an era axis runs underneath. On wide screens the section pins while scrolling and
 * GSAP lights the stars one by one and draws the line; on phones the sky runs top to bottom.
 * Stars are links to the poet's profile and show a card on hover/focus.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Tx, useLang } from "@/lib/i18n";
import type { DictKey } from "@/lib/dict";
import type { Poet } from "@/lib/content";
import { useContent } from "@/lib/content-store";
import { page } from "@/lib/links";

gsap.registerPlugin(ScrollTrigger);

type Era = "classical" | "modern" | "contemporary";
const ERA_LABEL: Record<Era, DictKey> = { classical: "s.poets.classical", modern: "s.poets.modern", contemporary: "hist.contemporary" };
const ERA_ORDER: Era[] = ["classical", "modern", "contemporary"];

/** "1914–1983" → 1914 · "18th c." → 1750 · "c. 1830" → 1830 */
function startYear(years: string): number | null {
  const y = years.match(/\b(1\d{3}|20\d{2})\b/);
  if (y) return +y[1];
  const c = years.match(/(\d{1,2})(st|nd|rd|th)\s*c/i);
  if (c) return (+c[1] - 1) * 100 + 50;
  return null;
}

function eraOf(p: Poet, year: number | null): Era {
  if (p.period === "classical") return "classical";
  if ((p.period as string) === "contemporary" || (year !== null && year >= 1960)) return "contemporary";
  return "modern";
}

function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

export default function HistorySky() {
  const { poets } = useContent();
  const { t } = useLang();
  const root = useRef<HTMLElement>(null);
  const [wide, setWide] = useState(true);
  const [hover, setHover] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 1000, h: 400 });
  useEffect(() => {
    if (!box.current) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width || 1000, h: e.contentRect.height || 400 }));
    ro.observe(box.current);
    return () => ro.disconnect();
  }, [wide]);

  useEffect(() => {
    const m = matchMedia("(min-width: 900px)");
    const f = () => setWide(m.matches);
    f();
    m.addEventListener("change", f);
    return () => m.removeEventListener("change", f);
  }, []);

  // chronological nodes
  const nodes = useMemo(() => {
    const list = poets
      .map((p) => ({ p, year: startYear(p.years) }))
      .sort((a, b) => (a.year ?? 9999) - (b.year ?? 9999))
      .slice(0, 16)
      .map((n) => ({ ...n, era: eraOf(n.p, n.year) }));
    const n = list.length;
    return list.map((x, i) => {
      // wide: x by order across the sky, y in a gentle zig-zag; narrow: y by order, x alternating
      const wx = n === 1 ? 50 : 8 + (84 * i) / (n - 1);
      const wy = 44 + Math.sin(i * 1.9 + 0.6) * 15 + (i % 2 ? 4 : -4);
      const nx = i % 2 ? 70 + Math.sin(i * 2.3) * 8 : 28 + Math.cos(i * 1.7) * 8;
      const ny = n === 1 ? 50 : 6 + (88 * i) / (n - 1);
      return { ...x, i, wx, wy, nx, ny };
    });
  }, [poets]);

  // era axis segments, sized by how many stars fall in each era
  const eras = useMemo(() => {
    const out: { era: Era; from: number; to: number }[] = [];
    for (const e of ERA_ORDER) {
      const idx = nodes.filter((n) => n.era === e).map((n) => n.i);
      if (!idx.length) continue;
      out.push({ era: e, from: Math.min(...idx), to: Math.max(...idx) });
    }
    return out;
  }, [nodes]);

  const sky = useMemo(() => {
    const r = rng(11);
    return Array.from({ length: 170 }, () => ({ x: r() * 100, y: r() * 100, s: r() * 1.3 + 0.3, o: r() * 0.6 + 0.15 }));
  }, []);

  useEffect(() => {
    if (!root.current || !nodes.length) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ctx = gsap.context(() => {
      if (reduce) {
        gsap.set(".hs-star, .hs-label, .hs-era", { opacity: 1, scale: 1 });
        gsap.set(".hs-line", { strokeDashoffset: 0 });
        return;
      }
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: wide
          ? { trigger: ".hs-stage", start: "top 60px", end: `+=${Math.max(120, nodes.length * 22)}%`, pin: true, scrub: 0.6, invalidateOnRefresh: true }
          : { trigger: ".hs-stage", start: "top 75%", end: "bottom 60%", scrub: 0.6 },
      });
      tl.fromTo(".hs-head > *", { opacity: 0, y: 24 }, { opacity: 1, y: 0, stagger: 0.08, duration: 0.6, ease: "power2.out" }, 0);
      const step = 1;
      nodes.forEach((_, i) => {
        const at = 0.4 + i * step;
        tl.fromTo(`.hs-star-${i}`, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.35, ease: "back.out(3)" }, at)
          .fromTo(`.hs-label-${i}`, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" }, at + 0.15);
      });
      tl.fromTo(".hs-line", { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: Math.max(0.4, (nodes.length - 1) * step) }, 0.55);
      tl.fromTo(".hs-era", { opacity: 0, scaleX: 0 }, { opacity: 1, scaleX: 1, stagger: 0.4, duration: 0.6, ease: "power2.out", transformOrigin: "0% 50%" }, 0.4);
      tl.to({}, { duration: 0.6 }); // a beat at the end before unpinning
    }, root);
    const id = setTimeout(() => ScrollTrigger.refresh(), 200);
    return () => {
      clearTimeout(id);
      ctx.revert();
    };
  }, [nodes, wide]);

  if (!nodes.length) return null;
  const pos = (n: (typeof nodes)[number]) => (wide ? { x: n.wx, y: n.wy } : { x: n.nx, y: n.ny });
  const path = nodes.map((n, i) => `${i ? "L" : "M"} ${((pos(n).x / 100) * size.w).toFixed(1)} ${((pos(n).y / 100) * size.h).toFixed(1)}`).join(" ");

  return (
    <section ref={root} id="history" className="relative bg-[#110e0b] text-[#f3eadb]" aria-labelledby="history-title" data-history>
      <div className={`hs-stage relative w-full overflow-hidden ${wide ? "h-[calc(100svh-60px)] min-h-[600px]" : ""}`}>
        {/* night sky */}
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 90% 70% at 50% 115%, #3a2414 0%, #1a130c 45%, #0d0a07 80%)" }} />
        <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100" aria-hidden data-scroll data-scroll-speed="-0.05">
          {sky.map((s, i) => (
            <circle key={i} cx={s.x} cy={s.y} r={s.s * 0.08} fill="#f3eadb" opacity={s.o} className={i % 6 === 0 ? "hs-twinkle" : undefined} style={i % 6 === 0 ? { animationDelay: `${(i % 7) * 0.6}s` } : undefined} />
          ))}
        </svg>
        <div className="absolute end-[8vw] top-[9%] h-[min(10vw,96px)] w-[min(10vw,96px)] rounded-full" style={{ boxShadow: "inset -16px 6px 0 0 #f0c977", filter: "drop-shadow(0 0 28px rgba(240,201,119,.45))" }} aria-hidden data-scroll data-scroll-speed="0.08" />

        <div className={wide ? "absolute inset-0" : "relative px-6 pb-16 pt-16"}>
          {/* heading */}
          <div className={`hs-head ${wide ? "absolute start-[6vw] top-[8%] max-w-[460px]" : "mb-8 text-center"}`}>
            <p className="text-[12px] font-medium uppercase tracking-[0.28em] text-[#e9c27a] rtl:text-[16px] rtl:normal-case rtl:tracking-normal">{t("hist.k")}</p>
            <h2 id="history-title" className="display mt-3 text-[clamp(30px,3.4vw,50px)] text-white">{t("hist.h")}</h2>
            <p className="mt-3 text-[14px] leading-relaxed text-white/65">{t("hist.p")}</p>
          </div>

          {/* constellation */}
          <div ref={box} className={wide ? "absolute inset-x-0 bottom-[18%] top-[34%]" : "relative"} style={wide ? undefined : { height: Math.max(420, nodes.length * 120) }}>
            <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox={`0 0 ${size.w} ${size.h}`} aria-hidden>
              <path d={path} fill="none" stroke="#e9c27a" strokeOpacity="0.16" strokeWidth="1" />
              <path className="hs-line" d={path} fill="none" stroke="#e9c27a" strokeOpacity="0.8" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset="1" />
            </svg>
            {nodes.map((n) => {
              const { x, y } = pos(n);
              const right = wide ? x > 86 : x > 50;
              // label above a peak, below a dip, so neighbours' names don't collide
              const nb = [nodes[n.i - 1], nodes[n.i + 1]].filter(Boolean).map((m) => pos(m!).y);
              const below = wide && nb.length > 0 && y > nb.reduce((a2, b2) => a2 + b2, 0) / nb.length;
              return (
                <a
                  key={n.p.slug}
                  href={page("poets", n.p.slug)}
                  className="group absolute z-10 -translate-x-1/2 -translate-y-1/2 outline-none"
                  style={{ left: `${x}%`, top: `${y}%` }}
                  onMouseEnter={() => setHover(n.i)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(n.i)}
                  onBlur={() => setHover(null)}
                  aria-label={`${n.p.name.en ?? n.p.name.bal} ${n.p.years}`}
                  data-star={n.p.slug}
                >
                  <span className={`hs-star hs-star-${n.i} relative block h-3.5 w-3.5 rounded-full bg-[#f6d892] shadow-[0_0_22px_6px_rgba(240,201,119,.55)] transition-transform group-hover:scale-150 group-focus-visible:scale-150 ${n.era === "classical" ? "bg-[#f6d892]" : n.era === "modern" ? "bg-[#fff1cf]" : "bg-[#ffffff]"}`} />
                  <span
                    className={`hs-label hs-label-${n.i} pointer-events-none absolute flex w-max max-w-[170px] flex-col leading-tight ${below ? "top-5" : "bottom-5"}`}
                    style={right ? { right: -6, alignItems: "flex-end", textAlign: "right" } : { left: -6, alignItems: "flex-start" }}
                  >
                    <Tx v={n.p.name} className="poet-name text-[clamp(13px,1.15vw,16px)] text-white" />
                    <span className="font-[family-name:var(--latin-body)] text-[11px] tracking-wider text-[#e9c27a]/85" lang="en" dir="ltr">{n.p.years}</span>
                  </span>
                  {hover === n.i && (
                    <span
                      className={`absolute z-20 w-[260px] rounded-lg border border-white/10 bg-[#1d1813]/95 p-4 text-start shadow-2xl backdrop-blur ${below ? "bottom-6" : "top-6"}`}
                      style={right ? { right: -10 } : { left: -10 }}
                      data-star-card
                    >
                      <Tx v={n.p.name} className="poet-name block text-[15px] text-white" />
                      <span className="mt-0.5 block text-[12px] text-[#e9c27a]">
                        <span lang="en" dir="ltr" className="font-[family-name:var(--latin-body)]">{n.p.years}</span> · <Tx v={n.p.place} />
                      </span>
                      <Tx v={n.p.bio} as="span" className="mt-2 line-clamp-3 block text-[12.5px] leading-relaxed text-white/70" />
                      <span className="mt-2 block text-[11px] uppercase tracking-wider text-[#e9c27a] rtl:normal-case">{t("hist.open")} →</span>
                    </span>
                  )}
                </a>
              );
            })}
          </div>

          {/* era axis */}
          {wide ? (
            <div className="absolute inset-x-[6%] bottom-[7%]">
              <div className="relative h-8">
                <div className="absolute inset-x-0 top-0 h-px bg-white/15" />
                {eras.map((e) => {
                  const n = nodes.length;
                  const at = (i: number) => (n === 1 ? 50 : ((8 + (84 * i) / (n - 1)) - 6) / 0.88);
                  const from = e.from === 0 ? 0 : (at(e.from - 1) + at(e.from)) / 2;
                  const to = e.to === n - 1 ? 100 : (at(e.to) + at(e.to + 1)) / 2;
                  return (
                    <div key={e.era} className="hs-era absolute top-0" style={{ left: `${from}%`, width: `${to - from}%` }} data-era={e.era}>
                      <div className="mx-1 h-[3px] rounded-full bg-gradient-to-r from-[#e9c27a]/30 via-[#e9c27a] to-[#e9c27a]/30" />
                      <p className="mt-2 text-center text-[11px] uppercase tracking-[0.24em] text-[#e9c27a] rtl:text-[14px] rtl:normal-case rtl:tracking-normal">{t(ERA_LABEL[e.era])}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {eras.map((e) => (
                <span key={e.era} className="hs-era rounded-full border border-[#e9c27a]/40 px-3 py-1 text-[11px] uppercase tracking-wider text-[#e9c27a] rtl:normal-case">{t(ERA_LABEL[e.era])}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
