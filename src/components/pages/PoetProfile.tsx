"use client";
/**
 * Poet / author profile (Rekhta style). Everything is grouped automatically:
 * poems by their standard form (ghazal, nazm, sher …), then prose, books,
 * audio and video — each with a count in the tab bar. Tabs live in the URL
 * hash (#slug/ghazal) so "See all" links and shared links open the same tab.
 */
import { ReactNode, useEffect, useMemo, useState } from "react";
import { L, Tx, useLang } from "@/lib/i18n";
import type { DictKey } from "@/lib/dict";
import type { Poem, Poet, Video } from "@/lib/content";
import { useContent } from "@/lib/content-store";
import { page } from "@/lib/links";
import { formByKey, formKey, formOrder } from "@/lib/forms";
import { Cover, Medallion } from "@/components/BrandSections";
import { Verse } from "@/components/WordLookup";
import { Latin, useTitle } from "./Literature";
import { ProseCard, VideoCard, VideoModal } from "./Extra";

type Tab = { key: string; label: ReactNode; n?: number };

const FAV_POEMS = "labzank-favs";
const FAV_POETS = "labzaank-fav-poets";
const readList = (k: string): string[] => {
  try { return JSON.parse(localStorage.getItem(k) || "[]"); } catch { return []; }
};
const writeList = (k: string, v: string[]) => {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch {}
};

function useFavs(key: string) {
  const [list, setList] = useState<string[]>([]);
  useEffect(() => setList(readList(key)), [key]);
  const toggle = (id: string) => {
    const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
    setList(next);
    writeList(key, next);
  };
  return { has: (id: string) => list.includes(id), toggle };
}

const Heart = ({ on, size = 16 }: { on: boolean; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" aria-hidden>
    <path d="M12 21s-7.5-4.6-9.5-9.2C1 8.3 3.3 4.5 7 4.5c2.2 0 3.6 1.3 5 3 1.4-1.7 2.8-3 5-3 3.7 0 6 3.8 4.5 7.3C19.5 16.4 12 21 12 21z" />
  </svg>
);

export function PoetProfile({ p, tab }: { p: Poet; tab: string }) {
  const c = useContent();
  const { t, pick, lang } = useLang();
  useTitle(pick(p.name).text);
  const fav = useFavs(FAV_POETS);
  const [copied, setCopied] = useState(false);
  const [video, setVideo] = useState<Video | null>(null);

  const poems = c.poems.filter((x) => x.authorSlug === p.slug);
  const byForm = useMemo(() => {
    const m = new Map<string, Poem[]>();
    for (const x of poems) {
      const k = formKey(x.form);
      m.set(k, [...(m.get(k) ?? []), x]);
    }
    return [...m.entries()].sort((a, b) => formOrder(a[0]) - formOrder(b[0]));
  }, [poems]);
  const prose = c.prose.filter((x) => x.authorSlug === p.slug);
  const books = c.books.filter((x) => x.authorSlug === p.slug);
  const audio = c.audio.filter((x) => x.authorSlug === p.slug);
  const videos = c.videos.filter((x) => x.authorSlug === p.slug);

  const formLabel = (k: string, list: Poem[]): L => formByKey(k)?.l ?? list[0].form;
  const tabs: Tab[] = [
    { key: "", label: t("pf.all") },
    { key: "profile", label: t("pf.profile") },
    ...byForm.map(([k, list]) => ({ key: k, label: <Tx v={formLabel(k, list)} />, n: list.length })),
    ...(prose.length ? [{ key: "prose", label: t("pf.prose"), n: prose.length }] : []),
    ...(books.length ? [{ key: "books", label: t("pg.books"), n: books.length }] : []),
    ...(audio.length ? [{ key: "audio", label: t("pg.audio"), n: audio.length }] : []),
    ...(videos.length ? [{ key: "video", label: t("pf.video"), n: videos.length }] : []),
  ];
  const active = tabs.some((x) => x.key === tab) ? tab : "";
  const href = (k: string) => page("poets", k ? `${p.slug}/${k}` : p.slug);
  const showRoman = lang === "en" || lang === "bal-latn";

  const share = async () => {
    const url = new URL(page("poets", p.slug), location.href).href;
    if (navigator.share) return navigator.share({ title: pick(p.name).text, url }).catch(() => {});
    await navigator.clipboard?.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  /* ── one block per category ── */
  const Block = ({ k, title, n, limit, children }: { k: string; title: ReactNode; n: number; limit: number; children: ReactNode }) => (
    <section className="mt-12 first:mt-8" data-profile-block={k}>
      <h3 className="text-[15px] font-bold uppercase tracking-[0.06em] rtl:text-[19px] rtl:normal-case rtl:tracking-normal">
        {title} <sup className="ms-0.5 text-[11px] font-normal text-[var(--dim)]"><Latin>{n}</Latin></sup>
      </h3>
      <span className="mt-3 block h-px w-8 bg-[var(--faint)]" />
      <div className="mt-5">{children}</div>
      {active === "" && n > limit && (
        <p className="mt-6 text-center"><a href={href(k)} className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--gold)] hover:underline rtl:normal-case rtl:tracking-normal">{t("pf.seeAll")}</a></p>
      )}
    </section>
  );

  const PoemRows = ({ list }: { list: Poem[] }) => {
    const pf = useFavs(FAV_POEMS);
    return (
      <ul className="divide-y divide-[var(--faint)] border-y border-[var(--faint)]">
        {list.map((x) => {
          const line = showRoman && x.roman ? x.roman.split("\n")[0] : x.original.split("\n")[0];
          return (
            <li key={x.id} className="flex items-center gap-3 py-3.5" data-profile-poem>
              <button onClick={() => pf.toggle(x.id)} aria-pressed={pf.has(x.id)} aria-label={t("pf.follow")} className={`shrink-0 ${pf.has(x.id) ? "text-[var(--rust)]" : "text-[var(--dim)] hover:text-[var(--gold)]"}`}>
                <Heart on={pf.has(x.id)} />
              </button>
              <a href={page("poetry", x.id)} className="min-w-0 flex-1 truncate hover:text-[var(--gold)]">
                {showRoman && x.roman ? (
                  <span className="text-[15px]" lang="bal-Latn" dir="ltr">{line}</span>
                ) : (
                  <span className="nastaliq text-[19px]" lang="bal" dir="rtl" style={{ lineHeight: 2 }}>{line}</span>
                )}
              </a>
              {x.sample && <span className="shrink-0 text-[11px] text-[var(--dim)]">{t("ui.sample")}</span>}
            </li>
          );
        })}
      </ul>
    );
  };

  const Couplets = ({ list }: { list: Poem[] }) => (
    <div className="space-y-10">
      {list.map((x) => (
        <div key={x.id} className="text-center" data-profile-sher>
          {showRoman && x.roman && <Verse text={x.roman.split("\n").slice(0, 2).join("\n")} className="text-[18px] italic leading-[1.9] tracking-wide" lang="bal-Latn" dir="ltr" />}
          <Verse text={x.original.split("\n").slice(0, 2).join("\n")} className={`nastaliq text-[22px] ${showRoman && x.roman ? "mt-1 text-[var(--dim)]" : ""}`} lang="bal" dir="rtl" style={{ lineHeight: 2.2 }} />
          <a href={page("poetry", x.id)} className="mx-auto mt-4 block h-px w-12 bg-[var(--faint)]" aria-label="Open" />
        </div>
      ))}
    </div>
  );

  const section = (k: string, limit: number): ReactNode => {
    const one = active === k;
    const lim = one ? Infinity : limit;
    const fl = byForm.find(([fk]) => fk === k);
    if (fl) {
      const [, list] = fl;
      const items = list.slice(0, lim);
      return <Block key={k} k={k} title={<Tx v={formLabel(k, list)} />} n={list.length} limit={limit}>{k === "sher" || k === "rubai" || k === "qita" ? <Couplets list={items} /> : <PoemRows list={items} />}</Block>;
    }
    if (k === "prose" && prose.length)
      return <Block key={k} k={k} title={t("pf.prose")} n={prose.length} limit={limit}><div className="grid gap-5 sm:grid-cols-2">{prose.slice(0, lim).map((x) => <ProseCard key={x.slug} x={x} compact={!one} />)}</div></Block>;
    if (k === "books" && books.length)
      return (
        <Block key={k} k={k} title={t("pg.books")} n={books.length} limit={limit}>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
            {books.slice(0, lim).map((b) => (
              <a key={b.id} href={page("library", b.id)} className="group block" data-profile-book>
                <div className="transition-transform duration-300 group-hover:-translate-y-1"><Cover b={b} /></div>
                <Tx v={b.title} as="p" className="mt-3 line-clamp-2 text-[14px] font-medium group-hover:text-[var(--gold)]" />
                {b.year && <Latin className="text-[12px] text-[var(--dim)]">{b.year}</Latin>}
              </a>
            ))}
          </div>
        </Block>
      );
    if (k === "audio" && audio.length)
      return (
        <Block key={k} k={k} title={t("pg.audio")} n={audio.length} limit={limit}>
          <ul className="divide-y divide-[var(--faint)] border-y border-[var(--faint)]">
            {audio.slice(0, lim).map((a, i) => (
              <li key={i} className="flex flex-wrap items-center gap-4 py-3">
                <div className="min-w-[180px] flex-1"><Tx v={a.title} className="block text-[15px]" /><Tx v={a.by} className="block text-[12px] text-[var(--dim)]" /></div>
                {a.src ? <audio controls preload="none" src={a.src} className="h-9 max-w-full" /> : <Latin className="text-[13px] text-[var(--dim)]">{a.dur}</Latin>}
              </li>
            ))}
          </ul>
        </Block>
      );
    if (k === "video" && videos.length)
      return (
        <Block key={k} k={k} title={t("pf.video")} n={videos.length} limit={limit}>
          <div className="grid gap-6 sm:grid-cols-2">
            {videos.slice(0, lim).map((v) => (
              <div key={v.id}><VideoCard v={v} onPlay={() => setVideo(v)} /><Tx v={v.title} as="p" className="mt-2 text-[14px] font-medium" /></div>
            ))}
          </div>
        </Block>
      );
    return null;
  };

  const Profile = () => (
    <section className="mt-8" data-profile-bio>
      <Tx v={p.bio} as="p" className="max-w-[65ch] text-[17px] leading-[1.9] text-[var(--text)]" />
      <dl className="mt-8 grid gap-5 border-t border-[var(--faint)] pt-6 sm:grid-cols-2">
        {([
          ["pf.years", <Latin key="y">{p.years}</Latin>],
          ["pf.born", <Tx key="b" v={p.place} />],
          ["pf.era", t(p.period === "classical" ? "s.poets.classical" : "s.poets.modern")],
          ["pf.works", <span key="w">{tabs.filter((x) => x.n).map((x, i) => <span key={x.key}>{i > 0 && " · "}{x.label} <Latin>{x.n}</Latin></span>)}</span>],
        ] as [DictKey, ReactNode][]).map(([k, v]) => (
          <div key={k}>
            <dt className="text-[12px] uppercase tracking-[0.12em] text-[var(--dim)] rtl:normal-case rtl:tracking-normal">{t(k)}</dt>
            <dd className="mt-1 text-[16px]">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );

  const keys = [...byForm.map(([k]) => k), "prose", "books", "audio", "video"];
  const limits: Record<string, number> = { sher: 4, rubai: 4, qita: 4, prose: 4, books: 4, audio: 5, video: 2 };
  const empty = tabs.length === 2;

  // more poets from the same place, or the same era
  const placeKey = (x: Poet) => (x.place.en ?? x.place["bal-latn"] ?? x.place.bal).split(",").pop()!.trim().toLowerCase();
  const samePlace = c.poets.filter((x) => x.slug !== p.slug && placeKey(x) === placeKey(p));
  const more = samePlace.length ? samePlace : c.poets.filter((x) => x.slug !== p.slug && x.period === p.period);

  return (
    <div data-poet-profile={p.slug}>
      {/* banner */}
      <header className="relative overflow-hidden bg-[var(--band)] text-white">
        {p.photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.photo} alt="" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-25 blur-xl" />
        )}
        <div className="doch-bg absolute inset-0 opacity-[.12]" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/45 to-transparent rtl:bg-gradient-to-l" />
        <div className="wrap relative"><div className="flex flex-col items-center gap-6 py-10 text-center sm:flex-row sm:text-start md:py-12">
          <div className="rounded-full p-1.5 ring-4 ring-white/85"><Medallion p={p} size={150} /></div>
          <div>
            <p className="text-[12px] uppercase tracking-[0.2em] text-white/60 rtl:normal-case rtl:tracking-normal">{t(p.period === "classical" ? "s.poets.classical" : "s.poets.modern")}</p>
            <div className="mt-1 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
              <h1 className="poet-name text-[clamp(28px,4vw,42px)] uppercase leading-tight tracking-[0.02em] rtl:normal-case"><Tx v={p.name} /></h1>
              <button onClick={() => fav.toggle(p.slug)} aria-pressed={fav.has(p.slug)} aria-label={t("pf.follow")} className={`grid h-9 w-9 place-items-center rounded-full hover:bg-white/10 ${fav.has(p.slug) ? "text-[#ff8f8f]" : "text-white/85"}`} data-fav-poet><Heart on={fav.has(p.slug)} size={20} /></button>
              <button onClick={share} aria-label={t("h.share")} className="grid h-9 w-9 place-items-center rounded-full text-white/85 hover:bg-white/10">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" /><path d="m8.2 10.8 7.6-4.5M8.2 13.2l7.6 4.5" /></svg>
              </button>
              {copied && <span className="text-[12px] text-white/75">{t("pf.copied")}</span>}
            </div>
            {p.name["bal-latn"] && lang !== "bal-latn" && <p className="mt-1 italic text-white/70" lang="bal-Latn" dir="ltr">{p.name["bal-latn"]}</p>}
            <p className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[14px] text-white/85 sm:justify-start">
              <span className="flex items-center gap-1.5"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4" /></svg><Latin>{p.years}</Latin></span>
              <span className="text-white/40">|</span>
              <span className="flex items-center gap-1.5"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></svg><Tx v={p.place} /></span>
            </p>
          </div>
        </div></div>
      </header>

      {/* tabs */}
      <nav className="sticky top-[60px] z-30 border-b border-[var(--faint)] bg-white/95 backdrop-blur" aria-label="Profile sections">
        <div className="wrap flex gap-1 overflow-x-auto [scrollbar-width:none]">
          {tabs.map((x) => (
            <a
              key={x.key || "all"}
              href={href(x.key)}
              aria-current={active === x.key ? "page" : undefined}
              data-profile-tab={x.key || "all"}
              className={`shrink-0 border-b-2 px-4 py-3.5 text-[13px] font-semibold uppercase tracking-[0.08em] transition rtl:text-[15px] rtl:normal-case rtl:tracking-normal ${active === x.key ? "border-[var(--gold)] text-[var(--text)]" : "border-transparent text-[var(--dim)] hover:text-[var(--text)]"}`}
            >
              {x.label}{x.n ? <span className="ms-1.5 font-normal text-[var(--dim)]"><Latin>{x.n}</Latin></span> : null}
            </a>
          ))}
        </div>
      </nav>

      <div className="wrap"><div className="grid gap-12 py-12 lg:grid-cols-[minmax(0,1fr)_280px]">
        <main className="min-w-0">
          <h2 className="poet-name text-[28px] uppercase rtl:normal-case"><Tx v={p.name} /></h2>
          <span className="mt-3 block h-px w-10 bg-[var(--faint)]" />
          {active === "profile" ? <Profile /> : active === "" ? (
            <>
              {empty && <><Profile /><p className="mt-8 text-[14px] text-[var(--dim)]">{t("pf.none")}</p></>}
              {!empty && <Tx v={p.bio} as="p" className="mt-6 max-w-[65ch] text-[16px] leading-[1.85] text-[var(--dim)]" />}
              {keys.map((k) => section(k, limits[k] ?? 5))}
            </>
          ) : section(active, Infinity)}
        </main>

        <aside className="space-y-10" data-profile-aside>
          <div>
            <span className="block h-0.5 w-8 bg-[var(--gold)]" />
            <ul className="mt-5 text-[13px] uppercase tracking-[0.06em] rtl:text-[15px] rtl:normal-case rtl:tracking-normal">
              {([
                ["pf.indexAll", page("poets")],
                ["pf.classical", page("poets", "period=classical")],
                ["pf.modern", page("poets", "period=modern")],
                ["pf.audios", page("media")],
              ] as [DictKey, string][]).map(([k, h], i) => (
                <li key={k}><a href={h} className={`block px-2 py-2.5 hover:bg-[var(--ink-2)] hover:text-[var(--gold)] ${i === 0 ? "bg-[var(--ink-2)] text-[var(--gold)]" : ""}`}>{t(k)}</a></li>
              ))}
            </ul>
          </div>
          {c.articles.length > 0 && (
            <div>
              <span className="block h-0.5 w-8 bg-[var(--gold)]" />
              <h3 className="mt-4 text-[15px] font-bold uppercase tracking-[0.04em] rtl:normal-case">{t("pf.blog")}</h3>
              <ul className="mt-3 divide-y divide-[var(--faint)]">
                {c.articles.slice(0, 4).map((a) => (
                  <li key={a.slug}><a href={page("articles", a.slug)} className="flex gap-3 py-3 text-[13px] leading-snug hover:text-[var(--gold)]">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded bg-[var(--ink-2)] text-[var(--gold)]">✎</span>
                    <Tx v={a.title} className="line-clamp-2" />
                  </a></li>
                ))}
              </ul>
            </div>
          )}
          <a href={page("dictionary")} className="block overflow-hidden rounded-md text-white" style={{ background: "linear-gradient(150deg, hsl(28 42% 40%), hsl(28 46% 18%))" }}>
            <div className="p-6 text-center">
              <p className="nastaliq text-[34px]" lang="bal" dir="rtl" style={{ lineHeight: 1.9 }}>لبزبلد</p>
              <p className="mt-2 text-[14px] text-white/85">{t("x.dict")}</p>
              <span className="mt-4 inline-block rounded border border-white/70 px-4 py-1.5 text-[12px] font-semibold uppercase tracking-wider rtl:normal-case">{t("h.learn")}</span>
            </div>
          </a>
        </aside>
      </div></div>

      {more.length > 0 && (
        <section className="wrap" data-more-poets><div className="pb-16">
          <h3 className="text-[15px] font-bold uppercase tracking-[0.06em] rtl:normal-case">
            {samePlace.length ? <>{t("pf.morePlace")} <span className="text-[var(--gold)]">“<Tx v={p.place} />”</span></> : t("pf.morePeriod")}
          </h3>
          <div className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-4 lg:grid-cols-6">
            {more.slice(0, 6).map((x) => (
              <a key={x.slug} href={page("poets", x.slug)} className="group flex flex-col items-center rounded-md border border-[var(--faint)] p-4 text-center transition hover:border-[var(--gold)]/50 hover:shadow-sm">
                <Medallion p={x} size={96} />
                <Tx v={x.name} className="mt-3 text-[13px] font-semibold uppercase group-hover:text-[var(--gold)] rtl:text-[16px] rtl:normal-case" />
                <Latin className="text-[11px] text-[var(--dim)]">{x.years}</Latin>
              </a>
            ))}
          </div>
        </div></section>
      )}
      <VideoModal v={video} onClose={() => setVideo(null)} />
    </div>
  );
}
