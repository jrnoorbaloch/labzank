"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLang } from "@/lib/i18n";
import type { DictKey } from "@/lib/dict";
import { ALPHABET, Entry, GlossLang, Pos, sources } from "@/lib/dictionary/data";
import { detectScript } from "@/lib/dictionary/normalize";
import { repo } from "@/lib/dictionary/repo";
import { arabToLatn, latnToArab, Result } from "@/lib/dictionary/translit";

/* ─────────────────────────── data hook ─────────────────────────── */

/** run an async loader when deps change; keeps the last good value */
function useAsync<T>(fn: () => Promise<T>, deps: unknown[], initial: T): { data: T; loading: boolean; error: string } {
  const [state, setState] = useState({ data: initial, loading: true, error: "" });
  useEffect(() => {
    let live = true;
    setState((s) => ({ ...s, loading: true }));
    fn()
      .then((data) => live && setState({ data, loading: false, error: "" }))
      .catch((e) => live && setState((s) => ({ ...s, loading: false, error: e?.message ?? String(e) })));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}

function DbError({ msg }: { msg: string }) {
  if (!msg) return null;
  return <p className="card my-4 p-4 text-[13px] text-[var(--rust)]" lang="en" dir="ltr">Database error: {msg}</p>;
}

const POS_LABEL: Record<Pos, { en: string; ur: string; bal: string }> = {
  noun: { en: "noun", ur: "اسم", bal: "نام" },
  verb: { en: "verb", ur: "فعل", bal: "کار" },
  adjective: { en: "adjective", ur: "صفت", bal: "سپت" },
  adverb: { en: "adverb", ur: "متعلق فعل", bal: "کارسپت" },
  pronoun: { en: "pronoun", ur: "ضمیر", bal: "بدلنام" },
  particle: { en: "particle", ur: "حرف", bal: "حرف" },
};

function usePosLabel() {
  const { lang } = useLang();
  return (p: Pos) => (lang === "ur" ? POS_LABEL[p].ur : lang === "bal" ? POS_LABEL[p].bal : POS_LABEL[p].en);
}

/* ─────────────────────────── hash routing ─────────────────────────── */

type View = { kind: "home" } | { kind: "word"; slug: string } | { kind: "letter"; i: number } | { kind: "convert" };

function parseHash(h: string): View {
  const v = h.replace(/^#/, "");
  if (v.startsWith("word-") && v.length > 5) return { kind: "word", slug: v.slice(5) };
  if (v.startsWith("letter-")) return { kind: "letter", i: Math.min(ALPHABET.length - 1, Math.max(0, +v.slice(7) || 0)) };
  if (v === "convert") return { kind: "convert" };
  return { kind: "home" };
}

function useView(): [View, (h: string) => void] {
  const [view, setView] = useState<View>({ kind: "home" });
  useEffect(() => {
    const f = () => {
      setView(parseHash(location.hash));
      window.scrollTo({ top: 0 });
    };
    f();
    addEventListener("hashchange", f);
    return () => removeEventListener("hashchange", f);
  }, []);
  return [view, (h: string) => (location.hash = h)];
}

/* ─────────────────────────── keyboard ─────────────────────────── */

const KEYS_ARAB = ["ا", "آ", "ب", "پ", "ت", "ٹ", "ج", "چ", "د", "ڈ", "ر", "ز", "ژ", "س", "ش", "ک", "گ", "ل", "م", "ن", "و", "ۏ", "ہ", "ھ", "ی", "ے", "ݔ", "ء", "ئ", "ءِ", "ءَ", "ءُ", "َ", "ِ", "ُ", "ّ"];
const KEYS_LATN = ["á", "é", "í", "ó", "ú", "ṭ", "ḍ", "sh", "ch", "zh", "kh", "gh", "'"];

function Keyboard({ onKey, onBack, onSpace }: { onKey: (k: string) => void; onBack: () => void; onSpace: () => void }) {
  const [mode, setMode] = useState<"arab" | "latn">("arab");
  const keys = mode === "arab" ? KEYS_ARAB : KEYS_LATN;
  return (
    <div className="mt-3 rounded-2xl border border-[var(--faint)] bg-[var(--ink-2)] p-3" role="group" aria-label="Balochi keyboard">
      <div className="mb-2 flex gap-2">
        <button className={`chip ${mode === "arab" ? "on" : ""}`} onClick={() => setMode("arab")} type="button">بلوچی ابجد</button>
        <button className={`chip ${mode === "latn" ? "on" : ""}`} onClick={() => setMode("latn")} type="button" lang="en">Latin</button>
      </div>
      <div className="flex flex-wrap gap-1.5" dir={mode === "arab" ? "rtl" : "ltr"}>
        {keys.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => onKey(k)}
            className="grid h-10 min-w-10 place-items-center rounded-lg border border-[var(--faint)] px-2 text-[19px] hover:border-[var(--gold)]/60 hover:text-[var(--gold-bright)]"
            lang={mode === "arab" ? "bal" : "bal-Latn"}
          >
            {/^[ً-ْ]$/.test(k) ? `ـ${k}` : k}
          </button>
        ))}
        <button type="button" onClick={onSpace} className="h-10 rounded-lg border border-[var(--faint)] px-6 text-[12px] text-[var(--dim)]">space</button>
        <button type="button" onClick={onBack} className="h-10 rounded-lg border border-[var(--faint)] px-4 text-[16px]" aria-label="Backspace">⌫</button>
      </div>
    </div>
  );
}

/* ─────────────────────────── small parts ─────────────────────────── */

function Headword({ e, size = "lg" }: { e: Entry; size?: "lg" | "sm" }) {
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-3">
      <span lang="bal" dir="rtl" className={`nastaliq ${size === "lg" ? "text-[clamp(40px,5vw,72px)]" : "text-[22px]"}`} style={{ lineHeight: 1.9 }}>
        {e.arab}
      </span>
      <span lang="bal-Latn" dir="ltr" className={`font-[family-name:var(--latin-display)] italic text-[var(--gold-bright)] ${size === "lg" ? "text-[clamp(24px,2.6vw,36px)]" : "text-[16px]"}`}>
        {e.latn}
      </span>
    </span>
  );
}

function WordCard({ e }: { e: Entry }) {
  const { lang } = useLang();
  const pl = usePosLabel();
  const gl = (lang === "ur" ? e.senses[0].gloss.ur : e.senses[0].gloss.en) ?? e.senses[0].gloss.en ?? "";
  return (
    <a href={`#word-${e.slug}`} className="card flex items-center justify-between gap-4 px-5 py-3">
      <Headword e={e} size="sm" />
      <span className="text-end text-[13px] text-[var(--dim)]">
        <span className="block text-[var(--text)]" lang={lang === "ur" ? "ur" : "en"} dir={lang === "ur" ? "rtl" : "ltr"}>{gl}</span>
        {pl(e.senses[0].pos)}
      </span>
    </a>
  );
}

/* ─────────────────────────── views ─────────────────────────── */

function SearchPanel({ go }: { go: (h: string) => void }) {
  const { t } = useLang();
  const pl = usePosLabel();
  const [q, setQ] = useState("");
  const [kb, setKb] = useState(false);
  const [pos, setPos] = useState<Pos | "">("");
  const [hasBrh, setHasBrh] = useState(false);
  const [hasEx, setHasEx] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      setRecent(JSON.parse(localStorage.getItem("labzank-dict-recent") || "[]"));
    } catch {}
  }, []);
  const remember = (s: string) => {
    const next = [s, ...recent.filter((r) => r !== s)].slice(0, 6);
    setRecent(next);
    try {
      localStorage.setItem("labzank-dict-recent", JSON.stringify(next));
    } catch {}
  };

  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setDebounced(q.trim()), 220);
    return () => clearTimeout(id);
  }, [q]);
  const { data: found, loading, error } = useAsync(() => repo.search(debounced, pos), [debounced, pos], [] as Entry[]);
  const results = useMemo(
    () =>
      found.filter(
        (e) => (!hasBrh || e.senses.some((s) => s.gloss.brh)) && (!hasEx || e.senses.some((s) => s.examples?.length))
      ),
    [found, hasBrh, hasEx]
  );

  const open = (e: Entry) => {
    remember(q.trim() || e.latn);
    go(`word-${e.slug}`);
  };
  const insert = (k: string) => {
    const el = input.current;
    const a = el?.selectionStart ?? q.length;
    const b = el?.selectionEnd ?? q.length;
    const next = q.slice(0, a) + k + q.slice(b);
    setQ(next);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(a + k.length, a + k.length);
    });
  };
  const sc = detectScript(q);

  return (
    <div>
      <form
        onSubmit={(ev) => {
          ev.preventDefault();
          if (results[0]) open(results[0]);
        }}
        className="flex items-center gap-2 rounded-full border border-[var(--faint)] bg-black/30 p-2 ps-6 focus-within:border-[var(--gold)]/60"
      >
        <input
          ref={input}
          value={q}
          onChange={(ev) => setQ(ev.target.value)}
          placeholder={t("d.searchPh")}
          dir={sc === "arab" ? "rtl" : sc === "latn" ? "ltr" : "auto"}
          lang={sc === "arab" ? "bal" : undefined}
          className={`min-w-0 flex-1 bg-transparent py-3 outline-none ${sc === "arab" ? "text-[24px]" : "text-[20px]"}`}
          aria-label={t("nav.search")}
          autoComplete="off"
        />
        <button type="button" onClick={() => setKb((v) => !v)} className={`chip ${kb ? "on" : ""}`} aria-pressed={kb}>
          ⌨ <span className="hidden sm:inline">{t("d.keyboard")}</span>
        </button>
        <button className="pill pill-gold !px-6 !py-3" type="submit">{t("nav.search")}</button>
      </form>
      {kb && <Keyboard onKey={insert} onSpace={() => insert(" ")} onBack={() => setQ((v) => v.slice(0, -1))} />}

      <div className="mt-4 flex flex-wrap items-center gap-2 text-[13px]">
        <span className="text-[var(--dim)]">{t("d.filters")}:</span>
        <select value={pos} onChange={(e) => setPos(e.target.value as Pos | "")} className="chip bg-transparent" aria-label={t("d.pos")}>
          <option value="">{t("d.pos")}: {t("d.any")}</option>
          {(Object.keys(POS_LABEL) as Pos[]).map((p) => (
            <option key={p} value={p}>{pl(p)}</option>
          ))}
        </select>
        <button className={`chip ${hasBrh ? "on" : ""}`} onClick={() => setHasBrh((v) => !v)} aria-pressed={hasBrh}>{t("d.hasBrh")}</button>
        <button className={`chip ${hasEx ? "on" : ""}`} onClick={() => setHasEx((v) => !v)} aria-pressed={hasEx}>{t("d.hasEx")}</button>
      </div>

      {q.trim() ? (
        <div className="mt-6">
          <DbError msg={error} />
          <p className="mb-3 text-[13px] text-[var(--dim)]">
            <span lang="en">{results.length}</span> {t("d.results")} {loading && <span className="opacity-60">…</span>}
          </p>
          {results.length === 0 ? (
            <p className="card p-6 text-center text-[var(--dim)]">{t("d.none")}</p>
          ) : (
            <div className="grid gap-2 md:grid-cols-2" role="listbox">
              {results.slice(0, 20).map((e) => (
                <div key={e.id} role="option" aria-selected={false} onClickCapture={() => remember(q.trim())}>
                  <WordCard e={e} />
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        recent.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center gap-2 text-[13px]">
            <span className="text-[var(--dim)]">{t("d.recentSearches")}:</span>
            {recent.map((r) => (
              <button key={r} className="chip" onClick={() => setQ(r)}>{r}</button>
            ))}
          </div>
        )
      )}
    </div>
  );
}

function Home({ go }: { go: (h: string) => void }) {
  const { t, lang } = useLang();
  const pl = usePosLabel();
  const { data: wotd, error } = useAsync(() => repo.wordOfDay(), [], null as Entry | null);
  const { data: recent } = useAsync(() => repo.recent(6), [], [] as Entry[]);
  const { data: popular } = useAsync(() => repo.popular(6), [], [] as Entry[]);
  const first = wotd?.senses[0];
  return (
    <>
      <SearchPanel go={go} />

      <section className="mt-12">
        <p className="kicker mb-3">{t("d.browse")}</p>
        <div className="flex flex-wrap gap-1.5" dir="rtl">
          {ALPHABET.map((l, i) => (
            <a key={l} href={`#letter-${i}`} className="grid h-11 w-11 place-items-center rounded-lg border border-[var(--faint)] text-[20px] hover:border-[var(--gold)]/60 hover:text-[var(--gold-bright)]" lang="bal">
              {l}
            </a>
          ))}
        </div>
      </section>

      <section className="mt-12 grid gap-6 lg:grid-cols-[1.2fr_1fr_1fr]">
        {wotd && first ? (
        <a href={`#word-${wotd.slug}`} className="card relative overflow-hidden p-7" style={{ borderColor: "color-mix(in srgb, var(--gold) 40%, transparent)" }}>
          <div className="doch-bg absolute inset-y-0 end-0 w-1/3 opacity-25" />
          <p className="kicker relative">{t("d.wotd")}</p>
          <div className="relative mt-2"><Headword e={wotd} /></div>
          <p className="relative mt-1 text-[14px] text-[var(--dim)]">
            {wotd.ipa && <span lang="en" dir="ltr" className="me-2">{wotd.ipa}</span>}
            {pl(first.pos)}
          </p>
          <p className="relative mt-3 text-[18px]" lang={lang === "ur" ? "ur" : "en"} dir={lang === "ur" ? "rtl" : "ltr"}>
            {(lang === "ur" ? first.gloss.ur : first.gloss.en) ?? first.gloss.en}
          </p>
        </a>
        ) : (
          <div className="card min-h-[180px] p-7 opacity-50"><DbError msg={error} /></div>
        )}
        <div>
          <p className="kicker mb-3">{t("d.recent")}</p>
          <div className="flex flex-col gap-2">{recent.map((e) => <WordCard key={e.id} e={e} />)}</div>
        </div>
        <div>
          <p className="kicker mb-3">{t("d.popular")}</p>
          <div className="flex flex-col gap-2">{popular.map((e) => <WordCard key={e.id} e={e} />)}</div>
        </div>
      </section>
    </>
  );
}

function LetterView({ i }: { i: number }) {
  const { t } = useLang();
  const letter = ALPHABET[i];
  const { data: list, loading, error } = useAsync(() => repo.byLetter(letter), [letter], [] as Entry[]);
  return (
    <>
      <div className="flex flex-wrap gap-1.5" dir="rtl">
        {ALPHABET.map((l, j) => (
          <a key={l} href={`#letter-${j}`} className={`grid h-11 w-11 place-items-center rounded-lg border text-[20px] ${j === i ? "border-[var(--gold)] bg-[var(--gold)] text-[var(--ink)]" : "border-[var(--faint)] hover:border-[var(--gold)]/60"}`} lang="bal">
            {l}
          </a>
        ))}
      </div>
      <h2 className="nastaliq mt-8 text-[64px] text-[var(--gold)]" lang="bal">{letter}</h2>
      <DbError msg={error} />
      {loading && list.length === 0 ? <p className="p-6 text-center text-[var(--dim)]">…</p> : list.length === 0 ? <p className="card p-6 text-center text-[var(--dim)]">{t("d.none")}</p> : <div className="grid gap-2 md:grid-cols-2">{list.map((e) => <WordCard key={e.id} e={e} />)}</div>}
    </>
  );
}

const TABS: GlossLang[] = ["bal", "en", "ur", "brh"];

function WordView({ slug }: { slug: string }) {
  const { t } = useLang();
  const { data, loading, error } = useAsync(
    async () => {
      const e = await repo.bySlug(slug);
      if (!e) return null;
      const relSlugs = [...(e.relations ?? []).map((r) => r.to), ...(e.root ? [e.root] : [])];
      const [related, derived] = await Promise.all([repo.many(relSlugs), repo.derived(slug)]);
      return { e, related, derived };
    },
    [slug],
    null as null | { e: Entry; related: Entry[]; derived: Entry[] }
  );
  if (loading && !data) return <p className="p-10 text-center text-[var(--dim)]">…</p>;
  if (!data || data.e.slug !== slug)
    return (
      <>
        <DbError msg={error} />
        <p className="card p-6 text-center text-[var(--dim)]">{t("d.none")}</p>
      </>
    );
  return <WordBody e={data.e} related={data.related} derivedList={data.derived} />;
}

function WordBody({ e, related, derivedList }: { e: Entry; related: Entry[]; derivedList: Entry[] }) {
  const { t, lang } = useLang();
  const pl = usePosLabel();
  const slug = e.slug;
  const find = (s: string) => related.find((x) => x.slug === s);
  // interface language first; if this word has no meaning there yet, the first tab that has one
  const preferred: GlossLang[] = lang === "ur" ? ["ur", "bal", "en", "brh"] : lang === "en" ? ["en", "bal", "ur", "brh"] : ["bal", "ur", "en", "brh"];
  const defaultTab: GlossLang = preferred.find((g) => e.senses.some((s) => s.gloss[g])) ?? preferred[0];
  const [tab, setTab] = useState<GlossLang>(defaultTab);
  useEffect(() => setTab(defaultTab), [slug, defaultTab]);
  const statusLabel = e.status === "draft" || e.status === "imported" ? t("d.draft") : e.status;
  const src = sources[e.source] ?? { name: e.source, licence: "see source record" };
  const rel = (type: string) => (e.relations ?? []).filter((r) => r.type === type).map((r) => find(r.to)).filter(Boolean) as Entry[];
  const derived = [...rel("derived"), ...derivedList.filter((x) => !rel("derived").some((d) => d.slug === x.slug))];
  const root = e.root ? find(e.root) : undefined;
  const glDir = (g: GlossLang) => (g === "bal" || g === "ur" ? "rtl" : "ltr");
  const glLang = (g: GlossLang) => (g === "bal" ? "bal" : g === "brh" ? "brh-Latn" : g);

  return (
    <article>
      <a href="#" className="text-[13px] text-[var(--dim)] hover:text-[var(--text)]"><span className="inline-block rtl:rotate-180">←</span> {t("d.back")}</a>
      <header className="mt-4 border-b border-[var(--faint)] pb-6">
        <Headword e={e} />
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-[14px] text-[var(--dim)]">
          {e.ipa && <span lang="en" dir="ltr">{e.ipa}</span>}
          {e.syllables && <span lang="bal-Latn" dir="ltr">{e.syllables.join(" · ")}</span>}
          <span>{[...new Set(e.senses.map((s) => pl(s.pos)))].join(" · ")}</span>
          <span className="rounded-full border border-[var(--faint)] px-3 py-0.5 text-[12px]">🔇 {t("d.audioNone")}</span>
          <span className="rounded-full border border-[var(--gold)]/40 px-3 py-0.5 text-[12px] text-[var(--gold)]">{statusLabel}</span>
        </div>
      </header>

      <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label={t("d.senses")}>
        {TABS.map((g) => {
          const missing = e.senses.every((s) => !s.gloss[g]);
          return (
            <button key={g} role="tab" aria-selected={tab === g} onClick={() => setTab(g)} className={`chip !px-5 !py-2 ${tab === g ? "on" : ""}`}>
              {t(`d.lang.${g}` as DictKey)}
              {missing && <span className="ms-1 opacity-60">○</span>}
            </button>
          );
        })}
      </div>

      <ol className="mt-6 flex flex-col gap-4" role="tabpanel">
        {e.senses.map((s, i) => {
          const g = s.gloss[tab];
          return (
            <li key={i} className="card p-6">
              <div className="flex items-baseline gap-3">
                <span className="font-[family-name:var(--latin-display)] text-[22px] text-[var(--gold)]" lang="en">{i + 1}</span>
                <span className="text-[13px] text-[var(--dim)]">{pl(s.pos)}</span>
              </div>
              {g ? (
                <p className="mt-2 text-[22px]" lang={glLang(tab)} dir={glDir(tab)}>{g}</p>
              ) : (
                <p className="mt-2 text-[16px] italic text-[var(--dim)]">{t("d.notYet")}</p>
              )}
              {s.examples?.length ? (
                <div className="mt-4 border-t border-[var(--faint)] pt-4">
                  <p className="mb-2 text-[12px] text-[var(--gold)]">{t("d.examples")}</p>
                  {s.examples.map((x, j) => (
                    <div key={j} className="mb-2">
                      <p className="nastaliq text-[22px]" lang="bal" dir="rtl" style={{ lineHeight: 2.1 }}>{x.arab}</p>
                      <p className="font-[family-name:var(--latin-display)] italic text-[var(--gold-bright)]" lang="bal-Latn" dir="ltr">{x.latn}</p>
                      {tab === "ur" && x.ur && <p className="text-[14px] text-[var(--dim)]" lang="ur" dir="rtl">{x.ur}</p>}
                      {tab !== "ur" && x.en && <p className="text-[14px] text-[var(--dim)]" lang="en" dir="ltr">{x.en}</p>}
                    </div>
                  ))}
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {[
          [t("d.root"), root ? [root] : []],
          [t("d.derived"), derived],
          [t("d.related"), [...rel("see_also"), ...rel("synonym"), ...rel("antonym")]],
        ].map(([label, list]) => (
          <div key={label as string} className="card p-5">
            <p className="kicker mb-3">{label as string}</p>
            {(list as Entry[]).length ? (
              <div className="flex flex-wrap gap-2">
                {(list as Entry[]).map((x) => (
                  <a key={x.slug} href={`#word-${x.slug}`} className="chip">
                    <span lang="bal" className="me-1">{x.arab}</span>
                    <span lang="bal-Latn" className="italic">{x.latn}</span>
                    {rel("antonym").includes(x) && <span className="ms-1 text-[10px] opacity-70">({t("d.antonym")})</span>}
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-[var(--dim)]">—</p>
            )}
          </div>
        ))}
      </div>

      <footer className="mt-8 rounded-xl border border-[var(--faint)] p-4 text-[13px] text-[var(--dim)]">
        <span className="text-[var(--text)]">{t("d.source")}:</span> <span lang="en" dir="ltr">{src.name} · {src.licence}</span>
        <span className="mx-2">·</span>
        <span className="text-[var(--text)]">{t("d.status")}:</span> {statusLabel}
        <span className="mx-2">·</span>
        <span lang="en" dir="ltr">ID {e.id}</span>
      </footer>
    </article>
  );
}

function Converter() {
  const { t } = useLang();
  const [dir, setDir] = useState<"a2l" | "l2a">("a2l");
  const [text, setText] = useState("ماہ ءِ رُژن ءَ کوہ ءِ سرا\nمنی دل ءِ چراگ روک اِنت");
  const [copied, setCopied] = useState(false);
  const [queued, setQueued] = useState(false);
  const res: Result = useMemo(() => (dir === "a2l" ? arabToLatn(text) : latnToArab(text)), [text, dir]);
  const swap = () => {
    setText(res.text);
    setDir(dir === "a2l" ? "l2a" : "a2l");
    setQueued(false);
  };
  const outRtl = dir === "l2a";
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <button className={`chip ${dir === "a2l" ? "on" : ""}`} onClick={() => setDir("a2l")}>{t("d.a2l")}</button>
        <button className={`chip ${dir === "l2a" ? "on" : ""}`} onClick={() => setDir("l2a")}>{t("d.l2a")}</button>
      </div>
      <p className="mt-3 max-w-[70ch] text-[13px] text-[var(--dim)]">{t("d.convNote")}</p>
      <div className="mt-5 grid items-stretch gap-4 lg:grid-cols-[1fr_auto_1fr]">
        <label className="card flex flex-col p-4">
          <span className="mb-2 text-[12px] text-[var(--gold)]">{t("d.input")}</span>
          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setQueued(false);
            }}
            rows={8}
            dir={dir === "a2l" ? "rtl" : "ltr"}
            lang={dir === "a2l" ? "bal" : "bal-Latn"}
            className={`flex-1 resize-y bg-transparent outline-none ${dir === "a2l" ? "nastaliq text-[22px]" : "text-[18px]"}`}
            style={dir === "a2l" ? { lineHeight: 2.2 } : undefined}
          />
        </label>
        <button onClick={swap} className="pill pill-line self-center justify-center !px-4" aria-label="Swap">⇄</button>
        <div className="card flex flex-col p-4">
          <span className="mb-2 flex items-center justify-between text-[12px]">
            <span className="text-[var(--gold)]">{t("d.output")}</span>
            {res.unsureCount > 0 && <span className="text-[var(--dim)]"><span lang="en">{res.unsureCount}</span> {t("d.unsure")}</span>}
          </span>
          <div
            className={`min-h-[12rem] flex-1 whitespace-pre-wrap ${outRtl ? "nastaliq text-[22px]" : "font-[family-name:var(--latin-display)] text-[19px]"}`}
            dir={outRtl ? "rtl" : "ltr"}
            lang={outRtl ? "bal" : "bal-Latn"}
            style={outRtl ? { lineHeight: 2.2 } : undefined}
            aria-live="polite"
          >
            {res.lines.map((line, i) => (
              <div key={i}>
                {line.length === 0 ? " " : line.map((tk, j) => (
                  <span key={j} className={tk.unsure ? "underline decoration-[var(--rust)] decoration-wavy underline-offset-4" : tk.fromLexicon ? "text-[var(--gold-bright)]" : ""} title={tk.unsure ? "Check this word" : tk.fromLexicon ? "From the dictionary" : undefined}>
                    {tk.text}
                  </span>
                ))}
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2 border-t border-[var(--faint)] pt-3">
            <button
              className="chip"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(res.text);
                } catch {}
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? t("d.copied") : t("d.copy")}
            </button>
            <button className="chip" onClick={() => setQueued(true)}>{t("d.sendReview")}</button>
          </div>
          {queued && <p className="mt-2 text-[12px] text-[var(--gold-bright)]">{t("d.sentReview")}</p>}
        </div>
      </div>
      <p className="mt-3 text-[12px] text-[var(--dim)]">
        <span className="text-[var(--gold-bright)]">■</span> dictionary spelling · <span className="underline decoration-[var(--rust)] decoration-wavy">wavy</span> = rule guess
      </p>
    </div>
  );
}

/* ─────────────────────────── shell ─────────────────────────── */

export default function DictionaryApp() {
  const { t } = useLang();
  const [view, go] = useView();
  return (
    <div className="mx-auto max-w-[1200px] px-[5vw] pb-24 pt-28">
      <header className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <div>
          <a href="#" className="block">
            <p className="kicker">Labzank</p>
            <h1 className="display mt-2 text-[clamp(36px,5vw,72px)]">{t("d.title")}</h1>
          </a>
          <p className="lead mt-2">{t("d.sub")}</p>
        </div>
        <nav className="flex gap-2" aria-label={t("d.title")}>
          <a href="#" className={`chip !px-5 !py-2 ${view.kind !== "convert" ? "on" : ""}`}>{t("nav.search")}</a>
          <a href="#convert" className={`chip !px-5 !py-2 ${view.kind === "convert" ? "on" : ""}`}>{t("d.converter")}</a>
        </nav>
      </header>

      {view.kind === "home" && <Home go={go} />}
      {view.kind === "word" && <WordView slug={view.slug} />}
      {view.kind === "letter" && <LetterView i={view.i} />}
      {view.kind === "convert" && <Converter />}

      <p className="mt-16 border-t border-[var(--faint)] pt-6 text-[12px] text-[var(--dim)]">{t("d.sampleNote")}</p>
    </div>
  );
}
