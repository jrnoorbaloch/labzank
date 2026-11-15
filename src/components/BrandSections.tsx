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
    <div className="mb-8">
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
          <div key={i} className={`shrink-0 snap-start ${itemClass}`}>{c}</div>
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
  const lines = p.original.split("\n").slice(0, 2);
  const roman = p.roman.split("\n").slice(0, 2);
  const isFav = fav.includes(p.id);
  const toggleFav = () => {
    const next = isFav ? fav.filter((x) => x !== p.id) : [...fav, p.id];
    setFav(next);
    try { localStorage.setItem("labzank-favs", JSON.stringify(next)); } catch {}
  };
  const showRoman = lang === "en" || lang === "bal-latn";
  return (
    <Section id="poetry">
      <Title>{t("h.top")}</Title>
      <div className="flex items-center gap-4">
        <Arrow dir="prev" onClick={() => setI((x) => (x - 1 + list.length) % list.length)} label="Previous" />
        <div className="flex-1 text-center" data-top-poem={p.id}>
          {showRoman && p.roman ? (
            <p className="whitespace-pre-line font-[family-name:var(--latin-display)] text-[clamp(19px,1.8vw,25px)] italic leading-[1.9] text-[var(--text)]/85" lang="bal-Latn" dir="ltr">
              {roman.join("\n")}
            </p>
          ) : null}
          <p className={`nastaliq whitespace-pre-line text-[clamp(20px,2vw,28px)] text-[var(--text)] ${showRoman && p.roman ? "mt-2 text-[var(--dim)]" : ""}`} lang="bal" dir="rtl" style={{ lineHeight: 2.3 }}>
            {lines.join("\n")}
          </p>
          <a href={poet ? page("poets", poet.slug) : page("poetry", p.id)} className="mt-3 inline-block text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--text)] hover:text-[var(--gold)] rtl:text-[15px] rtl:normal-case rtl:tracking-normal">
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
  const { t } = useLang();
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
        <a href={page("poets", p.slug)} className="mt-5 text-[14px] font-semibold uppercase tracking-[0.16em] hover:text-[var(--gold)] rtl:text-[20px] rtl:normal-case rtl:tracking-normal">
          <Tx v={p.name} />
        </a>
        <span className={`mt-1 text-[11px] tracking-[0.2em] text-[var(--dim)] ${latin}`} dir="ltr">{p.years}</span>
        <Tx v={p.bio} as="p" className="mt-4 max-w-[62ch] text-[14px] leading-relaxed text-[var(--dim)]" />
        {verse && (
          <p className="nastaliq mt-5 whitespace-pre-line text-[20px] text-[var(--text)]" lang="bal" dir="rtl" style={{ lineHeight: 2.2 }}>
            {verse.original.split("\n").slice(0, 2).join("\n")}
          </p>
        )}
        <a href={page("poets", p.slug)} className="sec-link">{t("s.potd.cta")}</a>
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
      <Rail itemClass="w-[40%] sm:w-[26%] lg:w-[15.5%]">
        {books.map((b) => (
          <a key={b.id} href={page("library", b.id)} className="group block" data-book-card>
            <div className="transition-transform duration-300 group-hover:-translate-y-1"><Cover b={b} /></div>
            <Tx v={b.title} as="p" className="mt-3 truncate text-[14px] font-medium group-hover:text-[var(--gold)]" />
            <Tx v={b.author} as="p" className="truncate text-[12px] text-[var(--dim)]" />
          </a>
        ))}
      </Rail>
      <a href={page("library")} className="sec-link">{t("h.browseLibrary")}</a>
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
          <article key={i} className="flex gap-4 rounded-md border border-[var(--faint)] bg-white p-5 shadow-sm">
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

/* ─────────────────────────── 9. folk / more from labzank ─────────────────────────── */

function Folk() {
  const { folk } = useContent();
  const { t } = useLang();
  return (
    <Section id="folk" band>
      <Title sub={t("s.folk.k")}>{t("h.more")}</Title>
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

function ContactForm() {
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
  const field = "w-full rounded bg-white px-3 py-2 text-[13px] text-[var(--text)] outline-none";
  if (state === "done") return <p className="text-[14px] text-[#e9c27a]" data-contact-done>{t("f.sent")}</p>;
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
    [t("f.site"), [[t("nav.about"), "#story"], [t("nav.contact"), "#contact"], [t("nav.articles"), "#events"], [t("f.admin"), page("admin")]]],
    [t("f.explore"), [[t("nav.media"), "#audio"], [t("nav.culture"), "#folk"], [t("d.wotd"), "#dictionary"], [t("nav.search"), "#search"]]],
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
          <span className="nastaliq text-[20px] text-[#e9c27a]" lang="bal" style={{ lineHeight: 1.6 }}>لبزانک</span>
          <span lang="en" dir="ltr" className={latin}>© 2026 Labzank</span>
        </span>
        <span className="max-w-[70ch]">{t("f.fine")}</span>
      </div>
    </footer>
  );
}

/* ─────────────────────────── assembly ─────────────────────────── */

const SECTIONS: Record<SectionKey, () => ReactNode> = {
  poetry: TopPoetry, audio: Recent, dictionary: WordOfDay, potd: TodaysSpecial, poets: RecommendedPoets,
  stats: Stats, library: Library, events: Events, folk: Folk, manifesto: Manifesto, newsletter: Newsletter, cta: ClosingCta,
};

export default function BrandSections() {
  const { sections } = useContent();
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
