"use client";

/**
 * Articles / blog, Audio & Video, editable static pages (About, Privacy, Terms) and Contact.
 * Lists come from the content store; an article body and a static page are fetched by slug.
 */

import { useEffect, useMemo, useState } from "react";
import { L, Tx, useLang } from "@/lib/i18n";
import { Article, articleCats, articles as localArticles, Prose, prose as localProse, Video } from "@/lib/content";
import { proseKind } from "@/lib/forms";
import { useContent } from "@/lib/content-store";
import { supabase } from "@/lib/db/client";
import { page } from "@/lib/links";
import { Markdown } from "@/lib/markdown";
import { mediaUrl } from "@/lib/media";
import { parseVideo } from "@/lib/video";
import { ContactForm } from "@/components/BrandSections";
import { Back, CopyButton, Latin, SearchBox, SectionTitle, Shell, Status, useHash, useTitle } from "./Literature";

/* ─────────────────────────── shared ─────────────────────────── */

const LOCALE: Record<string, string> = { en: "en-GB", ur: "ur-PK", bal: "ur-PK", "bal-latn": "en-GB" };

export function useDate() {
  const { lang } = useLang();
  return (iso?: string) => (iso ? new Date(iso).toLocaleDateString(LOCALE[lang] ?? "en-GB", { day: "numeric", month: "long", year: "numeric" }) : "");
}

/** Pick the body text for the current language, falling back sensibly; says which language was shown. */
function pickText(v: Partial<L> | undefined, lang: string): { text: string; lang: "bal" | "bal-latn" | "en" | "ur"; fallback: boolean } {
  const order = [lang, "en", "ur", "bal", "bal-latn"] as const;
  for (const k of order) {
    const t = (v as Record<string, string> | undefined)?.[k];
    if (t && t.trim()) return { text: t, lang: k as "bal" | "en" | "ur" | "bal-latn", fallback: k !== lang };
  }
  return { text: "", lang: "en", fallback: false };
}
const isRtl = (l: string) => l === "bal" || l === "ur";
const LANG_NAME: Record<string, string> = { bal: "بلوچی", "bal-latn": "Balòchi", en: "English", ur: "اردو" };

function catLabel(id: string): L {
  return articleCats.find((c) => c.id === id)?.label ?? { bal: id, en: id };
}

function Body({ value }: { value?: Partial<L> }) {
  const { lang } = useLang();
  const b = pickText(value, lang);
  if (!b.text) return null;
  return (
    <div lang={b.lang === "bal-latn" ? "bal-Latn" : b.lang} dir={isRtl(b.lang) ? "rtl" : "ltr"}>
      {b.fallback && <p className="mb-4 text-[12px] text-[var(--dim)]" lang="en" dir="ltr">Shown in {LANG_NAME[b.lang]} — not yet available in your language.</p>}
      <Markdown text={b.text} className={`prose-lab ${isRtl(b.lang) ? "text-[19px] leading-[2.1]" : "text-[17px] leading-[1.85]"}`} />
    </div>
  );
}

function minutes(v?: Partial<L>) {
  const words = Object.values(v ?? {}).reduce((m, t) => Math.max(m, (t ?? "").split(/\s+/).length), 0);
  return Math.max(1, Math.round(words / 200));
}

/* ─────────────────────────── articles ─────────────────────────── */

export function ArticleCard({ a, big = false }: { a: Article; big?: boolean }) {
  const { t } = useLang();
  const date = useDate();
  return (
    <a href={page("articles", a.slug)} className={`group flex h-full flex-col overflow-hidden rounded-md border border-[var(--faint)] bg-white shadow-sm transition hover:shadow-md ${big ? "md:flex-row" : ""}`} data-article-card>
      <div className={`relative shrink-0 overflow-hidden bg-[var(--ink-3)] ${big ? "aspect-[16/9] md:aspect-auto md:w-1/2" : "aspect-[16/9]"}`}>
        {a.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={a.cover} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
        ) : (
          <div className="doch-bg absolute inset-0 grid place-items-center opacity-80">
            <Tx v={a.title} className="nastaliq px-6 text-center text-[22px] text-[var(--gold)]" />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--gold)] rtl:text-[13px] rtl:normal-case rtl:tracking-normal">
          <Tx v={catLabel(a.category)} />
        </p>
        <Tx v={a.title} as="h3" className={`mt-2 font-semibold leading-snug group-hover:text-[var(--gold)] ${big ? "text-[24px]" : "text-[18px]"}`} />
        <Tx v={a.excerpt} as="p" className="mt-2 line-clamp-3 flex-1 text-[14px] leading-relaxed text-[var(--dim)]" />
        <p className="mt-4 flex items-center justify-between text-[12px] text-[var(--dim)]">
          <Latin>{date(a.date)}</Latin>
          <span className="text-[var(--gold)]">{t("art.read")} →</span>
        </p>
      </div>
    </a>
  );
}

export function ArticlesPage() {
  const slug = useHash();
  const { articles, loaded } = useContent();
  const { t } = useLang();
  if (slug === null) return null;
  if (slug) {
    const a = articles.find((x) => x.slug === slug);
    if (!a) return <Shell title=""><Back href={page("articles")} label={t("nav.articles")} />{loaded ? <Status k="pg.notFound" /> : <Status k="pg.loading" />}</Shell>;
    return <ArticleDetail a={a} />;
  }
  return <ArticleList />;
}

function ArticleList() {
  const { articles } = useContent();
  const { t, pick } = useLang();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  useTitle(t("nav.articles"));
  const cats = useMemo(() => ["all", ...new Set(articles.map((a) => a.category))], [articles]);
  const flat = (v?: L) => Object.values(v ?? {}).join(" ").toLowerCase();
  const list = articles.filter((a) => (cat === "all" || a.category === cat) && (!q.trim() || (flat(a.title) + flat(a.excerpt) + a.tags.join(" ")).includes(q.trim().toLowerCase())));
  return (
    <Shell
      kicker={t("art.sub")}
      title={t("art.blog")}
      tools={
        <div className="flex flex-wrap items-center gap-3">
          {cats.map((c) => (
            <button key={c} className={`chip ${cat === c ? "on" : ""}`} onClick={() => setCat(c)}>{c === "all" ? t("s.poets.all") : pick(catLabel(c)).text}</button>
          ))}
          <SearchBox q={q} setQ={setQ} />
        </div>
      }
    >
      {list.length === 0 ? <Status k="pg.empty" /> : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {list.map((a, i) => (
            <div key={a.slug} className={i === 0 && cat === "all" && !q ? "md:col-span-2 lg:col-span-3" : ""}>
              <ArticleCard a={a} big={i === 0 && cat === "all" && !q} />
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
}

function ArticleDetail({ a }: { a: Article }) {
  const { articles, poets } = useContent();
  const { t, pick } = useLang();
  const date = useDate();
  const [body, setBody] = useState<Partial<L> | undefined>(a.body);
  const [loading, setLoading] = useState(!a.body);
  useTitle(pick(a.title).text);
  useEffect(() => {
    if (a.body) return;
    if (!supabase) {
      setBody(localArticles.find((x) => x.slug === a.slug)?.body);
      setLoading(false);
      return;
    }
    supabase.from("articles").select("body").eq("slug", a.slug).maybeSingle().then(({ data }) => {
      setBody((data?.body as Partial<L>) ?? undefined);
      setLoading(false);
    });
  }, [a]);
  const author = poets.find((p) => p.slug === a.authorSlug);
  const related = articles.filter((x) => x.slug !== a.slug && (x.category === a.category || x.tags.some((g) => a.tags.includes(g)))).slice(0, 3);
  return (
    <div className="section pt-12">
      <Back href={page("articles")} label={t("art.blog")} />
      <article className="mx-auto max-w-[760px]" data-article={a.slug}>
        <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--gold)] rtl:text-[14px] rtl:normal-case rtl:tracking-normal"><Tx v={catLabel(a.category)} /></p>
        <Tx v={a.title} as="h1" className="display mt-3 text-[clamp(30px,4vw,52px)]" />
        <Tx v={a.excerpt} as="p" className="mt-4 text-[18px] leading-relaxed text-[var(--dim)]" />
        <p className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-[var(--faint)] pb-5 text-[13px] text-[var(--dim)]">
          {author ? <a href={page("poets", author.slug)} className="text-[var(--text)] hover:text-[var(--gold)]"><Tx v={author.name} /></a> : a.authorText ? <Tx v={a.authorText} className="text-[var(--text)]" /> : null}
          {(author || a.authorText) && <span>·</span>}
          <Latin>{date(a.date)}</Latin>
          <span>·</span>
          <span><Latin>{minutes(body)}</Latin> {t("art.minRead")}</span>
        </p>
        {a.cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={a.cover} alt="" className="mt-8 w-full rounded-md object-cover" />
        )}
        <div className="mt-6">{loading ? <Status k="pg.loading" /> : <Body value={body} />}</div>
        {a.tags.length > 0 && (
          <p className="mt-10 flex flex-wrap gap-2">
            {a.tags.map((g) => <span key={g} className="rounded-full bg-[var(--ink-2)] px-3 py-1 text-[12px] text-[var(--dim)]" lang="en" dir="ltr">#{g}</span>)}
          </p>
        )}
        <div className="mt-6"><CopyButton label={t("pg.share")} text={() => location.href} /></div>
      </article>
      {related.length > 0 && (
        <div className="mx-auto max-w-[1100px]">
          <SectionTitle>{t("art.related")}</SectionTitle>
          <div className="grid gap-6 md:grid-cols-3">{related.map((x) => <ArticleCard key={x.slug} a={x} />)}</div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── prose (afsana, essay, …) ─────────────────────────── */

export function ProseCard({ x, compact = false }: { x: Prose; compact?: boolean }) {
  const { t } = useLang();
  const { poets } = useContent();
  const author = poets.find((p) => p.slug === x.authorSlug)?.name ?? x.authorText;
  return (
    <a href={page("prose", x.slug)} className="group flex h-full flex-col overflow-hidden rounded-md border border-[var(--faint)] bg-white shadow-sm transition hover:shadow-md" data-prose-card>
      {!compact && (
        <div className="relative aspect-[16/9] shrink-0 overflow-hidden bg-[var(--ink-3)]">
          {x.cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={x.cover} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
          ) : (
            <div className="doch-bg absolute inset-0 grid place-items-center opacity-80"><Tx v={x.title} className="nastaliq px-6 text-center text-[22px] text-[var(--gold)]" /></div>
          )}
        </div>
      )}
      <div className="flex flex-1 flex-col p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--gold)] rtl:text-[13px] rtl:normal-case rtl:tracking-normal"><Tx v={proseKind(x.kind).l} /></p>
        <Tx v={x.title} as="h3" className="mt-2 text-[18px] font-semibold leading-snug group-hover:text-[var(--gold)]" />
        <Tx v={x.excerpt} as="p" className="mt-2 line-clamp-3 flex-1 text-[14px] leading-relaxed text-[var(--dim)]" />
        <p className="mt-4 flex items-center justify-between gap-3 text-[12px] text-[var(--dim)]">
          {author ? <Tx v={author} /> : <span />}
          <span className="text-[var(--gold)]">{t("art.read")} →</span>
        </p>
        {x.sample && <span className="mt-1 text-[11px] text-[var(--dim)]">({t("ui.sample")})</span>}
      </div>
    </a>
  );
}

export function ProsePage() {
  const slug = useHash();
  const { prose, loaded } = useContent();
  const { t } = useLang();
  if (slug === null) return null;
  if (slug && !slug.startsWith("kind=")) {
    const x = prose.find((p) => p.slug === slug);
    if (!x) return <Shell title=""><Back href={page("prose")} label={t("nav.prose")} />{loaded ? <Status k="pg.notFound" /> : <Status k="pg.loading" />}</Shell>;
    return <ProseDetail x={x} />;
  }
  return <ProseList initial={slug ? slug.slice(5) : "all"} />;
}

function ProseList({ initial }: { initial: string }) {
  const { prose } = useContent();
  const { t, pick } = useLang();
  const [q, setQ] = useState("");
  const [kind, setKind] = useState(initial);
  useEffect(() => setKind(initial), [initial]);
  useTitle(t("nav.prose"));
  const kinds = useMemo(() => [...new Set(prose.map((x) => x.kind))], [prose]);
  const flat = (v?: L) => Object.values(v ?? {}).join(" ").toLowerCase();
  const list = prose.filter((x) => (kind === "all" || x.kind === kind) && (!q.trim() || (flat(x.title) + flat(x.excerpt)).includes(q.trim().toLowerCase())));
  return (
    <Shell
      kicker={t("prose.k")}
      title={t("nav.prose")}
      tools={
        <div className="flex flex-wrap items-center gap-3">
          <button className={`chip ${kind === "all" ? "on" : ""}`} onClick={() => setKind("all")}>{t("s.poets.all")}</button>
          {kinds.map((k) => <button key={k} className={`chip ${kind === k ? "on" : ""}`} onClick={() => setKind(k)}>{pick(proseKind(k).l).text}</button>)}
          <SearchBox q={q} setQ={setQ} />
        </div>
      }
    >
      {list.length === 0 ? <Status k="pg.empty" /> : <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{list.map((x) => <ProseCard key={x.slug} x={x} />)}</div>}
    </Shell>
  );
}

const BODY_LANGS = ["bal", "bal-latn", "en", "ur"] as const;

function ProseDetail({ x }: { x: Prose }) {
  const { prose, poets } = useContent();
  const { t, pick, lang } = useLang();
  const date = useDate();
  const [body, setBody] = useState<Partial<L> | undefined>(x.body);
  const [loading, setLoading] = useState(!x.body);
  useTitle(pick(x.title).text);
  useEffect(() => {
    if (x.body) return;
    if (!supabase) {
      setBody(localProse.find((p) => p.slug === x.slug)?.body);
      setLoading(false);
      return;
    }
    supabase.from("prose").select("body, source").eq("slug", x.slug).maybeSingle().then(({ data }) => {
      setBody((data?.body as Partial<L>) ?? undefined);
      setLoading(false);
    });
  }, [x]);
  const have = BODY_LANGS.filter((k) => (body as Record<string, string> | undefined)?.[k]?.trim());
  const [show, setShow] = useState<string>("");
  const cur = show && have.includes(show as never) ? show : have.includes(lang as never) ? lang : have[0];
  const author = poets.find((p) => p.slug === x.authorSlug);
  const more = prose.filter((p) => p.slug !== x.slug && (p.authorSlug && p.authorSlug === x.authorSlug)).slice(0, 3);
  const text = cur ? (body as Record<string, string>)[cur] : "";
  return (
    <div className="section pt-12">
      <Back href={page("prose")} label={t("nav.prose")} />
      <article className="mx-auto max-w-[760px]" data-prose={x.slug}>
        <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--gold)] rtl:text-[14px] rtl:normal-case rtl:tracking-normal"><Tx v={proseKind(x.kind).l} /></p>
        <Tx v={x.title} as="h1" className="display mt-3 text-[clamp(30px,4vw,52px)]" />
        <p className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-[var(--faint)] pb-5 text-[13px] text-[var(--dim)]">
          {author ? <a href={page("poets", author.slug)} className="text-[var(--text)] hover:text-[var(--gold)]"><Tx v={author.name} /></a> : x.authorText ? <Tx v={x.authorText} className="text-[var(--text)]" /> : null}
          {x.date && <><span>·</span><Latin>{date(x.date)}</Latin></>}
          {text && <><span>·</span><span><Latin>{minutes({ bal: text })}</Latin> {t("art.minRead")}</span></>}
        </p>
        {have.length > 1 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {have.map((k) => <button key={k} onClick={() => setShow(k)} className={`chip ${cur === k ? "on" : ""}`}>{LANG_NAME[k]}</button>)}
          </div>
        )}
        {x.cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={x.cover} alt="" className="mt-8 w-full rounded-md object-cover" />
        )}
        <div className="mt-6">
          {loading ? <Status k="pg.loading" /> : text ? (
            <div lang={cur === "bal-latn" ? "bal-Latn" : cur} dir={isRtl(cur!) ? "rtl" : "ltr"}>
              <Markdown text={text} className={`prose-lab ${cur === "bal" ? "nastaliq text-[22px] leading-[2.4]" : isRtl(cur!) ? "text-[19px] leading-[2.1]" : "text-[17px] leading-[1.85]"}`} />
            </div>
          ) : <Status k="pg.empty" />}
        </div>
        <div className="mt-8"><CopyButton label={t("pg.share")} text={() => location.href} /></div>
      </article>
      {more.length > 0 && (
        <div className="mx-auto max-w-[1100px]">
          <SectionTitle>{t("prose.more")}</SectionTitle>
          <div className="grid gap-6 md:grid-cols-3">{more.map((p) => <ProseCard key={p.slug} x={p} />)}</div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── video ─────────────────────────── */

export function videoThumb(v: Video) {
  return v.thumb ?? parseVideo(v.url).thumb;
}

export function VideoCard({ v, onPlay }: { v: Video; onPlay: () => void }) {
  const [broken, setBroken] = useState(false);
  const thumb = broken ? undefined : videoThumb(v);
  return (
    <div data-video-card>
      <button onClick={onPlay} className="group relative block aspect-video w-full overflow-hidden rounded-lg bg-[#1d1813] text-start" aria-label="Play video">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" loading="lazy" onError={() => setBroken(true)} className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]" />
        ) : (
          <div className="doch-bg absolute inset-0 opacity-40" />
        )}
        <span className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <span className="absolute left-1/2 top-1/2 grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[18px] text-[var(--text)] shadow-lg transition group-hover:scale-105">▶</span>
        {v.duration && <span className="absolute bottom-2 end-2 rounded bg-black/70 px-1.5 py-0.5 text-[11px] text-white" lang="en" dir="ltr">{v.duration}</span>}
      </button>
      <Tx v={v.title} as="p" className="mt-2 line-clamp-2 text-[14px] font-medium leading-snug" />
      {Object.values(v.description).some(Boolean) && <Tx v={v.description} as="p" className="line-clamp-1 text-[12px] text-[var(--dim)]" />}
    </div>
  );
}

export function VideoModal({ v, onClose }: { v: Video | null; onClose: () => void }) {
  const { t } = useLang();
  useEffect(() => {
    if (!v) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    addEventListener("keydown", k);
    dispatchEvent(new CustomEvent("labzaank:search-open", { detail: true })); // pause smooth scroll
    return () => {
      removeEventListener("keydown", k);
      dispatchEvent(new CustomEvent("labzaank:search-open", { detail: false }));
    };
  }, [v, onClose]);
  if (!v) return null;
  const src = parseVideo(v.url);
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-4" onClick={onClose} role="dialog" aria-modal="true" data-video-modal>
      <div className="w-full max-w-[1000px]" onClick={(e) => e.stopPropagation()}>
        <div className="mb-2 flex items-center justify-between gap-4 text-white">
          <Tx v={v.title} className="truncate text-[15px]" />
          <button onClick={onClose} className="text-[13px] text-white/70 hover:text-white" aria-label={t("ui.close")}>✕</button>
        </div>
        <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
          {src.embed ? (
            <iframe src={src.embed} title={v.title.en ?? v.title.bal} className="absolute inset-0 h-full w-full" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
          ) : src.kind === "file" ? (
            <video src={src.src} controls autoPlay className="absolute inset-0 h-full w-full" />
          ) : (
            <a href={v.url} target="_blank" rel="noopener noreferrer" className="absolute inset-0 grid place-items-center text-white underline">{t("vid.open")} ↗</a>
          )}
        </div>
      </div>
    </div>
  );
}

export function MediaPage() {
  const { videos, audio } = useContent();
  const { t } = useLang();
  const [play, setPlay] = useState<Video | null>(null);
  useTitle(t("media.h"));
  return (
    <Shell kicker={t("vid.sub")} title={t("media.h")}>
      <h2 className="mb-5 text-[20px] font-semibold" id="videos">{t("vid.h")}</h2>
      {videos.length === 0 ? <Status k="vid.empty" /> : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{videos.map((v) => <VideoCard key={v.id} v={v} onPlay={() => setPlay(v)} />)}</div>
      )}
      <h2 className="mb-5 mt-14 text-[20px] font-semibold" id="recordings">{t("media.audio")}</h2>
      <div className="flex flex-col gap-3">
        {audio.map((a, i) => (
          <div key={i} className="flex flex-wrap items-center gap-5 rounded-md border border-[var(--faint)] bg-white p-4 shadow-sm" data-recording>
            <div className="min-w-[200px] flex-1">
              <Tx v={a.title} className="block text-[16px]" />
              <Tx v={a.by} className="block text-[13px] text-[var(--dim)]" />
            </div>
            {a.src ? <audio controls preload="none" src={a.src} className="h-9 max-w-full" /> : <Latin className="text-[13px] text-[var(--dim)]">{a.dur}</Latin>}
          </div>
        ))}
      </div>
      <VideoModal v={play} onClose={() => setPlay(null)} />
    </Shell>
  );
}

/* ─────────────────────────── static pages ─────────────────────────── */

type PageRow = { title: L; body?: Partial<L>; updated_at?: string };
const FALLBACK: Record<string, PageRow> = {
  about: { title: { bal: "مئے بارءَ", en: "About Labzaank", ur: "ہمارے بارے میں" }, body: { en: "Labzaank is a digital home for Balochi literature — poetry, poets, books, folk literature, recordings and a Balochi dictionary — in Balochi, English and Urdu." } },
  privacy: { title: { bal: "راز داری", en: "Privacy policy", ur: "رازداری کی پالیسی" }, body: { en: "This page is managed from the admin panel." } },
  terms: { title: { bal: "شرط", en: "Terms of use", ur: "شرائطِ استعمال" }, body: { en: "This page is managed from the admin panel." } },
};

export function StaticPage({ slug }: { slug: string }) {
  const { t, pick } = useLang();
  const date = useDate();
  const [row, setRow] = useState<PageRow | null | undefined>(undefined);
  useEffect(() => {
    if (!supabase) return setRow(FALLBACK[slug] ?? null);
    supabase.from("pages").select("title, body, updated_at").eq("slug", slug).maybeSingle().then(({ data, error }) => {
      setRow(error ? FALLBACK[slug] ?? null : ((data as PageRow) ?? FALLBACK[slug] ?? null));
    });
  }, [slug]);
  useTitle(row ? pick(row.title).text : undefined);
  if (row === undefined) return <div className="section pt-12"><Status k="pg.loading" /></div>;
  if (row === null) return <div className="section pt-12"><Status k="pg.notFound" /></div>;
  return (
    <div className="section pt-12">
      <article className="mx-auto max-w-[760px]" data-page={slug}>
        <Tx v={row.title} as="h1" className="display text-[clamp(32px,4vw,52px)]" />
        {row.updated_at && <p className="mt-2 text-[12px] text-[var(--dim)]">{t("pg.updated")}: <Latin>{date(row.updated_at)}</Latin></p>}
        <div className="mt-6"><Body value={row.body} /></div>
      </article>
    </div>
  );
}

/* ─────────────────────────── contact ─────────────────────────── */

export function ContactPage() {
  const { t } = useLang();
  useTitle(t("nav.contact"));
  return (
    <div className="section pt-12">
      <div className="mx-auto grid max-w-[1000px] gap-12 md:grid-cols-[1fr_1.2fr]">
        <div>
          <p className="kicker">{t("nav.contact")}</p>
          <h1 className="display mt-2 text-[clamp(32px,4vw,50px)]">{t("ct.h")}</h1>
          <p className="mt-4 text-[16px] leading-relaxed text-[var(--dim)]">{t("ct.p")}</p>
          <ul className="mt-8 space-y-3 text-[14px]">
            <li><a href={page("about")} className="text-[var(--gold)] hover:underline">{t("nav.about")} →</a></li>
            <li><a href={page("privacy")} className="text-[var(--gold)] hover:underline">{t("nav.privacy")} →</a></li>
            <li><a href={page("terms")} className="text-[var(--gold)] hover:underline">{t("nav.terms")} →</a></li>
          </ul>
        </div>
        <div className="rounded-lg border border-[var(--faint)] bg-[var(--ink-2)] p-6">
          <ContactForm tone="light" />
        </div>
      </div>
    </div>
  );
}
