"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { L, Tx, useLang } from "@/lib/i18n";
import { useContent } from "@/lib/content-store";
import { repo } from "@/lib/dictionary/repo";
import type { Entry } from "@/lib/dictionary/data";
import { SearchIcon } from "./ScrollFilm";
import { page } from "@/lib/links";

type Hit = { type: "poet" | "poem" | "book" | "word"; title: L; sub?: L; href: string };

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ًͯ-ٰٟ]/g, "") // latin accents + arabic diacritics
    .replace(/[يى]/g, "ی")
    .replace(/[كک]/g, "ک")
    .replace(/[ۀة]/g, "ہ");

const all = (v: L) => [v.bal, v["bal-latn"], v.en, v.ur].filter(Boolean).join(" ");

/** Global search across Balochi (both scripts), English and Urdu fields. */
const wordHit = (w: Entry): Hit & { hay: string } => ({
  type: "word",
  title: { bal: w.arab, "bal-latn": w.latn },
  sub: { bal: w.latn, en: w.senses.map((s) => s.gloss.en).filter(Boolean).join("; "), ur: w.senses.map((s) => s.gloss.ur).filter(Boolean).join("، ") },
  href: page("dictionary", `word-${w.slug}`),
  hay: "",
});

export default function SearchOverlay() {
  const { t } = useLang();
  const { poets, poems, books } = useContent();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const h = (e: Event) => {
      setQ((e as CustomEvent<string>).detail || "");
      setOpen(true);
      setTimeout(() => input.current?.focus(), 50);
    };
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => input.current?.focus(), 50);
      }
    };
    addEventListener("labzank:search", h);
    addEventListener("keydown", k);
    return () => {
      removeEventListener("labzank:search", h);
      removeEventListener("keydown", k);
    };
  }, []);

  const index = useMemo<(Hit & { hay: string })[]>(
    () => [
      ...poets.map((p) => ({ type: "poet" as const, title: p.name, sub: p.place, href: page("poets", p.slug), hay: norm(all(p.name) + " " + all(p.bio)) })),
      ...poems.map((p) => ({
        type: "poem" as const,
        title: { bal: p.original.split("\n")[0], "bal-latn": p.roman.split("\n")[0] },
        sub: p.contributor,
        href: page("poetry", p.id),
        hay: norm([p.original, p.roman, p.translation.en, p.translation.ur].join(" ")),
      })),
      ...books.map((b) => ({ type: "book" as const, title: b.title, sub: b.author, href: page("library", b.id), hay: norm(all(b.title) + " " + all(b.author)) })),

    ],
    [poets, poems, books]
  );

  const [words, setWords] = useState<Entry[]>([]);
  useEffect(() => {
    if (!q.trim()) return setWords([]);
    const id = setTimeout(() => repo.search(q).then((r) => setWords(r.slice(0, 5))).catch(() => setWords([])), 200);
    return () => clearTimeout(id);
  }, [q]);
  const hits = useMemo(() => {
    const n = norm(q.trim());
    if (!n) return [];
    const content = index.filter((h) => n.split(/\s+/).every((w) => h.hay.includes(w))).slice(0, 8);
    return [...content, ...words.map(wordHit)].slice(0, 12);
  }, [q, index, words]);

  const popular = ["Gul Khan", "مست", "Sayad Ganj", "زہیروک", "áp", "water"];

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/70 p-4 pt-[12vh] backdrop-blur-md" onClick={() => setOpen(false)} role="dialog" aria-modal="true" aria-label={t("nav.search")}>
      <div className="w-full max-w-[680px] overflow-hidden rounded-2xl border border-[var(--faint)] bg-[var(--ink-2)] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-[var(--faint)] px-5 py-4">
          <SearchIcon />
          <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("hero.searchPh")} className="flex-1 bg-transparent text-[18px] outline-none" />
          <button onClick={() => setOpen(false)} className="text-[12px] text-[var(--dim)]">ESC</button>
        </div>
        <div className="max-h-[56vh] overflow-y-auto p-2">
          {!q && (
            <div className="p-4">
              <p className="kicker mb-3">{t("ui.popular")}</p>
              <div className="flex flex-wrap gap-2">
                {popular.map((p) => (
                  <button key={p} className="chip" onClick={() => setQ(p)}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}
          {q && hits.length === 0 && <p className="p-6 text-center text-[var(--dim)]">{t("ui.noResults")}</p>}
          {hits.map((h, i) => (
            <a key={i} href={h.href} onClick={() => setOpen(false)} className="flex items-center justify-between gap-4 rounded-xl px-4 py-3 hover:bg-white/5">
              <span className="min-w-0">
                <Tx v={h.title} className="block truncate text-[16px]" />
                {h.sub && <Tx v={h.sub} className="block truncate text-[13px] text-[var(--dim)]" />}
              </span>
              <span className="shrink-0 rounded-full border border-[var(--faint)] px-2.5 py-0.5 text-[11px] text-[var(--gold)]">{t(`ui.type.${h.type}`)}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
