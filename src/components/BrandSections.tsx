"use client";

/**
 * Homepage sections in a Rekhta-style layout (light theme). Order and
 * visibility come from Admin → Literature → Homepage builder (homepage_sections).
 * Medallion, Cover and ReadPdf are shared with the poets / poetry / library pages.
 */

import { FormEvent, ReactNode, useEffect, useRef, useState } from "react";
import { Tx, useLang } from "@/lib/i18n";
import type { Book, Poet } from "@/lib/content";
import { SectionKey, useContent } from "@/lib/content-store";
import { supabase } from "@/lib/db/client";
import type { Entry as DictEntry } from "@/lib/dictionary/data";
import { repo } from "@/lib/dictionary/repo";
import { page } from "@/lib/links";
import { bookPdfUrl } from "@/lib/media";
import { openSearch } from "./search";
import HistorySky from "./HistorySky";
import { useDate, VideoCard, VideoModal } from "./pages/Extra";
import { Latin } from "./pages/Literature";
import type { DictKey } from "@/lib/dict";
import type { Article, Poem, Video } from "@/lib/content";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);
import Logo from "./Logo";
import { Verse } from "./WordLookup";
import { formByKey, formKey, formOrder, verseFor } from "@/lib/forms";

/* ─────────────────────────── shared pieces ─────────────────────────── */

export function Medallion({ p, size = 120 }: { p: Poet; size?: number }) {
  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-full"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 35% 30%, hsl(${p.hue} 45% 88%), hsl(${p.hue} 40% 74%) 75%)`,
        boxShadow: `0 10px 28px -14px hsl(${p.hue} 40% 30% / .55), 0 0 0 1px rgba(31,27,22,.06)`,
      }}
      aria-hidden
    >
      {p.photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.photo} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <span className="nastaliq absolute inset-0 grid place-items-center" style={{ fontSize: size * 0.42, lineHeight: 1, color: `hsl(${p.hue} 45% 28%)` }} lang="bal">
          {p.name.bal.charAt(0)}
        </span>
      )}
    </div>
  );
}

export function Cover({ b, className = "" }: { b: Book; className?: string }) {
  if (b.cover)
    return (
      <div className={`relative aspect-[2/3] overflow-hidden rounded-[4px] bg-[var(--ink-3)] shadow-[0_18px_30px_-18px_rgba(31,27,22,0.6)] ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={b.cover} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
      </div>
    );
  return (
    <div
      className={`relative aspect-[2/3] overflow-hidden rounded-[4px] shadow-[0_18px_30px_-18px_rgba(31,27,22,0.6)] ${className}`}
      style={{ background: `linear-gradient(160deg, ${b.palette[0]}, color-mix(in srgb, ${b.palette[0]} 55%, #000) 120%)` }}
    >
      <div className="doch-bg absolute inset-0 opacity-50" />
      <div className="absolute inset-y-0 start-0 w-[7%] bg-black/30" />
      <div className="absolute inset-[9%] flex flex-col items-center justify-center rounded-[3px] border text-center" style={{ borderColor: b.palette[1] + "88" }}>
        <span className="nastaliq px-2 text-[clamp(16px,1.6vw,24px)]" style={{ color: b.palette[1], lineHeight: 1.9 }} lang="bal" dir="rtl">
          {b.title.bal}
        </span>
        <span className="mt-1 px-2 font-[family-name:var(--latin-body)] text-[9px] uppercase tracking-[0.2em] text-white/60" lang="en" dir="ltr">
          {b.title.en}
        </span>
      </div>
    </div>
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

function Title({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-8" data-anim>
      <h2 className="sec-title">{children}</h2>
      {sub && <p className="sec-sub">{sub}</p>}
    </div>
  );
}

function Section({ id, children, band = false }: { id?: string; children: ReactNode; band?: boolean }) {
  return (
    <section id={id} className={`py-14 md:py-16 ${band ? "bg-[var(--ink-2)]" : ""}`}>
      <div className="wrap">{children}</div>
    </section>
  );
}

function Arrow({ dir, onClick, disabled, label }: { dir: "prev" | "next"; onClick: () => void; disabled?: boolean; label: string }) {
  return (
    <button className="arrow-btn" onClick={onClick} disabled={disabled} aria-label={label}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="rtl:rotate-180">
        <path d={dir === "prev" ? "m15 6-6 6 6 6" : "m9 6 6 6-6 6"} />
      </svg>
    </button>
  );
}

/** Horizontal row of cards with a "next" arrow at the side, like Rekhta's rails. */
function Rail({ children, itemClass = "w-[46%] sm:w-[31%] lg:w-[23%]" }: { children: ReactNode[]; itemClass?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });
  const update = () => {
    const el = ref.current;
    if (!el) return;
    const x = Math.abs(el.scrollLeft);
    setEdge({ start: x < 4, end: x + el.clientWidth >= el.scrollWidth - 4 });
  };
  useEffect(update, [children.length]);
  const by = (d: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    const rtl = getComputedStyle(el).direction === "rtl";
    el.scrollBy({ left: d * (rtl ? -1 : 1) * el.clientWidth * 0.8, behavior: "smooth" });
  };
  return (
    <div className="relative flex items-center gap-3">
      {!edge.start && <div className="hidden md:block"><Arrow dir="prev" onClick={() => by(-1)} label="Previous" /></div>}
      <div ref={ref} onScroll={update} className="no-scrollbar flex flex-1 snap-x gap-5 overflow-x-auto scroll-smooth pb-2" data-rail>
        {children.map((c, i) => (
          <div key={i} className={`shrink-0 snap-start ${itemClass}`} data-anim>{c}</div>
        ))}
      </div>
      <div className="hidden md:block"><Arrow dir="next" onClick={() => by(1)} disabled={edge.end} label="Next" /></div>
    </div>
  );
}

const latin = "font-[family-name:var(--latin-body)]";

/* ─────────────────────────── 1. today's top poetry ─────────────────────────── */

function TopPoetry() {
  const { poems, poets } = useContent();
  const { t, lang } = useLang();
  const list = poems.slice(0, 5);
  const [i, setI] = useState(0);
  const [fav, setFav] = useState<string[]>([]);
  const [shared, setShared] = useState(false);
  useEffect(() => {
    try { setFav(JSON.parse(localStorage.getItem("labzank-favs") ?? "[]")); } catch {}
  }, []);
  if (!list.length) return null;
  const p = list[i % list.length];
  const poet = poets.find((x) => x.slug === p.authorSlug);
  const top = verseFor(p, lang);
  const isFav = fav.includes(p.id);
  const toggleFav = () => {
    const next = isFav ? fav.filter((x) => x !== p.id) : [...fav, p.id];
    setFav(next);
    try { localStorage.setItem("labzank-favs", JSON.stringify(next)); } catch {}
  };
  return (
    <Section id="poetry">
      <Title>{t("h.top")}</Title>
      <div className="flex items-center gap-4">
        <Arrow dir="prev" onClick={() => setI((x) => (x - 1 + list.length) % list.length)} label="Previous" />
        <div className="flex-1 text-center" data-top-poem={p.id}>
          {top.rtl ? (
            <Verse text={top.text.split("\n").slice(0, 2).join("\n")} className="nastaliq text-[clamp(22px,2.2vw,30px)] text-[var(--text)]" lang="bal" dir="rtl" style={{ lineHeight: 2.3 }} />
          ) : (
            <Verse text={top.text.split("\n").slice(0, 2).join("\n")} className="font-[family-name:var(--latin-display)] text-[clamp(19px,1.8vw,25px)] italic leading-[1.9] text-[var(--text)]/85" lang="bal-Latn" dir="ltr" />
          )}
          <a href={poet ? page("poets", poet.slug) : page("poetry", p.id)} className="poet-name mt-3 inline-block text-[12px] uppercase tracking-[0.1em] text-[var(--text)] hover:text-[var(--gold)] rtl:text-[15px] rtl:normal-case rtl:tracking-normal">
            <Tx v={poet?.name ?? p.contributor} />
          </a>
          {p.sample && <span className="ms-2 text-[11px] text-[var(--dim)]">({t("ui.sample")})</span>}
        </div>
        <Arrow dir="next" onClick={() => setI((x) => (x + 1) % list.length)} label="Next" />
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12px] text-[var(--dim)]">
        <button onClick={toggleFav} className={`flex items-center gap-1.5 hover:text-[var(--gold)] ${isFav ? "text-[var(--rust)]" : ""}`} aria-pressed={isFav}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill={isFav ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8"><path d="M12 21s-7.5-4.6-9.5-9.2C1 8.3 3.3 4.5 7 4.5c2.2 0 3.6 1.3 5 3 1.4-1.7 2.8-3 5-3 3.7 0 6 3.8 4.5 7.3C19.5 16.4 12 21 12 21z" /></svg>
          {isFav ? t("h.faved") : t("h.fav")}
        </button>
        <button
          onClick={async () => {
            const url = new URL(page("poetry", p.id), location.href).href;
            try { await navigator.clipboard.writeText(url); } catch {}
            setShared(true);
            setTimeout(() => setShared(false), 1400);
          }}
          className="flex items-center gap-1.5 hover:text-[var(--gold)]"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" /><path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4" /></svg>
          {shared ? t("s.poetry.copied") : t("h.share")}
        </button>
        <a href={page("poetry", p.id)} className="flex items-center gap-1.5 hover:text-[var(--gold)]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>
          {t("h.seePoem")}
        </a>
        <span className="flex items-center gap-1.5">
          <span className="text-[var(--gold)]">◆</span> {t("h.tags")}: <a href={page("poetry")} className="text-[var(--gold)] hover:underline"><Tx v={p.form} /></a>
        </span>
      </div>
      <div className="mt-4 flex justify-center gap-1.5" dir="ltr">
        {list.map((_, k) => (
          <button key={k} onClick={() => setI(k)} className={`h-1.5 rounded-full transition-all ${k === i ? "w-5 bg-[var(--gold)]" : "w-1.5 bg-black/15"}`} aria-label={`Poem ${k + 1}`} />
        ))}
      </div>
    </Section>
  );
}

/* ─────────────────────────── 2. recent recordings ─────────────────────────── */

function Recent() {
  const { audio } = useContent();
  const { t } = useLang();
  const [playing, setPlaying] = useState<number | null>(null);
  const el = useRef<HTMLAudioElement | null>(null);
  useEffect(() => () => el.current?.pause(), []);
  if (!audio.length) return null;
  const toggle = (i: number) => {
    const a = el.current ?? (el.current = new window.Audio());
    if (playing === i) { a.pause(); setPlaying(null); return; }
    a.pause();
    const src = audio[i].src;
    setPlaying(i);
    if (!src) return; // demo item: shows the playing state only
    a.src = src;
    a.onended = () => setPlaying(null);
    a.play().catch(() => setPlaying(null));
  };
  const hues = [18, 200, 340, 140, 40, 260];
  return (
    <Section id="audio">
      <Title sub={t("h.recentSub")}>{t("h.recent")}</Title>
      <Rail itemClass="w-[62%] sm:w-[38%] lg:w-[19%]">
        {audio.map((a, i) => (
          <div key={i}>
            <button onClick={() => toggle(i)} className="group relative block aspect-[3/4] w-full overflow-hidden rounded-lg text-start" aria-label={`${t("h.play")}`} data-audio-card>
              <div className="absolute inset-0" style={{ background: `linear-gradient(160deg, hsl(${hues[i % 6]} 40% 34%), hsl(${hues[i % 6]} 45% 14%))` }} />
              <div className="doch-bg absolute inset-0 opacity-40" />
              <span className="nastaliq absolute inset-x-3 top-6 text-center text-[clamp(18px,1.6vw,24px)] text-[#f3e3b5]" lang="bal" dir="rtl" style={{ lineHeight: 2 }}>
                {a.title.bal}
              </span>
              <span className="absolute left-1/2 top-1/2 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[var(--text)] shadow-lg transition group-hover:scale-105">
                {playing === i ? "❚❚" : "▶"}
              </span>
              {a.dur && <span className={`absolute bottom-2 end-2 rounded bg-black/60 px-1.5 py-0.5 text-[11px] text-white ${latin}`} dir="ltr">{a.dur}</span>}
            </button>
            <Tx v={a.title} as="p" className="mt-2 line-clamp-2 text-[14px] leading-snug" />
            <Tx v={a.by} as="p" className="text-[12px] text-[var(--dim)]" />
          </div>
        ))}
      </Rail>
      {audio.some((a) => !a.src) && <p className="mt-3 text-center text-[11px] text-[var(--dim)]">{t("s.audio.demo")}</p>}
    </Section>
  );
}

/* ─────────────────────────── 2b. videos ─────────────────────────── */

function Videos() {
  const { videos } = useContent();
  const { t } = useLang();
  const [play, setPlay] = useState<Video | null>(null);
  if (!videos.length) return null;
  return (
    <Section id="videos">
      <Title sub={t("vid.sub")}>{t("vid.h")}</Title>
      <Rail itemClass="w-[78%] sm:w-[46%] lg:w-[31.5%]">
        {videos.map((v) => <VideoCard key={v.id} v={v} onPlay={() => setPlay(v)} />)}
      </Rail>
      <a href={page("media")} className="sec-link">{t("media.h")}</a>
      <VideoModal v={play} onClose={() => setPlay(null)} />
    </Section>
  );
}

/* ─────────────────────────── 3. word of the day ─────────────────────────── */

function WordOfDay() {
  const { t, lang } = useLang();
  const [w, setW] = useState<DictEntry | null>(null);
  const [q, setQ] = useState("");
  useEffect(() => {
    repo.wordOfDay().then(setW).catch(() => setW(null));
  }, []);
  const g = w?.senses[0]?.gloss;
  const ex = w?.senses[0]?.examples?.[0];
  return (
    <Section id="dictionary">
      <Title>{t("d.wotd")}</Title>
      {w && g && (
        <div className="text-center">
          <a href={page("dictionary", `word-${w.slug}`)} className="inline-block">
            <span className="block font-[family-name:var(--latin-display)] text-[clamp(44px,5vw,68px)] italic leading-tight text-[var(--rust)]" lang="bal-Latn" dir="ltr">{w.latn}</span>
          </a>
          <p className="mt-1 flex items-center justify-center gap-3 text-[var(--dim)]">
            <span className="nastaliq text-[26px] text-[var(--text)]" lang="bal" dir="rtl" style={{ lineHeight: 1.8 }}>{w.arab}</span>
            {w.ipa && <><span className="text-[var(--rust)]">•</span><span className={`text-[14px] ${latin}`} dir="ltr">{w.ipa}</span></>}
          </p>
          <p className="mt-3 text-[11px] text-[var(--dim)]">{t("h.meaning")}</p>
          <p className="mt-1 text-[clamp(16px,1.4vw,19px)]" lang={lang === "ur" ? "ur" : "en"} dir={lang === "ur" ? "rtl" : "ltr"}>
            {(lang === "ur" ? g.ur : g.en) ?? g.en}
          </p>
          {ex && (
            <p className="nastaliq mx-auto mt-5 max-w-[36ch] text-[20px] text-[var(--dim)]" lang="bal" dir="rtl" style={{ lineHeight: 2.2 }}>{ex.arab}</p>
          )}
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          location.href = page("dictionary", q.trim() ? `q=${encodeURIComponent(q.trim())}` : undefined);
        }}
        className="mx-auto mt-8 flex max-w-[500px] overflow-hidden rounded-md border border-[var(--faint)] bg-white shadow-sm"
      >
        <span className="grid place-items-center bg-[var(--gold)] px-4 text-[12px] font-semibold uppercase tracking-wider text-white rtl:text-[14px] rtl:normal-case">{t("nav.dictionary")}</span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("d.searchPh")} className="min-w-0 flex-1 px-3 py-2.5 text-[14px] outline-none" aria-label={t("d.searchPh")} />
        <button className="px-3 text-[var(--dim)] hover:text-[var(--gold)]" aria-label={t("nav.search")}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        </button>
      </form>
    </Section>
  );
}

/* ─────────────────────────── 4. today's special (poet of the day) ─────────────────────────── */

function TodaysSpecial() {
  const { poets, poems } = useContent();
  const { t, lang } = useLang();
  const [i, setI] = useState(0);
  useEffect(() => {
    const day = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 864e5);
    setI(day);
  }, []);
  if (!poets.length) return null;
  const p = poets[i % poets.length];
  const verse = poems.find((x) => x.authorSlug === p.slug);
  return (
    <Section id="special">
      <Title>{t("h.special")}</Title>
      <div className="flex flex-col items-center text-center">
        <Medallion p={p} size={110} />
        <a href={page("poets", p.slug)} className="poet-name mt-5 text-[14px] uppercase tracking-[0.12em] hover:text-[var(--gold)] rtl:text-[20px] rtl:normal-case rtl:tracking-normal">
          <Tx v={p.name} />
        </a>
        <span className={`mt-1 text-[11px] tracking-[0.2em] text-[var(--dim)] ${latin}`} dir="ltr">{p.years}</span>
        <Tx v={p.bio} as="p" className="mt-4 max-w-[62ch] text-[14px] leading-relaxed text-[var(--dim)]" />
        {verse && (
          <>
            <span className="mt-6 block h-px w-16 bg-[var(--gold)]/50" />
            {(() => {
              const v = verseFor(verse, lang);
              const two = v.text.split("\n").slice(0, 2).join("\n");
              return v.rtl
                ? <Verse text={two} className="nastaliq mt-5 text-[22px] text-[var(--text)]" lang="bal" dir="rtl" style={{ lineHeight: 2.2 }} />
                : <Verse text={two} className="mt-5 text-[18px] italic leading-relaxed text-[var(--text)]" lang="bal-Latn" dir="ltr" />;
            })()}
          </>
        )}
        <a href={verse ? page("poetry", verse.id) : page("poets", p.slug)} className="sec-link">{verse ? t("s.potd.full") : t("s.potd.cta")}</a>
      </div>
    </Section>
  );
}

/* ─────────────────────────── 5. recommended poets ─────────────────────────── */

function RecommendedPoets() {
  const { poets } = useContent();
  const { t } = useLang();
  return (
    <Section id="poets" band>
      <Title>{t("h.poets")}</Title>
      <Rail>
        {poets.map((p) => (
          <a key={p.slug} href={page("poets", p.slug)} className="group block rounded-md border border-[var(--faint)] bg-white p-4 text-center transition hover:shadow-md" data-poet-card>
            <div className="mx-auto flex aspect-square w-full max-w-[150px] items-center justify-center">
              <Medallion p={p} size={130} />
            </div>
            <Tx v={p.name} as="p" className="mt-4 truncate text-[15px] group-hover:text-[var(--gold)]" />
          </a>
        ))}
      </Rail>
      <p className="mt-8 text-center text-[14px] text-[var(--dim)]">{t("h.poetsSub")}</p>
      <a href={page("poets")} className="sec-link !mt-3">{t("s.poets.viewAll")}</a>
    </Section>
  );
}

/* ─────────────────────────── 6. numbers ─────────────────────────── */

function Stats() {
  const { stats } = useContent();
  const { t } = useLang();
  const items: [string, number][] = [[t("s.stats.poets"), stats.poets], [t("s.stats.poems"), stats.poems], [t("s.stats.books"), stats.books], [t("s.stats.audio"), stats.audio]];
  return (
    <Section id="numbers">
      <div className="grid grid-cols-2 gap-6 text-center md:grid-cols-4">
        {items.map(([k, v]) => (
          <div key={k}>
            <span className={`block text-[34px] font-semibold text-[var(--gold)] ${latin}`} dir="ltr">{v.toLocaleString("en")}</span>
            <span className="text-[13px] text-[var(--dim)]">{k}</span>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ─────────────────────────── 7. library ─────────────────────────── */

function Library() {
  const { books } = useContent();
  const { t } = useLang();
  return (
    <Section id="library" band>
      <Title sub={t("h.librarySub")}>{t("h.library")}</Title>
      <Rail itemClass="w-[56%] sm:w-[34%] lg:w-[19%]">
        {books.map((b) => (
          <a key={b.id} href={page("library", b.id)} className="group block" data-book-card>
            <div className="shadow-[0_10px_30px_-12px_rgba(0,0,0,.45)] transition-transform duration-300 group-hover:-translate-y-1.5"><Cover b={b} /></div>
            <Tx v={b.title} as="p" className="mt-4 line-clamp-2 text-[16px] font-semibold leading-snug group-hover:text-[var(--gold)]" />
            <Tx v={b.author} as="p" className="mt-0.5 truncate text-[13px] text-[var(--dim)]" />
          </a>
        ))}
      </Rail>
      <a href={page("library")} className="sec-link">{t("h.browseLibrary")}</a>
    </Section>
  );
}

/* ─────────────────────────── 7b. blog ─────────────────────────── */

function readMin(a: Article) {
  const words = Object.values(a.body ?? {}).join(" ").split(/\s+/).length + Object.values(a.excerpt).join(" ").split(/\s+/).length * 6;
  return Math.max(2, Math.round(words / 220));
}

function Share({ a }: { a: Article }) {
  const { t, pick } = useLang();
  return (
    <button
      type="button"
      aria-label={t("h.share")}
      onClick={(e) => {
        e.preventDefault();
        const url = new URL(page("articles", a.slug), location.href).href;
        if (navigator.share) navigator.share({ title: pick(a.title).text, url }).catch(() => {});
        else navigator.clipboard?.writeText(url);
      }}
      className="text-[var(--dim)] hover:text-[var(--gold)]"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" /><path d="m8.2 10.8 7.6-4.5M8.2 13.2l7.6 4.5" /></svg>
    </button>
  );
}

function BlogMeta({ a }: { a: Article }) {
  const { t } = useLang();
  const { poets } = useContent();
  const date = useDate();
  const author = poets.find((p) => p.slug === a.authorSlug)?.name ?? a.authorText;
  return (
    <p className="mt-3 flex flex-wrap items-center gap-x-2 text-[12px] text-[var(--dim)]">
      {author && <><span>{t("art.by")}</span><Tx v={author} className="font-medium text-[var(--text)]" /><span>|</span></>}
      <Latin>{date(a.date)}</Latin><span>|</span>
      <span><Latin>{readMin(a)}</Latin> {t("art.minRead")}</span>
      <span className="ms-auto"><Share a={a} /></span>
    </p>
  );
}

function BlogImg({ a, className }: { a: Article; className: string }) {
  return (
    <div className={`relative overflow-hidden bg-[var(--ink-3)] ${className}`}>
      {a.cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={a.cover} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]" />
      ) : (
        <div className="doch-bg absolute inset-0 grid place-items-center opacity-80"><Tx v={a.title} className="nastaliq px-4 text-center text-[20px] text-[var(--gold)]" /></div>
      )}
    </div>
  );
}

function Blog() {
  const { articles } = useContent();
  const { t } = useLang();
  if (!articles.length) return null;
  const [first, ...rest] = articles;
  return (
    <Section id="articles">
      <Title sub={t("art.sub")}>{t("art.blog")}</Title>
      <div className={rest.length ? "grid gap-6 lg:grid-cols-[1.1fr_1fr]" : "mx-auto grid max-w-[720px]"}>
        <a href={page("articles", first.slug)} data-anim data-article-card className="group flex flex-col overflow-hidden rounded-md border border-[var(--faint)] bg-white shadow-sm transition hover:shadow-md">
          <BlogImg a={first} className="aspect-[16/9]" />
          <div className="flex flex-1 flex-col p-6">
            <Tx v={first.title} as="h3" className="text-[24px] font-semibold leading-snug group-hover:text-[var(--gold)]" />
            <Tx v={first.excerpt} as="p" className="mt-2 line-clamp-3 flex-1 text-[15px] leading-relaxed text-[var(--dim)]" />
            <span className="mt-3 text-[13px] font-medium text-[var(--gold)]">{t("art.read")}</span>
            <BlogMeta a={first} />
          </div>
        </a>
        {rest.length > 0 && <div className="grid content-start gap-6">
          {rest.slice(0, 2).map((a) => (
            <a key={a.slug} href={page("articles", a.slug)} data-anim data-article-card className="group flex overflow-hidden rounded-md border border-[var(--faint)] bg-white shadow-sm transition hover:shadow-md">
              <BlogImg a={a} className="w-[38%] shrink-0 min-h-[180px]" />
              <div className="flex min-w-0 flex-1 flex-col p-5">
                <Tx v={a.title} as="h3" className="line-clamp-2 text-[18px] font-semibold leading-snug group-hover:text-[var(--gold)]" />
                <Tx v={a.excerpt} as="p" className="mt-1.5 line-clamp-2 flex-1 text-[14px] leading-relaxed text-[var(--dim)]" />
                <span className="mt-2 text-[13px] font-medium text-[var(--gold)]">{t("art.read")}</span>
                <BlogMeta a={a} />
              </div>
            </a>
          ))}
        </div>}
      </div>
      <a href={page("articles")} className="sec-link">{t("art.all")}</a>
    </Section>
  );
}

/* ─────────────────────────── 7c. poetry collection ─────────────────────────── */

function Collections() {
  const { poems, poets } = useContent();
  const { t } = useLang();
  const forms = new Map<string, { l: Poem["form"]; n: number }>();
  for (const p of poems) {
    const k = formKey(p.form);
    const f = forms.get(k);
    if (f) f.n++; else forms.set(k, { l: formByKey(k)?.l ?? p.form, n: 1 });
  }
  const byPoet = poets.map((p) => ({ p, n: poems.filter((x) => x.authorSlug === p.slug).length })).filter((x) => x.n > 0);
  const hues = [28, 205, 345, 150, 45, 265, 10, 185];
  const cards: { key: string; title: ReactNode; bal: string; n: number; href: string }[] = [
    ...[...forms.entries()].sort((a, b) => formOrder(a[0]) - formOrder(b[0])).map(([k, f]) => ({ key: "f-" + k, title: <Tx v={f.l} />, bal: f.l.bal, n: f.n, href: page("poetry", "form=" + encodeURIComponent(k)) })),
    ...byPoet.map(({ p, n }) => ({ key: "p-" + p.slug, title: <Tx v={p.name} />, bal: p.name.bal, n, href: page("poets", p.slug) })),
  ];
  if (!cards.length) return null;
  return (
    <Section id="collections">
      <Title sub={t("h.collSub")}>{t("h.coll")}</Title>
      <Rail itemClass="w-[62%] sm:w-[36%] lg:w-[23%]">
        {cards.map((c, i) => (
          <a key={c.key} href={c.href} className="group block" data-collection-card>
            <div className="relative aspect-[4/3] overflow-hidden rounded-md">
              <div className="absolute inset-0 transition duration-500 group-hover:scale-105" style={{ background: `linear-gradient(150deg, hsl(${hues[i % 8]} 38% 40%), hsl(${hues[i % 8]} 44% 16%))` }} />
              <div className="doch-bg absolute inset-0 opacity-30" />
              <span className="nastaliq absolute inset-0 grid place-items-center px-4 text-center text-[clamp(24px,2.2vw,34px)] text-[#f3e3b5]" lang="bal" dir="rtl" style={{ lineHeight: 2 }}>{c.bal}</span>
            </div>
            <p className="mt-3 text-[16px] font-semibold group-hover:text-[var(--gold)]">{c.title}</p>
            <p className="text-[12px] text-[var(--dim)]"><Latin>{c.n}</Latin> {t("h.poems")}</p>
          </a>
        ))}
      </Rail>
      <a href={page("poetry")} className="sec-link">{t("h.collAll")}</a>
    </Section>
  );
}

/* ─────────────────────────── 7d. more from Labzaank (products) ─────────────────────────── */

function Explore() {
  const { t } = useLang();
  const items: { k: DictKey; d: DictKey; href: string; hue: number; glyph: string; bal: string }[] = [
    { k: "nav.dictionary", d: "x.dict", href: page("dictionary"), hue: 28, glyph: "لبز", bal: "لبزبلد" },
    { k: "nav.books", d: "x.lib", href: page("library"), hue: 205, glyph: "کتاب", bal: "کتابجاہ" },
    { k: "nav.media", d: "x.media", href: page("media"), hue: 345, glyph: "توار", bal: "توار ءُ ویڈیو" },
    { k: "nav.articles", d: "x.art", href: page("articles"), hue: 150, glyph: "نبشتہ", bal: "نبشتانک" },
  ];
  return (
    <Section id="explore">
      <Title>{t("h.explore")}</Title>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((x) => (
          <article key={x.k} data-anim data-explore-card className="flex flex-col overflow-hidden rounded-md border border-[var(--faint)] bg-white shadow-sm">
            <div className="relative grid h-40 place-items-center" style={{ background: `linear-gradient(135deg, hsl(${x.hue} 42% 42%), hsl(${x.hue} 46% 20%))` }}>
              <div className="doch-bg absolute inset-0 opacity-25" />
              <span className="nastaliq relative text-[40px] text-[#f3e3b5]" lang="bal" dir="rtl" style={{ lineHeight: 1.9 }}>{x.bal}</span>
            </div>
            <div className="flex flex-1 flex-col p-5">
              <h3 className="text-[18px] font-semibold">{t(x.k)}</h3>
              <p className="mt-2 flex-1 text-[14px] leading-relaxed text-[var(--dim)]">{t(x.d)}</p>
              <a href={x.href} className="mt-5 self-start rounded border border-[var(--gold)] px-4 py-1.5 text-[13px] font-semibold uppercase tracking-wider text-[var(--gold)] transition hover:bg-[var(--gold)] hover:text-white rtl:normal-case rtl:tracking-normal">{t("h.learn")}</a>
            </div>
          </article>
        ))}
      </div>
    </Section>
  );
}

/* ─────────────────────────── 8. news & events ─────────────────────────── */

function Events() {
  const { events } = useContent();
  const { t } = useLang();
  if (!events.length) return null;
  return (
    <Section id="events">
      <Title>{t("h.events")}</Title>
      <div className="grid gap-5 md:grid-cols-3">
        {events.map((e, i) => (
          <article key={i} data-anim className="flex gap-4 rounded-md border border-[var(--faint)] bg-white p-5 shadow-sm">
            <div className="w-16 shrink-0 rounded-md bg-[var(--ink-2)] py-2 text-center">
              <span className={`block text-[26px] font-semibold leading-none text-[var(--gold)] ${latin}`} dir="ltr">{e.day}</span>
              <Tx v={e.month} className="mt-1 block text-[11px] text-[var(--dim)]" />
            </div>
            <div className="min-w-0">
              <Tx v={e.title} as="p" className="text-[16px] font-medium leading-snug" />
              <p className="mt-1 flex items-center gap-1 text-[13px] text-[var(--dim)]">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></svg>
                <Tx v={e.place} />
              </p>
            </div>
          </article>
        ))}
      </div>
    </Section>
  );
}

/* ─────────────────────────── 9. folk / more from Labzaank ─────────────────────────── */

function Folk() {
  const { folk } = useContent();
  const { t } = useLang();
  return (
    <Section id="folk" band>
      <Title sub={t("h.folkSub")}>{t("h.folk")}</Title>
      <Rail>
        {folk.map((f, i) => (
          <article key={i} className="flex h-full flex-col rounded-md border border-[var(--faint)] bg-white p-5 shadow-sm">
            <span className="grid h-24 place-items-center rounded bg-[var(--ink-2)] text-[34px] text-[var(--gold)]">{f.glyph}</span>
            <Tx v={f.title} as="p" className="mt-4 text-[16px] font-medium" />
            <Tx v={f.body} as="p" className="mt-1 line-clamp-3 flex-1 text-[13px] leading-relaxed text-[var(--dim)]" />
          </article>
        ))}
      </Rail>
    </Section>
  );
}

/* ─────────────────────────── optional bands ─────────────────────────── */

function Manifesto() {
  const { t } = useLang();
  return (
    <Section id="story">
      <p className="sec-title">{t("s.manifesto.k")}</p>
      <h2 className="display mx-auto mt-4 max-w-[20ch] text-center text-[clamp(28px,3.4vw,46px)]">{t("s.manifesto.h")}</h2>
    </Section>
  );
}

function ClosingCta() {
  const { t } = useLang();
  return (
    <Section>
      <div className="text-center">
        <h2 className="display mx-auto max-w-[22ch] text-[clamp(26px,3vw,40px)]">{t("s.cta.h")}</h2>
        <a href="#contact" className="pill pill-gold mt-6">{t("s.cta.contrib")}</a>
      </div>
    </Section>
  );
}

function Newsletter() {
  const { t, lang } = useLang();
  const [email, setEmail] = useState("");
  const [agree, setAgree] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email) || !agree) return;
    if (!supabase) return setDone(true);
    setBusy(true);
    setErr("");
    const { error } = await supabase.from("newsletter_subscribers").insert({ email: email.trim().toLowerCase(), lang });
    setBusy(false);
    if (error && error.code !== "23505") return setErr(error.message); // 23505 = already subscribed
    setDone(true);
  };
  return (
    <section className="bg-[var(--band)] py-10 text-center text-white" id="newsletter">
      <div className="wrap">
        <h2 className="text-[14px] font-semibold uppercase tracking-[0.18em] text-[#e9c27a] rtl:text-[19px] rtl:normal-case rtl:tracking-normal">{t("s.news.k")}</h2>
        <p className="mt-2 text-[13px] text-white/70">{t("s.news.h")}</p>
        {done ? (
          <p className="mt-5 text-[#e9c27a]">{supabase ? t("s.news.okLive") : t("s.news.ok")}</p>
        ) : (
          <form onSubmit={submit} className="mx-auto mt-5 max-w-[460px]">
            <div className="flex overflow-hidden rounded">
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("s.news.ph")} className="min-w-0 flex-1 bg-white px-3 py-2 text-[14px] text-[var(--text)] outline-none" dir="ltr" />
              <button className="bg-[var(--gold)] px-5 text-[13px] font-semibold uppercase tracking-wider text-white hover:bg-[var(--gold-bright)] disabled:opacity-50 rtl:normal-case" disabled={busy || !agree}>
                {busy ? "…" : t("s.news.btn")}
              </button>
            </div>
            <label className="mt-3 flex items-center justify-center gap-2 text-[12px] text-white/75">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /> {t("f.agree")}
            </label>
          </form>
        )}
        {err && <p className="mt-3 text-[13px] text-[#f0a080]" lang="en" dir="ltr">{err}</p>}
      </div>
    </section>
  );
}

/* ─────────────────────────── footer ─────────────────────────── */

export function ContactForm({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const { t } = useLang();
  const [f, setF] = useState({ name: "", email: "", message: "" });
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [err, setErr] = useState("");
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!f.name.trim() || !/^\S+@\S+\.\S+$/.test(f.email) || f.message.trim().length < 2) return;
    if (!supabase) return setState("done");
    setState("busy");
    setErr("");
    const { error } = await supabase.from("contact_messages").insert({ name: f.name.trim(), email: f.email.trim(), message: f.message.trim() });
    if (error) {
      setState("idle");
      return setErr(error.message);
    }
    setState("done");
  };
  const field = `w-full rounded bg-white px-3 py-2 text-[var(--text)] outline-none ${tone === "light" ? "border border-[var(--faint)] text-[15px] focus:border-[var(--gold)]/60" : "text-[13px]"}`;
  if (state === "done") return <p className={`text-[14px] ${tone === "light" ? "text-[var(--gold)]" : "text-[#e9c27a]"}`} data-contact-done>{t("f.sent")}</p>;
  return (
    <form onSubmit={submit} className="flex flex-col gap-2" data-contact>
      <input required maxLength={200} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder={t("f.name")} className={field} />
      <input required type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder={t("f.email")} className={field} dir="ltr" />
      <textarea required minLength={2} maxLength={5000} rows={4} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} placeholder={t("f.msg")} className={field} />
      <button disabled={state === "busy"} className="mt-1 self-end rounded bg-[var(--gold)] px-5 py-2 text-[12px] font-semibold uppercase tracking-wider text-white hover:bg-[var(--gold-bright)] disabled:opacity-50 rtl:normal-case">
        {state === "busy" ? "…" : t("f.send")}
      </button>
      {err && <p className="text-[12px] text-[#f0a080]" lang="en" dir="ltr">{err}</p>}
    </form>
  );
}

function Footer() {
  const { t } = useLang();
  const cols: [string, [string, string][]][] = [
    [t("f.quick"), [[t("nav.poets"), page("poets")], [t("nav.poetry"), page("poetry")], [t("nav.dictionary"), page("dictionary")], [t("nav.books"), page("library")]]],
    [t("f.site"), [[t("nav.about"), page("about")], [t("nav.contact"), page("contact")], [t("nav.privacy"), page("privacy")], [t("nav.terms"), page("terms")], [t("f.admin"), page("admin")]]],
    [t("f.explore"), [[t("nav.articles"), page("articles")], [t("nav.media"), page("media")], [t("nav.culture"), "#folk"], [t("d.wotd"), "#dictionary"], [t("nav.search"), "#search"]]],
  ];
  return (
    <footer id="footer" className="bg-[var(--band)] text-white/80">
      <div className="wrap grid gap-10 border-t border-white/10 py-12 md:grid-cols-[repeat(3,1fr)_1.4fr]">
        {cols.map(([h, links]) => (
          <div key={h}>
            <h4 className="mb-4 text-[12px] font-semibold uppercase tracking-[0.16em] text-[#e9c27a] rtl:text-[15px] rtl:normal-case rtl:tracking-normal">{h}</h4>
            {links.map(([label, href]) => (
              <a
                key={label}
                href={href}
                onClick={href === "#search" ? (e) => { e.preventDefault(); openSearch(); } : undefined}
                className="mb-2.5 block text-[13px] text-white/75 hover:text-white"
              >
                {label}
              </a>
            ))}
          </div>
        ))}
        <div id="contact">
          <h4 className="mb-4 text-[12px] font-semibold uppercase tracking-[0.16em] text-[#e9c27a] rtl:text-[15px] rtl:normal-case rtl:tracking-normal">{t("f.write")}</h4>
          <ContactForm />
        </div>
      </div>
      <div className="wrap flex flex-wrap items-center justify-between gap-4 border-t border-white/10 py-5 text-[12px] text-white/55">
        <span className="flex items-baseline gap-2">
          <Logo className="text-[20px] text-[#e9c27a]" imgClass="h-[30px]" variant="dark" />
          <span lang="en" dir="ltr" className={latin}>© 2026</span>
        </span>
        <span className="max-w-[70ch]">
          {t("f.fine")}
          <span className={`mt-1 block text-[11px] text-white/40 ${latin}`} lang="en" dir="ltr">
            Nastaliq type: <a href="https://github.com/abbassiddiqi/mehr" className="underline hover:text-white/70" target="_blank" rel="noopener">Mehr Nastaliq Web</a> by Muhammad Zeeshan Nasar after the calligraphy of Nasrullah Mehr, <a href="https://creativecommons.org/licenses/by-sa/4.0/" className="underline hover:text-white/70" target="_blank" rel="noopener">CC BY-SA 4.0</a>
          </span>
        </span>
      </div>
    </footer>
  );
}

/* ─────────────────────────── assembly ─────────────────────────── */

const SECTIONS: Record<SectionKey, () => ReactNode> = {
  poetry: TopPoetry, audio: Recent, videos: Videos, articles: Blog, dictionary: WordOfDay, potd: TodaysSpecial, history: HistorySky, poets: RecommendedPoets, collections: Collections, explore: Explore,
  stats: Stats, library: Library, events: Events, folk: Folk, manifesto: Manifesto, newsletter: Newsletter, cta: ClosingCta,
};

/** GSAP: titles and cards rise in as they enter the viewport (batched; skipped for reduced motion). */
function useReveal(dep: unknown) {
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      const els = gsap.utils.toArray<HTMLElement>("main [data-anim]:not([data-anim-done])");
      gsap.set(els, { opacity: 0, y: 28 });
      ScrollTrigger.batch(els, {
        start: "top 90%",
        once: true,
        onEnter: (batch) => {
          batch.forEach((el) => el.setAttribute("data-anim-done", ""));
          gsap.to(batch, { opacity: 1, y: 0, duration: 0.8, stagger: 0.08, ease: "power3.out", overwrite: true });
        },
      });
    });
    return () => ctx.revert();
  }, [dep]);
}

export default function BrandSections() {
  const { sections, loaded } = useContent();
  useReveal(`${sections.join()}|${loaded}`);
  return (
    <div>
      {sections.map((k) => {
        const S = SECTIONS[k];
        return <S key={k} />;
      })}
      <Footer />
    </div>
  );
}
