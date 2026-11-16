"use client";

/**
 * Click-a-word glossary (Rekhta style). <Verse> renders poem text with every
 * word as a button; clicking one opens a small card with the dictionary
 * meaning. Only one card is open at a time across the page.
 * The meaning always comes from the dictionary: if the word (or its stem
 * after a few common endings are removed) is not a headword, the card says
 * so and offers a dictionary search — it never guesses.
 */

import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLang } from "@/lib/i18n";
import type { Entry, Pos } from "@/lib/dictionary/data";
import { cleanToken, repo } from "@/lib/dictionary/repo";
import { page } from "@/lib/links";

const POS: Record<Pos, { en: string; ur: string; bal: string }> = {
  noun: { en: "noun", ur: "اسم", bal: "نام" },
  verb: { en: "verb", ur: "فعل", bal: "کار" },
  adjective: { en: "adjective", ur: "صفت", bal: "سپت" },
  adverb: { en: "adverb", ur: "متعلق فعل", bal: "کارسپت" },
  pronoun: { en: "pronoun", ur: "ضمیر", bal: "بدلنام" },
  particle: { en: "particle", ur: "حرف", bal: "حرف" },
  numeral: { en: "numeral", ur: "عدد", bal: "اَدَد" },
};

const OPEN_EVENT = "labzaank:word-open";
let seq = 0;

type Open = { word: string; k: string; rect: DOMRect; btn: HTMLButtonElement };

/** Verse text with clickable words. Keeps line breaks. */
export function Verse({ text, className = "", lang, dir, style, ...rest }: {
  text: string;
  className?: string;
  lang: "bal" | "bal-Latn";
  dir: "rtl" | "ltr";
  style?: React.CSSProperties;
  [k: `data-${string}`]: string | boolean | undefined;
}) {
  const [open, setOpen] = useState<Open | null>(null);
  const id = useRef(0);
  if (!id.current) id.current = ++seq;

  useEffect(() => {
    const other = (e: Event) => { if ((e as CustomEvent).detail !== id.current) setOpen(null); };
    window.addEventListener(OPEN_EVENT, other);
    return () => window.removeEventListener(OPEN_EVENT, other);
  }, []);

  const click = (e: React.MouseEvent<HTMLButtonElement>, w: string, k: string) => {
    e.preventDefault();
    e.stopPropagation();
    const btn = e.currentTarget;
    if (open?.btn === btn) return setOpen(null);
    window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: id.current }));
    setOpen({ word: w, k, rect: btn.getBoundingClientRect(), btn });
  };

  const lines = text.split("\n");
  return (
    <>
      <p className={`whitespace-pre-line ${className}`} lang={lang} dir={dir} style={style} {...rest}>
        {lines.map((line, li) => (
          <Fragment key={li}>
            {line.split(/(\s+)/).map((tok, ti) =>
              /^\s+$/.test(tok) || !cleanToken(tok) ? (
                <Fragment key={ti}>{tok}</Fragment>
              ) : (
                <button
                  key={ti}
                  type="button"
                  onClick={(e) => click(e, tok, `${li}-${ti}`)}
                  className={`lafz ${open?.k === `${li}-${ti}` ? "on" : ""}`}
                  data-lafz={cleanToken(tok)}
                  aria-haspopup="dialog"
                >
                  {tok}
                </button>
              ),
            )}
            {li < lines.length - 1 && "\n"}
          </Fragment>
        ))}
      </p>
      {open && <WordCard key={open.k} o={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function WordCard({ o, onClose }: { o: Open; onClose: () => void }) {
  const { t, lang } = useLang();
  const [e, setE] = useState<Entry | null | undefined>(undefined);
  const card = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number; below: boolean } | null>(null);
  const word = cleanToken(o.word);

  useEffect(() => {
    let live = true;
    repo.lookup(word).then((r) => live && setE(r));
    return () => { live = false; };
  }, [word]);

  const place = useCallback(() => {
    const el = card.current;
    if (!el) return;
    const r = o.btn.getBoundingClientRect();
    const w = el.offsetWidth, h = el.offsetHeight, m = 10;
    if (window.innerWidth < 640) {
      // phones: a sheet at the bottom of the screen, so the verse stays visible
      setPos({ left: (window.innerWidth - w) / 2, top: window.innerHeight - h - 12, below: true });
      return;
    }
    const left = Math.min(Math.max(m, r.left + r.width / 2 - w / 2), window.innerWidth - w - m);
    const below = r.top - h - m < 60; // not enough room above (fixed header)
    const top = below ? r.bottom + 8 : r.top - h - 8;
    setPos({ left, top, below });
  }, [o.btn]);

  useLayoutEffect(place, [place, e]);

  useEffect(() => {
    const away = (ev: MouseEvent) => {
      const n = ev.target as Node;
      if (card.current?.contains(n) || o.btn.contains(n)) return;
      onClose();
    };
    const key = (ev: KeyboardEvent) => { if (ev.key === "Escape") { onClose(); o.btn.focus(); } };
    const moved = () => place();
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", key);
    window.addEventListener("scroll", moved, true);
    window.addEventListener("resize", moved);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", key);
      window.removeEventListener("scroll", moved, true);
      window.removeEventListener("resize", moved);
    };
  }, [onClose, o.btn, place]);

  const gl = lang === "ur" ? "ur" : "en";
  const glossDir = gl === "ur" ? "rtl" : "ltr";
  const posLabel = (p: Pos) => (POS[p] ? (lang === "ur" ? POS[p].ur : lang === "bal" ? POS[p].bal : POS[p].en) : p);
  const unverified = e && !["published", "verified"].includes(e.status);
  const searchHref = page("dictionary", `q=${encodeURIComponent(word)}`);

  return (
    <div
      ref={card}
      role="dialog"
      aria-label={word}
      data-word-card
      className="fixed z-[80] w-[min(320px,calc(100vw-20px))] rounded-lg border border-[var(--faint)] bg-white p-4 text-start shadow-[0_18px_40px_-12px_rgba(0,0,0,.35)]"
      style={{ left: pos?.left ?? -9999, top: pos?.top ?? -9999, direction: lang === "bal" || lang === "ur" ? "rtl" : "ltr" }}
    >
      <button onClick={onClose} className="absolute end-2 top-2 grid h-7 w-7 place-items-center rounded text-[var(--dim)] hover:bg-[var(--ink-2)]" aria-label={t("w.close")}>×</button>
      {e === undefined && <p className="py-2 text-[14px] text-[var(--dim)]">{t("w.loading")}</p>}

      {e === null && (
        <>
          <p className="nastaliq pe-6 text-[22px]" lang="bal" dir="auto" style={{ lineHeight: 1.9 }}>{word}</p>
          <p className="mt-1 text-[14px] text-[var(--dim)]">{t("w.none")}</p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
            <a href={searchHref} className="font-medium text-[var(--gold)] hover:underline">{t("w.search")} →</a>
            <a href={page("contact")} className="text-[var(--dim)] hover:text-[var(--gold)] hover:underline">{t("w.suggest")}</a>
          </div>
        </>
      )}

      {e && (
        <>
          <div className="flex items-baseline gap-3 pe-6" dir="ltr">
            <span className="nastaliq text-[24px]" lang="bal" dir="rtl" style={{ lineHeight: 1.8 }}>{e.arab}</span>
            <span className="italic text-[var(--gold)]" lang="bal-Latn">{e.latn}</span>
            {e.ipa && <span className="text-[12px] text-[var(--dim)]">{e.ipa}</span>}
          </div>
          <ol className="mt-2 space-y-1.5">
            {e.senses.slice(0, 3).map((s, i) => (
              <li key={i} className="text-[14px] leading-snug">
                <span className="me-1.5 text-[11px] uppercase tracking-wider text-[var(--dim)] rtl:normal-case rtl:tracking-normal">{posLabel(s.pos)}</span>
                <span lang={gl} dir={glossDir}>{s.gloss[gl] ?? s.gloss.en ?? s.gloss.ur}</span>
              </li>
            ))}
          </ol>
          {e.senses[0]?.examples?.[0] && (
            <p className="nastaliq mt-2 border-s-2 border-[var(--gold)]/40 ps-2 text-[16px] text-[var(--dim)]" lang="bal" dir="rtl" style={{ lineHeight: 1.9 }}>
              {e.senses[0].examples[0].arab}
            </p>
          )}
          {unverified && <p className="mt-2 text-[11px] text-amber-700">{t("d.draft")}</p>}
          <a href={page("dictionary", `word-${e.slug}`)} className="mt-3 inline-block text-[13px] font-medium text-[var(--gold)] hover:underline">{t("w.open")} →</a>
        </>
      )}
    </div>
  );
}
