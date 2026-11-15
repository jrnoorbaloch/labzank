"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLang, Tx } from "@/lib/i18n";
import type { Book } from "@/lib/content";
import { useContent } from "@/lib/content-store";

gsap.registerPlugin(ScrollTrigger);

/** deterministic PRNG so server and client render the same sky */
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const COLS = 9;
const ROWS = 3;
// constellation star positions (% of stage) — one per poet
const STARS_WIDE = [
  [18, 30], [33, 18], [50, 34], [64, 20], [80, 33], [58, 52],
];
const STARS_NARROW = [
  [20, 24], [62, 16], [30, 40], [76, 34], [22, 58], [66, 54],
];

export function openSearch(q = "") {
  window.dispatchEvent(new CustomEvent("labzank:search", { detail: q }));
}

/** Doch embroidery tile — concentric diamonds with a stitched cross */
function DochTile({ variant }: { variant: number }) {
  const red = variant % 3 === 0;
  return (
    <svg viewBox="0 0 60 60" className="block h-full w-full">
      <path d="M30 2 L58 30 L30 58 L2 30 Z" fill="none" stroke="#d9a441" strokeWidth="1.4" strokeDasharray="3 2.5" />
      <path d="M30 12 L48 30 L30 48 L12 30 Z" fill={red ? "#b5532a" : "#2f6f6a"} fillOpacity="0.85" />
      <path d="M30 20 L40 30 L30 40 L20 30 Z" fill="#0d0a07" />
      <path d="M30 25 L35 30 L30 35 L25 30 Z" fill="#f0c977" />
      <path d="M30 12 V48 M12 30 H48" stroke="#f0c977" strokeOpacity="0.5" strokeWidth="0.8" strokeDasharray="1.5 2" />
    </svg>
  );
}

function BookCover({ b }: { b: Book }) {
  if (b.cover)
    return (
      <div className="relative h-full w-full overflow-hidden rounded-[6px] bg-black/40 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.9)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={b.cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
      </div>
    );
  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-[6px] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.9)]"
      style={{ background: `linear-gradient(160deg, ${b.palette[0]}, #0d0a07 130%)` }}
    >
      <div className="doch-bg absolute inset-0 opacity-70" />
      <div className="absolute inset-y-0 start-0 w-[7%] bg-black/35" />
      <div className="absolute inset-[9%] flex flex-col items-center justify-center rounded-[3px] border text-center" style={{ borderColor: b.palette[1] + "88" }}>
        <span className="nastaliq px-2 text-[clamp(14px,1.7vw,26px)]" style={{ color: b.palette[1] }} lang="bal" dir="rtl">
          {b.title.bal}
        </span>
        <span className="mt-1 px-2 font-[family-name:var(--latin-body)] text-[clamp(7px,0.6vw,10px)] uppercase tracking-[0.2em] text-white/50" lang="en" dir="ltr">
          {b.title.en}
        </span>
      </div>
    </div>
  );
}

export default function ScrollFilm() {
  const root = useRef<HTMLElement>(null);
  const railFill = useRef<HTMLDivElement>(null);
  const { t, lang } = useLang();
  const { books, heroSlides, poems, poets } = useContent();
  const [q, setQ] = useState("");
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const m = matchMedia("(max-width: 640px)");
    const f = () => setNarrow(m.matches);
    f();
    m.addEventListener("change", f);
    return () => m.removeEventListener("change", f);
  }, []);
  const STARS = narrow ? STARS_NARROW : STARS_WIDE;
  const slide = heroSlides[0];
  const featured = books.find((b) => b.id === slide.featuredBookId) ?? books[0];
  const verse = poems[1] ?? poems[0];

  const sky = useMemo(() => {
    const r = rng(7);
    return Array.from({ length: 140 }, () => ({ x: r() * 100, y: r() * 70, s: r() * 1.4 + 0.3, o: r() * 0.7 + 0.2 }));
  }, []);
  const scatter = useMemo(() => {
    const r = rng(42);
    return Array.from({ length: COLS * ROWS }, () => ({ x: (r() - 0.5) * 140, y: (r() - 0.5) * 120, rot: (r() - 0.5) * 540, s: 0.3 + r() * 0.9 }));
  }, []);

  // load-in: calligraphy brushes in right→left (writing direction of Balochi)
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(".c0-title", { clipPath: "inset(-20% 0% -20% 100%)" }, { clipPath: "inset(-20% 0% -20% 0%)", duration: 2.2, ease: "power2.inOut", delay: 0.2 });
      gsap.from(".c0-sub", { opacity: 0, y: 18, duration: 1.2, stagger: 0.15, delay: 1.4, ease: "power2.out" });
      gsap.from(".moon", { opacity: 0, scale: 0.85, duration: 2.4, ease: "power2.out" });
    }, root);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    const mm = gsap.matchMedia();
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: "power2.inOut" },
        scrollTrigger: {
          trigger: root.current,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.7,
          invalidateOnRefresh: true,
          onUpdate: (st) => {
            if (railFill.current) railFill.current.style.transform = `scaleY(${st.progress})`;
            document.documentElement.style.setProperty("--film-p", st.progress.toFixed(3));
          },
        },
      });

      // ambient: sky drifts, dunes rise, lamp warms across the whole film
      tl.to(".sky", { y: "-6vh", duration: 12, ease: "none" }, 0)
        .to(".dune-1", { y: "-5vh", duration: 12, ease: "none" }, 0)
        .to(".dune-2", { y: "-9vh", duration: 12, ease: "none" }, 0)
        .to(".dune-3", { y: "-14vh", duration: 12, ease: "none" }, 0)
        .to(".moon", { y: "8vh", x: "-4vw", duration: 12, ease: "none" }, 0)
        .to(".scroll-cue", { opacity: 0, duration: 0.4 }, 0.15);

      // 0 → title lifts away
      tl.to(".c0", { opacity: 0, y: "-12vh", scale: 0.96, duration: 1 }, 1);

      // 1 → the voice: verse appears word by word, sound rings radiate
      tl.fromTo(".c1", { opacity: 0 }, { opacity: 1, duration: 0.5 }, 2)
        .fromTo(".c1-word", { opacity: 0, y: 24, filter: "blur(8px)" }, { opacity: 1, y: 0, filter: "blur(0px)", stagger: 0.14, duration: 0.5 }, 2.1)
        .fromTo(".c1-roman", { opacity: 0 }, { opacity: 1, duration: 0.5 }, 3.0)
        .fromTo(".ring", { scale: 0.2, opacity: 0.8 }, { scale: 3.2, opacity: 0, stagger: 0.35, duration: 1.6, ease: "power1.out" }, 2.1)
        .fromTo(".c1-cap", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.6 }, 2.6)
        .to(".c1", { opacity: 0, y: "-6vh", duration: 0.5 }, 4.0);

      // 2 → doch: scattered stitches assemble into an embroidery band
      tl.fromTo(".c2", { opacity: 0 }, { opacity: 1, duration: 0.3 }, 4.3)
        .fromTo(
          ".tile",
          {
            x: (i: number) => `${scatter[i].x}vw`,
            y: (i: number) => `${scatter[i].y}vh`,
            rotate: (i: number) => scatter[i].rot,
            scale: (i: number) => scatter[i].s,
            opacity: 0,
          },
          { x: 0, y: 0, rotate: 0, scale: 1, opacity: 1, duration: 1.4, stagger: { each: 0.025, from: "center" }, ease: "power3.out" },
          4.3
        )
        .fromTo(".band-glow", { opacity: 0 }, { opacity: 1, duration: 0.6 }, 5.6)
        .fromTo(".c2-cap", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.6 }, 5.3)
        .to(".c2", { opacity: 0, scale: 1.06, duration: 0.5 }, 6.4);

      // 3 → the page: a stack of books fans out into an arc
      mm.add({ wide: "(min-width: 800px)", narrow: "(max-width: 799px)" }, (c) => {
        const spread = c.conditions?.wide ? 13 : 11; // vw between covers
        const n = 7;
        tl.fromTo(".c3", { opacity: 0 }, { opacity: 1, duration: 0.3 }, 6.8)
          .fromTo(
            ".book",
            { x: 0, y: "30vh", rotate: (i: number) => (i - 3) * 2, rotateY: 0, opacity: 0 },
            {
              x: (i: number) => `${(i - (n - 1) / 2) * spread}vw`,
              y: (i: number) => `${Math.abs(i - (n - 1) / 2) * 2.2}vh`,
              rotate: (i: number) => (i - (n - 1) / 2) * 5,
              rotateY: (i: number) => (i - (n - 1) / 2) * -8,
              opacity: 1,
              duration: 1.3,
              stagger: 0.05,
              ease: "power3.out",
            },
            6.8
          )
          .fromTo(".c3-cap", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.6 }, 7.6)
          .to(".book", { y: "-8vh", opacity: 0, stagger: 0.03, duration: 0.5 }, 8.6)
          .to(".c3", { opacity: 0, duration: 0.4 }, 8.8);
      });

      tl.to(".moon", { opacity: 0.25, duration: 0.8 }, 8.8);

      // 4 → the voices: a constellation of poets
      tl.fromTo(".c4", { opacity: 0 }, { opacity: 1, duration: 0.3 }, 9.0)
        .fromTo(".star", { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, stagger: 0.1, duration: 0.4, ease: "back.out(3)", transformOrigin: "50% 50%" }, 9.0)
        .fromTo(".const-line", { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.0, ease: "none" }, 9.2)
        .fromTo(".star-label", { opacity: 0, y: 10 }, { opacity: 1, y: 0, stagger: 0.1, duration: 0.4 }, 9.4)
        .fromTo(".c4-cap", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.6 }, 9.5)
        .to(".c4", { opacity: 0, duration: 0.5 }, 10.4);

      // 5 → the door: CMS-driven hero card with CTAs + search
      tl.fromTo(".c5", { opacity: 0, y: "6vh", pointerEvents: "none" }, { opacity: 1, y: 0, pointerEvents: "auto", duration: 0.8 }, 10.8)
        .fromTo(".c5-item", { opacity: 0, y: 20 }, { opacity: 1, y: 0, stagger: 0.08, duration: 0.5 }, 11.0)
        .to({}, { duration: 0.6 }, 11.4);
    }, root);
    return () => {
      ctx.revert();
      mm.revert();
    };
  }, [scatter]);

  // fonts/direction change line heights → re-measure
  useEffect(() => {
    const id = setTimeout(() => ScrollTrigger.refresh(), 120);
    return () => clearTimeout(id);
  }, [lang]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    openSearch(q);
  };

  return (
    <section ref={root} id="top" className="relative" style={{ height: "780vh" }} aria-label="Labzank">
      <div className="sticky top-0 h-[100svh] w-full overflow-hidden" style={{ perspective: "1200px" }}>
        {/* ── sky ── */}
        <div className="sky absolute inset-[-8%_0_0_0]">
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 80% 60% at 50% 110%, #3a2414 0%, #1a110a 45%, #0d0a07 75%)" }} />
          <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100" aria-hidden>
            {sky.map((s, i) => (
              <circle key={i} cx={s.x} cy={s.y} r={s.s * 0.09} fill="#f3eadb" opacity={s.o}>
                {i % 7 === 0 && <animate attributeName="opacity" values={`${s.o};0.1;${s.o}`} dur={`${3 + (i % 5)}s`} repeatCount="indefinite" />}
              </circle>
            ))}
          </svg>
        </div>
        <div className="moon absolute end-[12vw] top-[11vh] h-[min(13vw,120px)] w-[min(13vw,120px)]" aria-hidden>
          <div className="absolute inset-0 rounded-full" style={{ boxShadow: "inset -18px 6px 0 0 #f0c977", filter: "drop-shadow(0 0 30px rgba(240,201,119,0.45))" }} />
        </div>
        <div className="pointer-events-none absolute left-1/2 top-[62%] h-[70vh] w-[70vh] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-60" style={{ background: "radial-gradient(circle, rgba(217,164,65,0.18), transparent 65%)" }} />

        {/* ── dunes ── */}
        <svg className="dune-3 absolute inset-x-0 bottom-[-16vh] h-[46vh] w-full" viewBox="0 0 1440 400" preserveAspectRatio="none" aria-hidden>
          <path d="M0 260 C 240 170 420 230 640 190 C 860 150 1040 240 1240 200 C 1340 180 1400 190 1440 200 L1440 400 L0 400 Z" fill="#1c140d" />
        </svg>
        <svg className="dune-2 absolute inset-x-0 bottom-[-16vh] h-[40vh] w-full" viewBox="0 0 1440 400" preserveAspectRatio="none" aria-hidden>
          <path d="M0 300 C 200 240 380 300 600 260 C 820 220 980 300 1180 270 C 1300 250 1380 260 1440 270 L1440 400 L0 400 Z" fill="#140e09" />
        </svg>
        <svg className="dune-1 absolute inset-x-0 bottom-[-16vh] h-[34vh] w-full" viewBox="0 0 1440 400" preserveAspectRatio="none" aria-hidden>
          <path d="M0 330 C 260 290 460 340 720 310 C 980 280 1180 340 1440 320 L1440 400 L0 400 Z" fill="#0d0a07" />
        </svg>

        {/* ── 0: title ── */}
        <div className="c0 absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          <p className="c0-sub kicker mb-2" lang="en" dir="ltr" style={{ fontFamily: "var(--latin-body)", letterSpacing: "0.5em", fontSize: 11, textTransform: "uppercase" }}>
            Labzánk · Balochi Literature
          </p>
          <h1
            className="c0-title nastaliq px-[0.3em] text-[clamp(64px,13vw,200px)] font-bold"
            lang="bal"
            dir="rtl"
            style={{
              lineHeight: 1.85,
              background: "linear-gradient(180deg, #f7dfa6 10%, #d9a441 55%, #9c6a24 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              filter: "drop-shadow(0 10px 40px rgba(217,164,65,0.25))",
            }}
          >
            بلوچی لبزانک
          </h1>
          <p className="c0-sub mt-3 font-[family-name:var(--latin-display)] text-[clamp(16px,1.6vw,22px)] italic text-[var(--gold)]/80" lang="bal-Latn">
            Balòchi Labzánk
          </p>
          <p className="c0-sub mt-4 max-w-[40ch] text-[clamp(15px,1.4vw,20px)] text-[var(--dim)]">{t("film.tag")}</p>
        </div>
        <div className="scroll-cue absolute bottom-[5vh] left-1/2 flex -translate-x-1/2 flex-col items-center gap-3 text-[12px] tracking-[0.3em] text-[var(--dim)]">
          {t("film.scroll")}
          <span className="block h-9 w-px animate-pulse bg-gradient-to-b from-[var(--gold)] to-transparent" />
        </div>

        {/* ── 1: the voice ── */}
        <div className="c1 absolute inset-0 opacity-0">
          <div className="absolute left-1/2 top-[36%] -translate-x-1/2 -translate-y-1/2" aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="ring absolute left-1/2 top-1/2 h-[30vmin] w-[30vmin] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--gold)]/50" />
            ))}
          </div>
          <div className="absolute inset-x-0 top-[36%] -translate-y-1/2 text-center" lang="bal" dir="rtl">
            {verse.original.split("\n").map((line, li) => (
              <p key={li} className="nastaliq text-[clamp(26px,3.8vw,54px)] text-[var(--text)]" style={{ lineHeight: 1.9 }}>
                {line.split(" ").map((w, wi) => (
                  <span key={wi} className="c1-word inline-block px-[0.12em]">
                    {w}
                  </span>
                ))}
              </p>
            ))}
            <p className="c1-roman mt-2 font-[family-name:var(--latin-display)] text-[clamp(14px,1.3vw,18px)] italic text-[var(--gold)]/80" lang="bal-Latn" dir="ltr">
              {verse.roman.replace("\n", " — ")}
            </p>
          </div>
          <Caption cls="c1-cap" k={t("film.c1.k")} h={t("film.c1.h")} p={t("film.c1.p")} />
        </div>

        {/* ── 2: doch embroidery ── */}
        <div className="c2 absolute inset-0 opacity-0">
          <div className="absolute left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2">
            <div className="band-glow absolute inset-[-30%] rounded-full opacity-0" style={{ background: "radial-gradient(ellipse, rgba(181,83,42,0.28), transparent 65%)" }} />
            <div className="relative grid gap-[0.6vmin]" style={{ gridTemplateColumns: `repeat(${COLS}, min(9vmin, 10vw))` }}>
              {Array.from({ length: COLS * ROWS }, (_, i) => (
                <div key={i} className="tile aspect-square" style={{ willChange: "transform" }}>
                  <DochTile variant={i + Math.floor(i / COLS)} />
                </div>
              ))}
            </div>
          </div>
          <Caption cls="c2-cap" k={t("film.c2.k")} h={t("film.c2.h")} p={t("film.c2.p")} />
        </div>

        {/* ── 3: books ── */}
        <div className="c3 absolute inset-0 opacity-0" style={{ transformStyle: "preserve-3d" }}>
          <div className="absolute left-1/2 top-[38%]" style={{ transformStyle: "preserve-3d" }}>
            {Array.from({ length: 7 }, (_, i) => (
              <div
                key={i}
                className="book absolute aspect-[2/3] w-[clamp(84px,11vw,170px)] -translate-x-1/2 -translate-y-1/2"
                style={{ zIndex: 10 - Math.abs(i - 3), left: 0, top: 0 }}
              >
                <BookCover b={books[i % books.length]} />
              </div>
            ))}
          </div>
          <Caption cls="c3-cap" k={t("film.c3.k")} h={t("film.c3.h")} p={t("film.c3.p")} />
        </div>

        {/* ── 4: constellation ── */}
        <div className="c4 absolute inset-0 opacity-0">
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
            <path
              className="const-line"
              d={`M ${STARS.map((s) => s.join(" ")).join(" L ")} L ${STARS[2].join(" ")}`}
              fill="none"
              stroke="#d9a441"
              strokeOpacity="0.55"
              strokeWidth="0.12"
              pathLength={1}
              strokeDasharray="1"
            />
          </svg>
          {STARS.slice(0, poets.length).map(([x, y], i) => (
            <div key={i} className="absolute" style={{ left: `${x}%`, top: `${y}%` }}>
              <span className="star absolute block h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--gold-bright)] shadow-[0_0_24px_6px_rgba(240,201,119,0.55)]" />
              <span
                className="star-label absolute top-2 flex flex-col whitespace-nowrap text-[clamp(12px,1.2vw,17px)] leading-tight text-[var(--text)]/85"
                style={x > 55 ? { right: 12, alignItems: "flex-end" } : { left: 12, alignItems: "flex-start" }}
              >
                <Tx v={poets[i].name} />
                <span className="font-[family-name:var(--latin-body)] text-[10px] text-[var(--dim)]" lang="en" dir="ltr">
                  {poets[i].years}
                </span>
              </span>
            </div>
          ))}
          <Caption cls="c4-cap" k={t("film.c4.k")} h={t("film.c4.h")} p={t("film.c4.p")} />
        </div>

        {/* ── 5: hero card (hero_slides) ── */}
        <div className="c5 absolute inset-0 flex items-center justify-center px-5 opacity-0">
          <div className="w-full max-w-[880px] text-center">
            <p className="c5-item kicker">{t("s.manifesto.k")}</p>
            <Tx v={slide.heading} as="h2" className="c5-item display mt-6 text-[clamp(30px,4.6vw,66px)]" />
            <Tx v={slide.description} as="p" className="c5-item lead mx-auto mt-3" />
            <figure className="c5-item mx-auto mt-5 inline-flex flex-col items-center rounded-2xl border border-[var(--faint)] bg-black/25 px-6 py-3 backdrop-blur">
              <span className="nastaliq text-[clamp(18px,2vw,26px)] text-[var(--gold-bright)]" lang="bal" dir="rtl">
                <span className="text-[var(--rust)]">✦ </span>{slide.quote.text}
              </span>
              <figcaption className="text-[12px] text-[var(--dim)]">
                <span lang="bal-Latn" className="italic">{slide.quote.roman}</span> · <Tx v={slide.quote.credit} />
              </figcaption>
            </figure>
            <div className="c5-item mt-7 flex flex-wrap items-center justify-center gap-3">
              <a href="#poetry" className="pill pill-gold">{t("hero.explore")}</a>
              <a href="#poets" className="pill pill-line">{t("hero.authors")}</a>
            </div>
            <form onSubmit={submit} className="c5-item mx-auto mt-6 flex max-w-[560px] items-center gap-2 rounded-full border border-[var(--faint)] bg-black/40 p-1.5 ps-5 backdrop-blur focus-within:border-[var(--gold)]/60">
              <SearchIcon />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("hero.searchPh")}
                className="min-w-0 flex-1 bg-transparent py-2 text-[15px] outline-none"
                aria-label={t("nav.search")}
              />
              <button className="pill pill-gold !px-5 !py-2" type="submit">{t("nav.search")}</button>
            </form>
            <a href="#library" className="c5-item mx-auto mt-6 flex w-fit items-center gap-3 rounded-xl px-3 py-2 text-start transition hover:bg-white/5">
              <span className="block aspect-[2/3] w-9"><BookCover b={featured} /></span>
              <span className="text-[13px] leading-snug">
                <span className="block text-[var(--gold)]">{t("hero.featured")}</span>
                <Tx v={featured.title} /> · <Tx v={featured.author} className="text-[var(--dim)]" />
              </span>
            </a>
          </div>
        </div>

        {/* progress rail */}
        <div className="absolute end-[2.4vw] top-1/2 hidden h-[34vh] w-px -translate-y-1/2 bg-[var(--faint)] md:block" aria-hidden>
          <div ref={railFill} className="absolute inset-0 origin-top bg-[var(--gold)]" style={{ transform: "scaleY(0)" }} />
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[18vh] bg-gradient-to-b from-transparent to-[var(--ink)]" />
      </div>
    </section>
  );
}

function Caption({ cls, k, h, p }: { cls: string; k: string; h: string; p: string }) {
  return (
    <div className={`${cls} absolute bottom-[7vh] start-[7vw] end-[7vw] max-w-[44ch] opacity-0 md:end-auto`}>
      <p className="kicker">{k}</p>
      <h2 className="display mt-2 text-[clamp(28px,3.6vw,54px)]">{h}</h2>
      <p className="lead mt-2">{p}</p>
    </div>
  );
}

export function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="shrink-0 text-[var(--gold)]" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}
