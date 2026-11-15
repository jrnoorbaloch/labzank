"use client";

import { useEffect, useRef, useState } from "react";
import { LANGS, useLang } from "@/lib/i18n";
import type { DictKey } from "@/lib/dict";
import { openSearch, SearchIcon } from "./ScrollFilm";
import { page, PageName } from "@/lib/links";

/** navigation_items — admin-managed in production */
const PRIMARY: { k: DictKey; href: string }[] = [
  { k: "nav.home", href: "#top" },
  { k: "nav.poetry", href: "@poetry" },
  { k: "nav.poets", href: "@poets" },
  { k: "nav.books", href: "@library" },
  { k: "nav.dictionary", href: "@dictionary" },
  { k: "nav.culture", href: "#folk" },
];
const MORE: { k: DictKey; href: string }[] = [
  { k: "nav.media", href: "#audio" },
  { k: "nav.prose", href: "@library" },
  { k: "nav.articles", href: "#events" },
  { k: "nav.about", href: "#story" },
  { k: "nav.contact", href: "#footer" },
];

function useClickAway(cb: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && cb();
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [cb]);
  return ref;
}

/** "#x" anchors live on the homepage; "@page" means another page. */
function resolve(href: string, onHome: boolean) {
  if (href.startsWith("@")) return page(href.slice(1) as PageName);
  return onHome ? href : page("home", href.slice(1));
}

export default function Nav({ onHome = true, active }: { onHome?: boolean; active?: DictKey }) {
  const { t, lang, setLang, enabled } = useLang();
  const [solid, setSolid] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const langRef = useClickAway(() => setLangOpen(false));
  const moreRef = useClickAway(() => setMoreOpen(false));

  useEffect(() => {
    const onScroll = () => {
      const film = document.getElementById("top");
      if (!film) return setSolid(true);
      setSolid(scrollY > (film.offsetHeight - innerHeight) * 0.97);
    };
    onScroll();
    addEventListener("scroll", onScroll, { passive: true });
    return () => removeEventListener("scroll", onScroll);
  }, []);

  const current = LANGS.find((l) => l.code === lang)!;

  return (
    <>
      <header
        className="fixed inset-x-0 top-0 z-[80] transition-[background,backdrop-filter,border-color] duration-500"
        style={{
          background: solid ? "color-mix(in srgb, var(--ink) 84%, transparent)" : "linear-gradient(to bottom, rgba(13,10,7,0.7), transparent)",
          backdropFilter: solid ? "blur(14px)" : "none",
          borderBottom: `1px solid ${solid ? "var(--faint)" : "transparent"}`,
        }}
      >
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-[4vw] py-3">
          <a href={resolve("#top", onHome)} className="flex items-baseline gap-2" aria-label="Labzank home">
            <span className="nastaliq text-[24px] leading-none text-[var(--gold)]" lang="bal" dir="rtl" style={{ lineHeight: 1.6 }}>
              لبزانک
            </span>
            <span className="hidden font-[family-name:var(--latin-body)] text-[10px] uppercase tracking-[0.4em] text-[var(--dim)] sm:inline" lang="en" dir="ltr">
              Labzank
            </span>
          </a>

          <nav className="hidden items-center gap-[1.6vw] text-[14px] xl:flex" aria-label="Primary">
            {PRIMARY.map((l) => (
              <a key={l.k} href={resolve(l.href, onHome)} className={`transition-colors hover:text-[var(--text)] ${active === l.k ? "text-[var(--gold)]" : "text-[var(--dim)]"}`}>
                {t(l.k)}
              </a>
            ))}
            <div ref={moreRef} className="relative">
              <button onClick={() => setMoreOpen((v) => !v)} className="flex items-center gap-1 text-[var(--dim)] hover:text-[var(--text)]" aria-expanded={moreOpen}>
                {t("nav.more")} <Chevron />
              </button>
              {moreOpen && (
                <div className="absolute end-0 top-full mt-3 min-w-[200px] rounded-xl border border-[var(--faint)] bg-[var(--ink-2)] p-2 shadow-2xl">
                  {MORE.map((l) => (
                    <a key={l.k} href={resolve(l.href, onHome)} onClick={() => setMoreOpen(false)} className="block rounded-lg px-3 py-2 text-[var(--dim)] hover:bg-white/5 hover:text-[var(--text)]">
                      {t(l.k)}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </nav>

          <div className="flex items-center gap-2">
            <button onClick={() => openSearch()} className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/5" aria-label={t("nav.search")}>
              <SearchIcon />
            </button>
            <div ref={langRef} className="relative">
              <button
                onClick={() => setLangOpen((v) => !v)}
                className="flex h-10 items-center gap-2 rounded-full border border-[var(--faint)] px-4 text-[14px] hover:border-[var(--gold)]/50"
                aria-haspopup="listbox"
                aria-expanded={langOpen}
                aria-label={t("nav.language")}
              >
                <Globe />
                <span lang={current.htmlLang}>{current.label}</span>
                <Chevron />
              </button>
              {langOpen && (
                <ul role="listbox" className="absolute end-0 top-full mt-2 min-w-[170px] rounded-xl border border-[var(--faint)] bg-[var(--ink-2)] p-1.5 shadow-2xl">
                  {LANGS.filter((l) => enabled.includes(l.code)).map((l) => (
                    <li key={l.code}>
                      <button
                        role="option"
                        aria-selected={l.code === lang}
                        onClick={() => {
                          setLang(l.code);
                          setLangOpen(false);
                        }}
                        className={`flex w-full items-center justify-between gap-4 rounded-lg px-3 py-2 text-start text-[15px] hover:bg-white/5 ${l.code === lang ? "text-[var(--gold)]" : "text-[var(--text)]"}`}
                        lang={l.htmlLang}
                        dir={l.dir}
                      >
                        {l.label}
                        {l.code === "bal-latn" && <span className="text-[10px] text-[var(--dim)]">Latin</span>}
                        {l.code === "bal" && <span className="text-[10px] text-[var(--dim)]">عربی</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <a href={resolve("#footer", onHome)} className="pill pill-line hidden !px-4 !py-2 text-[13px] md:inline-flex">
              {t("nav.login")}
            </a>
            <button onClick={() => setDrawer(true)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/5 xl:hidden" aria-label={t("nav.menu")}>
              <svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.6" fill="none"><path d="M4 7h16M4 12h16M4 17h10" /></svg>
            </button>
          </div>
        </div>
      </header>

      {/* mobile drawer */}
      <div className={`fixed inset-0 z-[95] transition ${drawer ? "visible" : "invisible"}`} aria-hidden={!drawer}>
        <div className={`absolute inset-0 bg-black/60 transition-opacity ${drawer ? "opacity-100" : "opacity-0"}`} onClick={() => setDrawer(false)} />
        <div
          className={`absolute inset-y-0 end-0 flex w-[min(86vw,360px)] flex-col gap-1 overflow-y-auto bg-[var(--ink-2)] p-6 transition-transform duration-500 ${
            drawer ? "translate-x-0" : "ltr:translate-x-full rtl:-translate-x-full"
          }`}
        >
          <button onClick={() => setDrawer(false)} className="mb-4 self-end text-[var(--dim)]" aria-label={t("ui.close")}>
            ✕
          </button>
          {[...PRIMARY, ...MORE].map((l) => (
            <a key={l.k + l.href} href={resolve(l.href, onHome)} onClick={() => setDrawer(false)} className="border-b border-[var(--faint)] py-3 text-[18px]">
              {t(l.k)}
            </a>
          ))}
          <a href={resolve("#footer", onHome)} onClick={() => setDrawer(false)} className="pill pill-gold mt-6 justify-center">
            {t("nav.login")}
          </a>
        </div>
      </div>
    </>
  );
}

function Chevron() {
  return (
    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="m3 4.5 3 3 3-3" />
    </svg>
  );
}
function Globe() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--gold)]" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z" />
    </svg>
  );
}
