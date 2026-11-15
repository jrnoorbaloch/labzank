"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Tx, useLang } from "@/lib/i18n";
import { Book, bookCats, Period, Poet } from "@/lib/content";
import { useContent, SectionKey } from "@/lib/content-store";
import { supabase } from "@/lib/db/client";
import { useReveal } from "@/hooks/useReveal";
import type { Entry as DictEntry } from "@/lib/dictionary/data";
import { repo } from "@/lib/dictionary/repo";
import { page } from "@/lib/links";
import { bookPdfUrl } from "@/lib/media";

gsap.registerPlugin(ScrollTrigger);

/* ─────────────────────────── shared bits ─────────────────────────── */

export function Medallion({ p, size = 120 }: { p: Poet; size?: number }) {
  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-full"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 35% 30%, hsl(${p.hue} 55% 34%), hsl(${p.hue} 50% 12%) 70%)`,
        boxShadow: `0 0 0 1px rgba(217,164,65,0.35), 0 0 0 6px rgba(13,10,7,1), 0 0 0 7px rgba(217,164,65,0.18), 0 20px 50px -20px hsl(${p.hue} 60% 30%)`,
      }}
      aria-hidden
    >
      <div className="doch-bg absolute inset-0 opacity-50" />
      {p.photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.photo} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <span className="nastaliq absolute inset-0 grid place-items-center text-[var(--gold-bright)]" style={{ fontSize: size * 0.42, lineHeight: 1 }} lang="bal">
          {p.name.bal.charAt(0)}
        </span>
      )}
    </div>
  );
}

export function Cover({ b, className = "" }: { b: Book; className?: string }) {
  if (b.cover)
    return (
      <div className={`relative aspect-[2/3] overflow-hidden rounded-[6px] bg-black/40 shadow-[0_30px_50px_-24px_rgba(0,0,0,0.95)] ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={b.cover} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
      </div>
    );
  return (
    <div
      className={`relative aspect-[2/3] overflow-hidden rounded-[6px] shadow-[0_30px_50px_-24px_rgba(0,0,0,0.95)] ${className}`}
      style={{ background: `linear-gradient(160deg, ${b.palette[0]}, #0d0a07 140%)` }}
    >
      <div className="doch-bg absolute inset-0 opacity-60" />
      <div className="absolute inset-y-0 start-0 w-[7%] bg-black/35" />
      <div className="absolute inset-[9%] flex flex-col items-center justify-center rounded-[3px] border text-center" style={{ borderColor: b.palette[1] + "88" }}>
        <span className="nastaliq px-2 text-[clamp(18px,1.9vw,28px)]" style={{ color: b.palette[1], lineHeight: 1.9 }} lang="bal" dir="rtl">
          {b.title.bal}
        </span>
        <span className="mt-1 px-2 font-[family-name:var(--latin-body)] text-[9px] uppercase tracking-[0.2em] text-white/50" lang="en" dir="ltr">
          {b.title.en}
        </span>
      </div>
    </div>
  );
}

function Head({ k, h, children, center }: { k: string; h: string; children?: React.ReactNode; center?: boolean }) {
  return (
    <div className={`mb-12 flex flex-wrap items-end justify-between gap-6 ${center ? "flex-col items-center text-center" : ""}`} data-reveal>
      <div>
        <p className="kicker">{k}</p>
        <h2 className="display h2 mt-2">{h}</h2>
      </div>
      {children}
    </div>
  );
}

/* ─────────────────────────── sections ─────────────────────────── */

function Manifesto() {
  const { t } = useLang();
  return (
    <section id="story" className="section py-[22vh] text-center">
      <div data-reveal>
        <p className="kicker">{t("s.manifesto.k")}</p>
        <h2 className="display mx-auto mt-5 max-w-[16ch] text-[clamp(40px,7vw,108px)]">{t("s.manifesto.h")}</h2>
        <div className="mx-auto mt-10 h-px w-24 bg-gradient-to-r from-transparent via-[var(--gold)] to-transparent" />
      </div>
    </section>
  );
}

function PoetOfDay() {
  const { poets } = useContent();
  const { t } = useLang();
  const [i, setI] = useState(2);
  useEffect(() => {
    const day = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 864e5);
    setI(day % poets.length);
  }, []);
  const p = poets[i % poets.length];
  return (
    <section className="section">
      <div className="card relative grid items-center gap-10 overflow-hidden p-8 md:grid-cols-[auto_1fr] md:p-14">
        <div className="doch-bg edge-fade absolute inset-y-0 end-0 w-1/3 opacity-30" />
        <div data-reveal className="mx-auto">
          <Medallion p={p} size={200} />
        </div>
        <div data-reveal data-delay="0.1" className="relative">
          <p className="kicker">{t("s.potd.k")}</p>
          <Tx v={p.name} as="h2" className="display h2 mt-2" />
          <Tx v={p.bio} as="p" className="lead mt-3" />
          <dl className="mt-8 flex flex-wrap gap-x-12 gap-y-4">
            {[
              [t("s.potd.born"), <Tx key="b" v={p.place} />],
              [t("s.potd.period"), <span key="y" lang="en" dir="ltr" className="font-[family-name:var(--latin-body)]">{p.years}</span>],
              [t("s.potd.works"), <span key="w" lang="en" dir="ltr" className="font-[family-name:var(--latin-body)]">{p.works}</span>],
            ].map(([dt, dd], j) => (
              <div key={j}>
                <dt className="text-[12px] text-[var(--dim)]">{dt}</dt>
                <dd className="mt-1 text-[18px] text-[var(--gold-bright)]">{dd}</dd>
              </div>
            ))}
          </dl>
          <a href={page("poets", p.slug)} className="pill pill-line mt-8">{t("s.potd.cta")} →</a>
        </div>
      </div>
    </section>
  );
}

function Poetry() {
  const { poems, poets } = useContent();
  const { t, lang } = useLang();
  const [script, setScript] = useState<"arabic" | "roman">("arabic");
  const [saved, setSaved] = useState<string[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  useEffect(() => {
    try {
      setSaved(JSON.parse(localStorage.getItem("labzank-bookmarks") || "[]"));
    } catch {}
  }, []);
  useEffect(() => setScript(lang === "bal-latn" ? "roman" : "arabic"), [lang]);

  const toggle = (id: string) => {
    const next = saved.includes(id) ? saved.filter((x) => x !== id) : [...saved, id];
    setSaved(next);
    try {
      localStorage.setItem("labzank-bookmarks", JSON.stringify(next));
    } catch {}
  };
  const copy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* clipboard refused in sandboxed frames */
    }
    setCopied(id);
    setTimeout(() => setCopied(null), 1600);
  };
  const tr = (p: { translation: { en: string; ur: string } }) => (lang === "ur" ? { text: p.translation.ur, l: "ur" } : lang === "en" ? { text: p.translation.en, l: "en" } : null);

  return (
    <section id="poetry" className="section">
      <Head k={t("s.poetry.k")} h={t("s.poetry.h")}>
        <div className="flex items-center gap-2" role="group" aria-label={t("s.poetry.script")}>
          <span className="me-1 text-[13px] text-[var(--dim)]">{t("s.poetry.script")}</span>
          <button className={`chip ${script === "arabic" ? "on" : ""}`} onClick={() => setScript("arabic")}>{t("s.poetry.arabic")}</button>
          <button className={`chip ${script === "roman" ? "on" : ""}`} onClick={() => setScript("roman")}>{t("s.poetry.roman")}</button>
        </div>
      </Head>
      <div className="grid gap-6 md:grid-cols-3">
        {poems.map((p, i) => {
          const translation = tr(p);
          const text = script === "arabic" ? p.original : p.roman;
          return (
            <article key={p.id} className="card flex flex-col p-7" data-reveal data-delay={i * 0.08}>
              <div className="flex items-center justify-between">
                <Tx v={p.form} className="rounded-full border border-[var(--gold)]/40 px-3 py-0.5 text-[12px] text-[var(--gold)]" />
                {p.sample && <span className="text-[11px] text-[var(--dim)]">{t("ui.sample")}</span>}
              </div>
              <div className="my-7 flex-1 text-center">
                {script === "arabic" ? (
                  <p className="nastaliq whitespace-pre-line text-[clamp(20px,1.9vw,27px)]" lang="bal" dir="rtl" style={{ lineHeight: 2.3 }}>{text}</p>
                ) : (
                  <p className="whitespace-pre-line font-[family-name:var(--latin-display)] text-[clamp(19px,1.6vw,23px)] italic leading-relaxed" lang="bal-Latn" dir="ltr">{text}</p>
                )}
                {translation && (
                  <p className="mt-5 whitespace-pre-line border-t border-[var(--faint)] pt-4 text-[14px] text-[var(--dim)]" lang={translation.l} dir={translation.l === "ur" ? "rtl" : "ltr"}>
                    <span className="mb-1 block text-[11px] text-[var(--gold)]/80">{t("s.poetry.translation")}</span>
                    {translation.text}
                  </p>
                )}
              </div>
              <div className="flex items-center justify-between border-t border-[var(--faint)] pt-4 text-[13px]">
                <a href={page("poetry", p.id)} className="text-[var(--dim)] hover:text-[var(--gold-bright)]">
                  <Tx v={poets.find((x) => x.slug === p.authorSlug)?.name ?? p.contributor} /> <span className="inline-block rtl:rotate-180">→</span>
                </a>
                <div className="flex gap-1">
                  <button onClick={() => copy(p.id, text)} className="rounded-full px-3 py-1 hover:bg-white/5">
                    {copied === p.id ? t("s.poetry.copied") : t("s.poetry.copy")}
                  </button>
                  <button onClick={() => toggle(p.id)} className={`rounded-full px-3 py-1 hover:bg-white/5 ${saved.includes(p.id) ? "text-[var(--gold)]" : ""}`} aria-pressed={saved.includes(p.id)}>
                    {saved.includes(p.id) ? "★ " + t("s.poetry.saved") : "☆ " + t("s.poetry.save")}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}


function DictionaryTeaser() {
  const { t, lang } = useLang();
  const [w, setW] = useState<DictEntry | null>(null);
  useEffect(() => {
    repo.wordOfDay().then(setW).catch(() => setW(null));
  }, []);
  if (!w) return null;
  const g = w.senses[0].gloss;
  return (
    <section id="dictionary" className="section">
      <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.1fr]">
        <div data-reveal>
          <p className="kicker">{t("nav.dictionary")}</p>
          <h2 className="display h2 mt-2">{t("d.title")}</h2>
          <p className="lead mt-3">{t("d.sub")}</p>
          <a href={page("dictionary")} className="pill pill-gold mt-8">{t("d.more")} →</a>
        </div>
        <a href={page("dictionary", `word-${w.slug}`)} className="card relative block overflow-hidden p-8" data-reveal data-delay="0.1">
          <div className="doch-bg absolute inset-y-0 end-0 w-2/5 opacity-25" />
          <p className="kicker relative">{t("d.wotd")}</p>
          <p className="relative mt-3 flex flex-wrap items-baseline gap-x-4">
            <span className="nastaliq text-[clamp(44px,5vw,72px)]" lang="bal" dir="rtl" style={{ lineHeight: 1.9 }}>{w.arab}</span>
            <span className="font-[family-name:var(--latin-display)] text-[28px] italic text-[var(--gold-bright)]" lang="bal-Latn" dir="ltr">{w.latn}</span>
          </p>
          <p className="relative mt-2 text-[18px]" lang={lang === "ur" ? "ur" : "en"} dir={lang === "ur" ? "rtl" : "ltr"}>{(lang === "ur" ? g.ur : g.en) ?? g.en}</p>
          {w.ipa && <p className="relative mt-1 text-[13px] text-[var(--dim)]" lang="en" dir="ltr">{w.ipa}</p>}
        </a>
      </div>
    </section>
  );
}

function Stats() {
  const { stats, live } = useContent();
  const { t } = useLang();
  const ref = useRef<HTMLDivElement>(null);
  const items = [
    [stats.poets, t("s.stats.poets")],
    [stats.poems, t("s.stats.poems")],
    [stats.books, t("s.stats.books")],
    [stats.audio, t("s.stats.audio")],
  ] as const;
  useEffect(() => {
    if (!ref.current) return;
    const nums = [...ref.current.querySelectorAll<HTMLElement>("[data-count]")];
    const st = ScrollTrigger.create({
      trigger: ref.current,
      start: "top 85%",
      once: true,
      onEnter: () =>
        nums.forEach((el) => {
          const o = { v: 0 };
          gsap.to(o, { v: +el.dataset.count!, duration: 2, ease: "power2.out", onUpdate: () => (el.textContent = Math.round(o.v).toLocaleString("en")) });
        }),
    });
    return () => st.kill();
  }, []);
  return (
    <section className="section py-[10vh]">
      <div ref={ref} className="grid grid-cols-2 gap-y-12 border-y border-[var(--faint)] py-14 text-center md:grid-cols-4">
        {items.map(([n, l], i) => (
          <div key={i} data-reveal data-delay={i * 0.08}>
            <div className="font-[family-name:var(--latin-display)] text-[clamp(40px,5vw,76px)] font-semibold tracking-tight text-[var(--gold)]" data-count={n} lang="en" dir="ltr">0</div>
            <div className="mt-1 text-[14px] text-[var(--dim)]">{l}</div>
          </div>
        ))}
      </div>
      {!live && <p className="mt-3 text-center text-[11px] text-[var(--dim)]/70">{t("ui.demo")}</p>}
    </section>
  );
}

function Poets() {
  const { poets } = useContent();
  const { t } = useLang();
  const [f, setF] = useState<Period | "all">("all");
  const list = poets.filter((p) => f === "all" || p.period === f);
  return (
    <section id="poets" className="section">
      <Head k={t("s.poets.k")} h={t("s.poets.h")}>
        <div className="flex flex-wrap gap-2">
          {(["all", "classical", "modern"] as const).map((x) => (
            <button key={x} className={`chip ${f === x ? "on" : ""}`} onClick={() => setF(x)}>
              {t(`s.poets.${x}`)}
            </button>
          ))}
        </div>
      </Head>
      <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-6">
        {list.map((p, i) => (
          <a key={p.slug} href={page("poets", p.slug)} className="card group flex flex-col items-center p-6 text-center" data-reveal data-delay={i * 0.05}>
            <div className="transition-transform duration-500 group-hover:-translate-y-1 group-hover:scale-[1.04]">
              <Medallion p={p} size={96} />
            </div>
            <Tx v={p.name} as="h3" className="mt-5 text-[17px] leading-snug" />
            <span className="mt-1 font-[family-name:var(--latin-body)] text-[12px] text-[var(--dim)]" lang="en" dir="ltr">{p.years}</span>
            <span className="mt-3 text-[12px] text-[var(--gold)]">{t(`s.poets.${p.period}`)}</span>
          </a>
        ))}
      </div>
      <div className="mt-10 text-center" data-reveal>
        <a href={page("poets")} className="pill pill-line">{t("s.poets.viewAll")} →</a>
      </div>
    </section>
  );
}

export function ReadPdf({ path, label, className = "text-[var(--gold)] hover:underline" }: { path: string; label: string; className?: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      className={`${className} disabled:opacity-50`}
      disabled={busy}
      onClick={async () => {
        // open the tab synchronously so pop-up blockers allow it, then point it at the signed URL
        const w = window.open("", "_blank");
        setBusy(true);
        try {
          const url = await bookPdfUrl(path);
          if (w) w.location.href = url;
          else window.location.href = url;
        } catch {
          w?.close();
        }
        setBusy(false);
      }}
    >
      {label} →
    </button>
  );
}

function Library() {
  const { books } = useContent();
  const { t } = useLang();
  const [c, setC] = useState<string>("all");
  const list = useMemo(() => books.filter((b) => c === "all" || b.cat === c), [c, books]);
  return (
    <section id="library" className="section">
      <Head k={t("s.books.k")} h={t("s.books.h")}>
        <div className="flex flex-wrap gap-2">
          {bookCats.map((x) => (
            <button key={x.id} className={`chip ${c === x.id ? "on" : ""}`} onClick={() => setC(x.id)}>
              <Tx v={x.label} />
            </button>
          ))}
        </div>
      </Head>
      <div className="no-scrollbar -mx-[7vw] flex snap-x gap-7 overflow-x-auto px-[7vw] pb-6">
        {list.map((b, i) => (
          <article key={b.id} className="group w-[clamp(160px,15vw,220px)] shrink-0 snap-start" data-reveal data-delay={i * 0.05}>
            <a href={page("library", b.id)} className="block transition-transform duration-500 group-hover:-translate-y-2 group-hover:rotate-[-1deg]">
              <Cover b={b} />
            </a>
            <a href={page("library", b.id)} className="hover:text-[var(--gold-bright)]"><Tx v={b.title} as="h3" className="mt-4 text-[16px] leading-snug" /></a>
            <Tx v={b.author} as="p" className="text-[13px] text-[var(--dim)]" />
            <div className="mt-2 flex items-center justify-between text-[12px]">
              <span className="text-[var(--dim)]">
                <span lang="en" dir="ltr">{b.pages}</span> {t("s.books.pages")}
              </span>
              {b.pdf && b.canDownload && <ReadPdf path={b.pdf} label={t("s.books.read")} />}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Folk() {
  const { folk } = useContent();
  const { t } = useLang();
  return (
    <section id="folk" className="section">
      <div className="grid items-center gap-14 lg:grid-cols-[1fr_1.2fr]">
        <div data-reveal>
          <p className="kicker">{t("s.folk.k")}</p>
          <h2 className="display h2 mt-2">{t("s.folk.h")}</h2>
          <p className="lead mt-4">{t("s.folk.p")}</p>
          <div className="doch-bg edge-fade mt-10 h-28 w-full rounded-xl opacity-80" style={{ backgroundSize: "56px 56px" }} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {folk.map((f, i) => (
            <div key={i} className="card p-6" data-reveal data-delay={i * 0.07}>
              <span className="text-[22px] text-[var(--rust)]">{f.glyph}</span>
              <Tx v={f.title} as="h3" className="mt-3 text-[19px] text-[var(--gold-bright)]" />
              <Tx v={f.body} as="p" className="mt-2 text-[14px] text-[var(--dim)]" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Wave({ seed, progress }: { seed: number; progress: number }) {
  const bars = useMemo(() => Array.from({ length: 56 }, (_, i) => Math.round((0.25 + Math.abs(Math.sin(i * 0.55 + seed) * Math.cos(i * 0.17 + seed * 2)) * 0.75) * 100)), [seed]);
  return (
    <div className="flex h-10 flex-1 items-center gap-[3px]" dir="ltr" aria-hidden>
      {bars.map((h, i) => (
        <span key={i} className="w-[3px] rounded-full transition-colors" style={{ height: `${h}%`, backgroundColor: i / bars.length < progress ? "var(--gold)" : "rgba(243,234,219,0.18)" }} />
      ))}
    </div>
  );
}

function Audio() {
  const { audio } = useContent();
  const { t } = useLang();
  const [playing, setPlaying] = useState<number | null>(null);
  const [prog, setProg] = useState(0);
  const el = useRef<HTMLAudioElement | null>(null);
  const real = playing !== null && !!audio[playing]?.src;
  // demo waveform animation for items without an uploaded file
  useEffect(() => {
    if (playing === null || real) return;
    const id = setInterval(() => setProg((p) => (p >= 1 ? 0 : p + 0.006)), 60);
    return () => clearInterval(id);
  }, [playing, real]);
  useEffect(() => () => el.current?.pause(), []);
  const toggle = (i: number) => {
    const a = el.current;
    if (playing === i) {
      a?.pause();
      setPlaying(null);
      return;
    }
    a?.pause();
    setProg(0);
    setPlaying(i);
    const src = audio[i]?.src;
    if (src) {
      const n = a ?? (el.current = new window.Audio());
      n.src = src;
      n.ontimeupdate = () => n.duration && setProg(n.currentTime / n.duration);
      n.onended = () => { setPlaying(null); setProg(0); };
      n.play().catch(() => setPlaying(null));
    }
  };
  const seek = (i: number, e: React.MouseEvent<HTMLDivElement>) => {
    const a = el.current;
    if (playing !== i || !real || !a?.duration) return;
    const r = e.currentTarget.getBoundingClientRect();
    a.currentTime = ((e.clientX - r.left) / r.width) * a.duration;
  };
  const anyDemo = audio.some((a) => !a.src);
  return (
    <section id="audio" className="section">
      <Head k={t("s.audio.k")} h={t("s.audio.h")} />
      <div className="flex flex-col gap-3">
        {audio.map((a, i) => (
          <div key={i} className="card flex items-center gap-5 p-4 md:p-5" data-reveal data-delay={i * 0.07}>
            <button
              onClick={() => toggle(i)}
              className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[var(--gold)] text-[var(--ink)] shadow-[0_0_30px_-6px_var(--gold)]"
              aria-label={playing === i ? "Pause" : "Play"}
            >
              {playing === i ? "❚❚" : "▶"}
            </button>
            <div className="w-[34%] min-w-0">
              <Tx v={a.title} className="block truncate text-[16px]" />
              <Tx v={a.by} className="block truncate text-[13px] text-[var(--dim)]" />
            </div>
            <div className={`flex flex-1 ${a.src ? "cursor-pointer" : ""}`} onClick={(e) => seek(i, e)}>
              <Wave seed={i + 1} progress={playing === i ? prog : 0} />
            </div>
            <span className="hidden w-12 text-end font-[family-name:var(--latin-body)] text-[13px] text-[var(--dim)] sm:block" lang="en" dir="ltr">{a.dur}</span>
          </div>
        ))}
      </div>
      {anyDemo && <p className="mt-4 text-[12px] text-[var(--dim)]">{t("s.audio.demo")}</p>}
    </section>
  );
}

function Events() {
  const { events } = useContent();
  const { t } = useLang();
  return (
    <section id="events" className="section">
      <Head k={t("s.events.k")} h={t("s.events.h")} />
      <div className="grid gap-5 md:grid-cols-3">
        {events.map((e, i) => (
          <article key={i} className="card flex gap-6 p-7" data-reveal data-delay={i * 0.07}>
            <div className="text-center">
              <div className="font-[family-name:var(--latin-display)] text-[46px] font-semibold leading-none text-[var(--gold)]" lang="en" dir="ltr">{e.day}</div>
              <Tx v={e.month} className="text-[13px] text-[var(--dim)]" />
            </div>
            <div className="border-s border-[var(--faint)] ps-6">
              <Tx v={e.title} as="h3" className="text-[18px] leading-snug" />
              <Tx v={e.place} as="p" className="mt-2 text-[13px] text-[var(--dim)]" />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Newsletter() {
  const { t } = useLang();
  const [done, setDone] = useState(false);
  const [email, setEmail] = useState("");
  const { lang } = useLang();
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return;
    if (!supabase) return setDone(true);
    setBusy(true);
    setErr("");
    const { error } = await supabase.from("newsletter_subscribers").insert({ email: email.trim().toLowerCase(), lang });
    setBusy(false);
    // 23505 = already subscribed → treat as success
    if (error && error.code !== "23505") return setErr(error.message);
    setDone(true);
  };
  return (
    <section className="section">
      <div className="card doch-bg relative overflow-hidden p-10 text-center md:p-16" data-reveal>
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--ink-2)]/90 via-[var(--ink-2)]/95 to-[var(--ink-2)]" />
        <div className="relative">
          <p className="kicker">{t("s.news.k")}</p>
          <h2 className="display mx-auto mt-3 max-w-[22ch] text-[clamp(26px,3.2vw,46px)]">{t("s.news.h")}</h2>
          {done ? (
            <p className="mt-8 text-[var(--gold-bright)]">{supabase ? t("s.news.okLive") : t("s.news.ok")}</p>
          ) : (
            <form onSubmit={submit} className="mx-auto mt-8 flex max-w-[480px] flex-col gap-3 sm:flex-row">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("s.news.ph")}
                className="flex-1 rounded-full border border-[var(--faint)] bg-black/30 px-5 py-3 outline-none focus:border-[var(--gold)]/60"
                dir="ltr"
              />
              <button className="pill pill-gold justify-center disabled:opacity-50" disabled={busy}>{busy ? "…" : t("s.news.btn")}</button>
            </form>
          )}
          {err && <p className="mt-3 text-[13px] text-[var(--rust)]" lang="en" dir="ltr">{err}</p>}
        </div>
      </div>
    </section>
  );
}

function ClosingCta() {
  const { t } = useLang();
  return (
    <section className="section py-[20vh] text-center">
      <div data-reveal>
        <span className="nastaliq text-[28px] text-[var(--gold)]" lang="bal">✦</span>
        <h2 className="display mx-auto mt-4 max-w-[18ch] text-[clamp(34px,5.4vw,80px)]">{t("s.cta.h")}</h2>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <a href="#poetry" className="pill pill-gold">{t("hero.explore")}</a>
          <a href="#footer" className="pill pill-line">{t("s.cta.contrib")}</a>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const { t } = useLang();
  const cols: [string, string[]][] = [
    [t("f.explore"), [t("nav.poetry"), t("nav.poets"), t("nav.books"), t("nav.dictionary"), t("nav.prose")]],
    [t("f.platform"), [t("nav.culture"), t("nav.media"), t("nav.about"), t("nav.contact")]],
    [t("f.contribute"), [t("f.apply"), t("f.portal"), t("nav.login"), t("f.admin")]],
  ];
  return (
    <footer id="footer" className="border-t border-[var(--faint)] px-[7vw] pb-10 pt-20">
      <div className="mx-auto grid max-w-[1480px] gap-12 md:grid-cols-[2fr_repeat(3,1fr)]">
        <div>
          <span className="nastaliq text-[34px] text-[var(--gold)]" lang="bal" style={{ lineHeight: 1.7 }}>لبزانک</span>
          <p className="mt-3 max-w-[38ch] text-[14px] text-[var(--dim)]">{t("f.summary")}</p>
          <div className="mt-6 flex gap-3 text-[var(--dim)]">
            {["YouTube", "Facebook", "X", "Instagram"].map((s) => (
              <a key={s} href="#footer" className="rounded-full border border-[var(--faint)] px-3 py-1 font-[family-name:var(--latin-body)] text-[11px] hover:text-[var(--text)]" lang="en" dir="ltr">
                {s}
              </a>
            ))}
          </div>
        </div>
        {cols.map(([h, links]) => (
          <div key={h}>
            <h4 className="mb-4 text-[13px] text-[var(--gold)]">{h}</h4>
            {links.map((l) => (
              <a key={l} href={l === t("nav.dictionary") ? page("dictionary") : l === t("f.admin") ? page("admin") : "#top"} className="mb-2.5 block text-[14px] text-[var(--dim)] hover:text-[var(--text)]">
                {l}
              </a>
            ))}
          </div>
        ))}
      </div>
      <div className="mx-auto mt-16 flex max-w-[1480px] flex-wrap items-center justify-between gap-4 border-t border-[var(--faint)] pt-6 text-[12px] text-[var(--dim)]/80">
        <span lang="en" dir="ltr" className="font-[family-name:var(--latin-body)]">© 2026 Labzank</span>
        <span>{t("f.fine")}</span>
      </div>
    </footer>
  );
}

/* ─────────────────────────── page body ─────────────────────────── */

/**
 * homepage_sections — order/visibility are admin-controlled in production.
 * Here the list is static, but the page renders strictly from it.
 */
const SECTIONS: Record<SectionKey, () => React.ReactNode> = {
  manifesto: Manifesto, potd: PoetOfDay, poetry: Poetry, dictionary: DictionaryTeaser, stats: Stats, poets: Poets,
  library: Library, folk: Folk, audio: Audio, events: Events, newsletter: Newsletter, cta: ClosingCta,
};

export default function BrandSections() {
  const root = useRef<HTMLDivElement>(null);
  const { sections } = useContent();
  useReveal(root);
  useEffect(() => {
    // already-revealed elements stay revealed; new chip-filtered items need re-observing
    const els = root.current?.querySelectorAll("[data-reveal]:not(.in)");
    els?.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < innerHeight && r.bottom > 0) el.classList.add("in");
    });
  });
  return (
    <div ref={root}>
      {sections.map((k) => {
        const S = SECTIONS[k];
        return <S key={k} />;
      })}
      <Footer />
    </div>
  );
}
