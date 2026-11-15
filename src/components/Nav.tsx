"use client";

import { useEffect, useRef, useState } from "react";
import { LANGS, useLang } from "@/lib/i18n";
import type { DictKey } from "@/lib/dict";
import { openSearch, SearchIcon } from "./search";
import { page, PageName } from "@/lib/links";
import Logo from "./Logo";

/** Rekhta-style top bar: logo · section links · search · language · log in. */
const PRIMARY: { k: DictKey; href: string }[] = [
  { k: "nav.poets", href: "@poets" },
  { k: "nav.poetry", href: "@poetry" },
  { k: "nav.dictionary", href: "@dictionary" },
  { k: "nav.books", href: "@library" },
  { k: "nav.media", href: "#audio" },
  { k: "nav.culture", href: "#folk" },
  { k: "nav.articles", href: "#events" },
];
const MORE: { k: DictKey; href: string }[] = [
  { k: "nav.prose", href: "@library" },
  { k: "nav.about", href: "#footer" },
  { k: "nav.contact", href: "#contact" },
];

const SHORT: Record<string, string> = { en: "ENG", bal: "بلوچی", "bal-latn": "BAL", ur: "اردو" };

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
  const [langOpen, setLangOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const langRef = useClickAway(() => setLangOpen(false));
  const moreRef = useClickAway(() => setMoreOpen(false));
  const link = (k: DictKey) =>
    `whitespace-nowrap font-medium transition-colors hover:text-[var(--gold)] ${active === k ? "text-[var(--gold)]" : "text-[var(--text)]"}`;

  return (
    <>
      <header className="sticky top-0 z-[80] border-b border-[var(--faint)] bg-white/95 backdrop-blur" data-nav>
        <div className="mx-auto flex h-[60px] max-w-[1400px] items-center gap-5 px-[3vw]">
          <a href={resolve("#top", onHome)} className="flex shrink-0 items-center" aria-label="Labzaank home">
            <Logo />
          </a>

          <nav className="hidden flex-1 items-center justify-center gap-[1.4vw] text-[12px] uppercase tracking-[0.06em] rtl:text-[15px] rtl:normal-case rtl:tracking-normal xl:flex" aria-label="Primary">
            {PRIMARY.map((l) => (
              <a key={l.k} href={resolve(l.href, onHome)} className={link(l.k)}>{t(l.k)}</a>
            ))}
            <div ref={moreRef} className="relative">
              <button onClick={() => setMoreOpen((v) => !v)} className="flex items-center gap-1 font-medium uppercase hover:text-[var(--gold)] rtl:normal-case" aria-expanded={moreOpen}>
                {t("nav.more")} <Chevron />
              </button>
              {moreOpen && (
                <div className="absolute end-0 top-full mt-3 min-w-[190px] rounded-lg border border-[var(--faint)] bg-white p-1.5 normal-case tracking-normal shadow-xl">
                  {MORE.map((l) => (
                    <a key={l.k} href={resolve(l.href, onHome)} onClick={() => setMoreOpen(false)} className="block rounded-md px-3 py-2 text-[14px] text-[var(--text)] hover:bg-[var(--ink-2)]">
                      {t(l.k)}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </nav>

          <div className="ms-auto flex items-center gap-3 xl:ms-0">
            <button
              onClick={() => openSearch()}
              className="hidden h-9 w-[220px] items-center gap-2 rounded-md border border-[var(--faint)] bg-[var(--ink-2)] px-3 text-[13px] text-[var(--dim)] hover:border-[var(--gold)]/50 md:flex"
              aria-label={t("nav.search")}
              data-nav-search
            >
              <SearchIcon size={15} className="text-[var(--dim)]" />
              {t("nav.search")}
            </button>
            <button onClick={() => openSearch()} className="grid h-9 w-9 place-items-center rounded-full hover:bg-[var(--ink-2)] md:hidden" aria-label={t("nav.search")}>
              <SearchIcon size={17} className="text-[var(--text)]" />
            </button>
            <div ref={langRef} className="relative">
              <button
                onClick={() => setLangOpen((v) => !v)}
                className="flex h-9 items-center gap-1.5 px-1 text-[12px] font-medium text-[var(--gold)] hover:text-[var(--gold-bright)]"
                aria-haspopup="listbox"
                aria-expanded={langOpen}
                aria-label={t("nav.language")}
              >
                <span lang={LANGS.find((l) => l.code === lang)?.htmlLang}>{SHORT[lang]}</span>
                <Chevron />
              </button>
              {langOpen && (
                <ul role="listbox" className="absolute end-0 top-full mt-2 min-w-[160px] rounded-lg border border-[var(--faint)] bg-white p-1.5 shadow-xl">
                  {LANGS.filter((l) => enabled.includes(l.code)).map((l) => (
                    <li key={l.code}>
                      <button
                        role="option"
                        aria-selected={l.code === lang}
                        onClick={() => {
                          setLang(l.code);
                          setLangOpen(false);
                        }}
                        className={`flex w-full items-center justify-between gap-4 rounded-md px-3 py-2 text-start text-[15px] hover:bg-[var(--ink-2)] ${l.code === lang ? "text-[var(--gold)]" : "text-[var(--text)]"}`}
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
            <a href={page("admin")} className="hidden whitespace-nowrap text-[12px] font-medium uppercase tracking-[0.06em] text-[var(--text)] hover:text-[var(--gold)] rtl:text-[14px] rtl:normal-case md:inline">
              {t("nav.login")}
            </a>
            <button onClick={() => setDrawer(true)} className="grid h-9 w-9 place-items-center rounded-full hover:bg-[var(--ink-2)] xl:hidden" aria-label={t("nav.menu")}>
              <svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.6" fill="none"><path d="M4 7h16M4 12h16M4 17h10" /></svg>
            </button>
          </div>
        </div>
      </header>

      {/* mobile drawer */}
      <div className={`fixed inset-0 z-[95] transition ${drawer ? "visible" : "invisible"}`} aria-hidden={!drawer}>
        <div className={`absolute inset-0 bg-black/40 transition-opacity ${drawer ? "opacity-100" : "opacity-0"}`} onClick={() => setDrawer(false)} />
        <div
          className={`absolute inset-y-0 end-0 flex w-[min(86vw,340px)] flex-col overflow-y-auto bg-white p-6 shadow-2xl transition-transform duration-300 ${
            drawer ? "translate-x-0" : "ltr:translate-x-full rtl:-translate-x-full"
          }`}
        >
          <button onClick={() => setDrawer(false)} className="mb-4 self-end text-[var(--dim)]" aria-label={t("ui.close")}>✕</button>
          {[...PRIMARY, ...MORE].map((l) => (
            <a key={l.k + l.href} href={resolve(l.href, onHome)} onClick={() => setDrawer(false)} className="border-b border-[var(--faint)] py-3 text-[16px]">
              {t(l.k)}
            </a>
          ))}
          <a href={page("admin")} onClick={() => setDrawer(false)} className="mt-4 py-3 text-[15px] font-medium text-[var(--gold)]">{t("nav.login")}</a>
        </div>
      </div>
    </>
  );
}

function Chevron() {
  return (
    <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="m3 4.5 3 3 3-3" />
    </svg>
  );
}
