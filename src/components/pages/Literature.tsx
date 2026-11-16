"use client";

/**
 * Public browsing pages: Poets, Poetry and Library.
 * Each page shows the full list; `#<slug>` in the URL opens the detail view
 * (static export → hash routes, same pattern as the dictionary).
 */

import { ReactNode, useEffect, useMemo, useState } from "react";
import { Tx, useLang } from "@/lib/i18n";
import type { L } from "@/lib/i18n";
import { Book, bookCats, Poem, Poet } from "@/lib/content";
import { useContent } from "@/lib/content-store";
import { page } from "@/lib/links";
import { siteName } from "@/lib/branding";
import { Cover, Medallion, ReadPdf } from "@/components/BrandSections";
import { Verse } from "@/components/WordLookup";
import { formByKey, formKey, formOrder, verseFor, verseOther } from "@/lib/forms";
import { PoetProfile } from "./PoetProfile";

/* ─────────────────────────── shared ─────────────────────────── */

export function useHash() {
  const [h, setH] = useState<string | null>(null);
  useEffect(() => {
    const f = () => {
      setH(decodeURIComponent(location.hash.slice(1)));
      scrollTo({ top: 0 });
    };
    f();
    addEventListener("hashchange", f);
    return () => removeEventListener("hashchange", f);
  }, []);
  return h;
}

const flat = (v?: L | string | null) => (typeof v === "string" ? v : v ? Object.values(v).join(" ") : "");
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ًͯ-ٰٟ]/g, "").replace(/[يى]/g, "ی").replace(/ك/g, "ک");
const matches = (q: string, ...parts: (L | string | null | undefined)[]) => !q.trim() || norm(parts.map(flat).join(" ")).includes(norm(q.trim()));

/** Page-specific browser title. Next.js may re-apply the static title after hydration,
 *  so keep ours while the view is mounted (and follow branding changes). */
export function useTitle(title?: string) {
  useEffect(() => {
    if (!title) return;
    const prev = document.title;
    const want = () => `${title} — ${siteName()}`;
    const apply = () => { if (document.title !== want()) document.title = want(); };
    apply();
    const mo = new MutationObserver(apply);
    mo.observe(document.head, { subtree: true, childList: true, characterData: true });
    addEventListener("labzaank:branding", apply);
    return () => {
      mo.disconnect();
      removeEventListener("labzaank:branding", apply);
      document.title = prev;
    };
  }, [title]);
}

export function Shell({ kicker, title, children, tools }: { kicker?: string; title: ReactNode; children: ReactNode; tools?: ReactNode }) {
  return (
    <div className="section pt-12">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <div>
          {kicker && <p className="kicker">{kicker}</p>}
          <h1 className="display h2 mt-2">{title}</h1>
        </div>
        {tools}
      </div>
      {children}
    </div>
  );
}

export function SearchBox({ q, setQ }: { q: string; setQ: (s: string) => void }) {
  const { t } = useLang();
  return (
    <input
      value={q}
      onChange={(e) => setQ(e.target.value)}
      placeholder={t("pg.search")}
      aria-label={t("pg.search")}
      className="w-[min(320px,100%)] rounded-full border border-[var(--faint)] bg-white px-5 py-2.5 text-[15px] outline-none focus:border-[var(--gold)]/60"
    />
  );
}

export function Back({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} className="mb-8 inline-flex items-center gap-2 text-[14px] text-[var(--dim)] hover:text-[var(--text)]">
      <span className="rtl:rotate-180">←</span> {label}
    </a>
  );
}

export function Status({ k }: { k: "pg.loading" | "pg.notFound" | "pg.empty" | "vid.empty" }) {
  const { t } = useLang();
  return <p className="py-16 text-center text-[var(--dim)]">{t(k)}</p>;
}

export function Latin({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span lang="en" dir="ltr" className={`font-[family-name:var(--latin-body)] ${className}`}>{children}</span>;
}

export function CopyButton({ text, label }: { text: () => string; label: string }) {
  const { t } = useLang();
  const [done, setDone] = useState(false);
  return (
    <button
      className="chip"
      onClick={async () => {
        try { await navigator.clipboard.writeText(text()); } catch {}
        setDone(true);
        setTimeout(() => setDone(false), 1400);
      }}
    >
      {done ? t("s.poetry.copied") : label}
    </button>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="mb-5 mt-16 border-b border-[var(--faint)] pb-3 text-[22px] text-[var(--gold-bright)]">{children}</h2>;
}

function PoemCard({ p, poets }: { p: Poem; poets: Poet[] }) {
  const poet = poets.find((x) => x.slug === p.authorSlug);
  const { lang } = useLang();
  const v = verseFor(p, lang);
  const lines = v.text.split("\n");
  return (
    <a href={page("poetry", p.id)} className="card group flex flex-col p-6 transition-colors hover:border-[var(--gold)]/40">
      <Tx v={p.form} className="self-start rounded-full border border-[var(--gold)]/40 px-3 py-0.5 text-[12px] text-[var(--gold)]" />
      <p className={`my-6 flex-1 whitespace-pre-line text-center ${v.rtl ? "nastaliq text-[clamp(19px,1.7vw,24px)]" : "text-[17px] italic leading-[1.9]"}`} lang={v.rtl ? "bal" : "bal-Latn"} dir={v.rtl ? "rtl" : "ltr"} style={v.rtl ? { lineHeight: 2.2 } : undefined}>
        {lines.slice(0, 2).join("\n")}
        {lines.length > 2 && "…"}
      </p>
      <Tx v={poet?.name ?? p.contributor} className="text-[13px] text-[var(--dim)] group-hover:text-[var(--text)]" />
    </a>
  );
}

function BookTile({ b }: { b: Book }) {
  return (
    <a href={page("library", b.id)} className="group block">
      <div className="transition-transform duration-500 group-hover:-translate-y-2 group-hover:rotate-[-1deg]">
        <Cover b={b} />
      </div>
      <Tx v={b.title} as="h3" className="mt-4 text-[16px] leading-snug" />
      <Tx v={b.author} as="p" className="text-[13px] text-[var(--dim)]" />
    </a>
  );
}

/* ─────────────────────────── Poets ─────────────────────────── */

export function PoetsPage() {
  const slug = useHash();
  const c = useContent();
  const label = useLangLabel("nav.poets");
  if (slug === null) return null;
  if (slug && !slug.startsWith("period=")) {
    const [ps, tab = ""] = slug.split("/");
    const p = c.poets.find((x) => x.slug === ps);
    if (!p) return <Shell title=""><Back href={page("poets")} label={label} />{c.loaded ? <Status k="pg.notFound" /> : <Status k="pg.loading" />}</Shell>;
    return <PoetProfile p={p} tab={tab} />;
  }
  return <PoetList initial={slug === "period=classical" ? "classical" : slug === "period=modern" ? "modern" : "all"} />;
}

// tiny helper so early returns above can read a label without breaking hook order
function useLangLabel(k: "nav.poets" | "nav.poetry" | "nav.books") {
  return useLang().t(k);
}

function PoetList({ initial }: { initial: "all" | "classical" | "modern" }) {
  const { poets } = useContent();
  const { t } = useLang();
  const [q, setQ] = useState("");
  const [period, setPeriod] = useState<"all" | "classical" | "modern">(initial);
  useEffect(() => setPeriod(initial), [initial]);
  useTitle(t("nav.poets"));
  const list = poets.filter((p) => (period === "all" || p.period === period) && matches(q, p.name, p.place, p.years));
  return (
    <Shell
      kicker={t("s.poets.k")}
      title={t("nav.poets")}
      tools={
        <div className="flex flex-wrap items-center gap-3">
          {(["all", "classical", "modern"] as const).map((x) => (
            <button key={x} className={`chip ${period === x ? "on" : ""}`} onClick={() => setPeriod(x)}>{t(`s.poets.${x}`)}</button>
          ))}
          <SearchBox q={q} setQ={setQ} />
        </div>
      }
    >
      {list.length === 0 ? <Status k="pg.empty" /> : (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {list.map((p) => (
            <a key={p.slug} href={`#${p.slug}`} className="card group flex flex-col items-center p-6 text-center transition-colors hover:border-[var(--gold)]/40">
              <Medallion p={p} size={104} />
              <Tx v={p.name} as="h3" className="mt-5 text-[18px] group-hover:text-[var(--gold-bright)]" />
              <Latin className="mt-1 text-[13px] text-[var(--dim)]">{p.years}</Latin>
              <span className="mt-3 text-[12px] text-[var(--gold)]">{t(p.period === "classical" ? "s.poets.classical" : "s.poets.modern")}</span>
            </a>
          ))}
        </div>
      )}
    </Shell>
  );
}

/* ─────────────────────────── Poetry ─────────────────────────── */

export function PoetryPage() {
  const slug = useHash();
  const c = useContent();
  const label = useLangLabel("nav.poetry");
  if (slug === null) return null;
  if (slug) {
    if (slug.startsWith("form=")) return <PoemList initialForm={decodeURIComponent(slug.slice(5))} />;
    const p = c.poems.find((x) => x.id === slug);
    if (!p) return <Shell title=""><Back href={page("poetry")} label={label} />{c.loaded ? <Status k="pg.notFound" /> : <Status k="pg.loading" />}</Shell>;
    return <PoemDetail p={p} />;
  }
  return <PoemList />;
}

function PoemList({ initialForm = "all" }: { initialForm?: string }) {
  const { poems, poets } = useContent();
  const { t, pick } = useLang();
  const [q, setQ] = useState("");
  const toKey = (f: string) => (f === "all" ? "all" : formByKey(f) ? f : formKey({ en: f, bal: f }));
  const [form, setForm] = useState(toKey(initialForm));
  useEffect(() => setForm(toKey(initialForm)), [initialForm]);
  useTitle(t("nav.poetry"));
  const forms = useMemo(() => {
    const m = new Map<string, L>();
    for (const p of poems) { const k = formKey(p.form); if (!m.has(k)) m.set(k, formByKey(k)?.l ?? p.form); }
    return [...m.entries()].sort((a, b) => formOrder(a[0]) - formOrder(b[0]));
  }, [poems]);
  const list = poems.filter((p) => {
    const poet = poets.find((x) => x.slug === p.authorSlug);
    return (form === "all" || formKey(p.form) === form) && matches(q, p.original, p.roman, p.translation.en, p.translation.ur, poet?.name, p.contributor);
  });
  return (
    <Shell
      kicker={t("s.poetry.k")}
      title={t("nav.poetry")}
      tools={
        <div className="flex flex-wrap items-center gap-3">
          <button className={`chip ${form === "all" ? "on" : ""}`} onClick={() => setForm("all")}>{t("s.poets.all")}</button>
          {forms.map(([k, l]) => (
            <button key={k} className={`chip ${form === k ? "on" : ""}`} onClick={() => setForm(k)}>{pick(l).text}</button>
          ))}
          <SearchBox q={q} setQ={setQ} />
        </div>
      }
    >
      {list.length === 0 ? <Status k="pg.empty" /> : <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{list.map((p) => <PoemCard key={p.id} p={p} poets={poets} />)}</div>}
    </Shell>
  );
}

function PoemDetail({ p }: { p: Poem }) {
  const { poems, poets } = useContent();
  const { t, lang } = useLang();
  const poet = poets.find((x) => x.slug === p.authorSlug);
  useTitle(verseFor(p, lang).text.split("\n")[0]);
  const langs = (["en", "ur"] as const).filter((k) => p.translation[k]?.trim());
  const [tr, setTr] = useState<"en" | "ur">(lang === "ur" ? "ur" : "en");
  const shownTr = langs.includes(tr) ? tr : langs[0];
  const more = [...poems.filter((x) => x.id !== p.id && x.authorSlug && x.authorSlug === p.authorSlug), ...poems.filter((x) => x.id !== p.id && (!x.authorSlug || x.authorSlug !== p.authorSlug))].slice(0, 3);
  return (
    <div className="section pt-12">
      <Back href={page("poetry")} label={t("nav.poetry")} />
      <article className="card relative overflow-hidden px-6 py-12 md:px-16 md:py-16">
        <div className="doch-bg edge-fade pointer-events-none absolute inset-x-0 top-0 h-40 opacity-20" />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <Tx v={p.form} className="rounded-full border border-[var(--gold)]/40 px-3 py-0.5 text-[12px] text-[var(--gold)]" />
          {p.sample && <span className="text-[12px] text-[var(--dim)]">{t("ui.sample")}</span>}
        </div>
        <p className="mt-4 text-center text-[12px] uppercase tracking-[0.2em] text-[var(--dim)]">{t("pg.original")}</p>
        {[verseFor(p, lang), verseOther(p, lang)].map((v, i) => !v ? null : v.rtl ? (
          <Verse key={i} text={v.text} className={`nastaliq relative mx-auto max-w-[34ch] text-center ${i === 0 ? "mt-6 text-[clamp(26px,3.2vw,44px)]" : "mt-8 text-[clamp(20px,2vw,28px)] text-[var(--dim)]"}`} lang="bal" dir="rtl" style={{ lineHeight: 2.4 }} data-poem-original />
        ) : (
          <Verse key={i} text={v.text} className={`mx-auto max-w-[52ch] text-center font-[family-name:var(--latin-display)] italic leading-relaxed ${i === 0 ? "mt-6 text-[clamp(20px,2vw,28px)] text-[var(--text)]" : "mt-8 text-[clamp(17px,1.5vw,21px)] text-[var(--gold)]/85"}`} lang="bal-Latn" dir="ltr" />
        ))}
        <p className="mt-4 text-center text-[12px] text-[var(--dim)]" data-word-hint>{t("w.hint")}</p>
        <div className="mx-auto mt-12 max-w-[640px] border-t border-[var(--faint)] pt-8">
          <div className="mb-4 flex items-center justify-between gap-3">
            <span className="text-[13px] text-[var(--dim)]">{t("s.poetry.translation")}</span>
            {langs.length > 1 && (
              <div className="flex gap-2">
                {langs.map((k) => <button key={k} lang={k} className={`chip ${shownTr === k ? "on" : ""} ${k === "en" ? "font-[family-name:var(--latin-body)]" : ""}`} onClick={() => setTr(k)}>{k === "en" ? "English" : "اردو"}</button>)}
              </div>
            )}
          </div>
          {shownTr ? (
            <p className={`whitespace-pre-line text-center ${shownTr === "ur" ? "text-[21px]" : "font-[family-name:var(--latin-display)] text-[19px]"}`} lang={shownTr} dir={shownTr === "ur" ? "rtl" : "ltr"} style={{ lineHeight: shownTr === "ur" ? 2.1 : 1.8 }}>
              {p.translation[shownTr]}
            </p>
          ) : (
            <p className="text-center text-[14px] text-[var(--dim)]">{t("pg.noTranslation")}</p>
          )}
        </div>
        <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
          <CopyButton label={t("s.poetry.copy")} text={() => p.original} />
          <CopyButton label={t("pg.share")} text={() => location.href} />
        </div>
      </article>

      <a href={poet ? page("poets", poet.slug) : undefined} className={`card mt-6 flex items-center gap-5 p-5 ${poet ? "transition-colors hover:border-[var(--gold)]/40" : ""}`}>
        {poet && <Medallion p={poet} size={64} />}
        <div>
          <span className="text-[12px] text-[var(--dim)]">{t("pg.by")}</span>
          <Tx v={poet?.name ?? p.contributor} as="p" className="text-[19px]" />
        </div>
        {poet && <span className="ms-auto text-[var(--gold)] rtl:rotate-180">→</span>}
      </a>

      {more.length > 0 && (
        <>
          <SectionTitle>{t("pg.morePoems")}</SectionTitle>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{more.map((x) => <PoemCard key={x.id} p={x} poets={poets} />)}</div>
        </>
      )}
    </div>
  );
}

/* ─────────────────────────── Library ─────────────────────────── */

export function LibraryPage() {
  const slug = useHash();
  const c = useContent();
  const label = useLangLabel("nav.books");
  if (slug === null) return null;
  if (slug) {
    const b = c.books.find((x) => x.id === slug);
    if (!b) return <Shell title=""><Back href={page("library")} label={label} />{c.loaded ? <Status k="pg.notFound" /> : <Status k="pg.loading" />}</Shell>;
    return <BookDetail b={b} />;
  }
  return <BookList />;
}

function catLabel(cat: string): L {
  return bookCats.find((c) => c.id === cat)?.label ?? { bal: cat, en: cat.replace("-", " ") };
}

function BookList() {
  const { books } = useContent();
  const { t, pick } = useLang();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  useTitle(t("nav.books"));
  const cats = useMemo(() => ["all", ...new Set(books.map((b) => b.cat as string))], [books]);
  const list = books.filter((b) => (cat === "all" || b.cat === cat) && matches(q, b.title, b.author, b.isbn));
  return (
    <Shell
      kicker={t("s.books.k")}
      title={t("nav.books")}
      tools={
        <div className="flex flex-wrap items-center gap-3">
          {cats.map((x) => (
            <button key={x} className={`chip ${cat === x ? "on" : ""}`} onClick={() => setCat(x)}>{x === "all" ? t("s.poets.all") : pick(catLabel(x)).text}</button>
          ))}
          <SearchBox q={q} setQ={setQ} />
        </div>
      }
    >
      {list.length === 0 ? <Status k="pg.empty" /> : <div className="grid grid-cols-2 gap-x-7 gap-y-10 sm:grid-cols-3 lg:grid-cols-5">{list.map((b) => <BookTile key={b.id} b={b} />)}</div>}
    </Shell>
  );
}

function BookDetail({ b }: { b: Book }) {
  const { books, poets } = useContent();
  const { t, pick } = useLang();
  useTitle(pick(b.title).text);
  const author = poets.find((x) => x.slug === b.authorSlug);
  const related = books.filter((x) => x.id !== b.id && ((b.authorSlug && x.authorSlug === b.authorSlug) || x.cat === b.cat)).slice(0, 5);
  const meta: [string, ReactNode][] = [
    [t("pg.category"), <Tx key="c" v={catLabel(b.cat)} />],
    ...(b.pages ? [[t("s.books.pages"), <Latin key="p">{b.pages}</Latin>] as [string, ReactNode]] : []),
    ...(b.year ? [[t("pg.year"), <Latin key="y">{b.year}</Latin>] as [string, ReactNode]] : []),
    ...(b.isbn ? [["ISBN", <Latin key="i">{b.isbn}</Latin>] as [string, ReactNode]] : []),
  ];
  return (
    <div className="section pt-12">
      <Back href={page("library")} label={t("nav.books")} />
      <div className="grid gap-10 md:grid-cols-[minmax(220px,320px)_1fr] md:gap-16">
        <div className="mx-auto w-full max-w-[320px]"><Cover b={b} /></div>
        <div>
          {b.demo && <span className="rounded-full border border-black/15 px-3 py-0.5 text-[12px] text-[var(--dim)]">{t("pg.demoBook")}</span>}
          <Tx v={b.title} as="h1" className="display h2 mt-3" />
          {b.title["bal-latn"] && <p className="mt-1 font-[family-name:var(--latin-display)] text-[20px] italic text-[var(--gold)]/80 rtl:text-right" lang="bal-Latn" dir="ltr">{b.title["bal-latn"]}</p>}
          <div className="mt-6 flex items-center gap-3">
            <span className="text-[13px] text-[var(--dim)]">{t("pg.author")}:</span>
            {author ? (
              <a href={page("poets", author.slug)} className="text-[18px] text-[var(--gold-bright)] hover:underline"><Tx v={b.author} /></a>
            ) : (
              <Tx v={b.author} className="text-[18px]" />
            )}
          </div>
          <dl className="mt-8 grid max-w-[520px] grid-cols-2 gap-x-10 gap-y-5">
            {meta.map(([dt, dd], i) => (
              <div key={i}>
                <dt className="text-[12px] text-[var(--dim)]">{dt}</dt>
                <dd className="mt-1 text-[17px]">{dd}</dd>
              </div>
            ))}
          </dl>
          {b.copyright && (
            <p className="mt-6 max-w-[60ch] text-[13px] text-[var(--dim)]">
              <span className="text-[var(--text)]/70">{t("pg.rights")}: </span>
              <Latin>{b.copyright}</Latin>
            </p>
          )}
          <div className="mt-10">
            {b.pdf && b.canDownload ? (
              <ReadPdf path={b.pdf} label={t("s.books.read")} className="pill pill-gold" />
            ) : (
              <p className="text-[14px] text-[var(--dim)]">{t("pg.notOnline")}</p>
            )}
          </div>
        </div>
      </div>
      {related.length > 0 && (
        <>
          <SectionTitle>{t("pg.books")}</SectionTitle>
          <div className="grid grid-cols-2 gap-7 sm:grid-cols-3 lg:grid-cols-5">{related.map((x) => <BookTile key={x.id} b={x} />)}</div>
        </>
      )}
    </div>
  );
}
