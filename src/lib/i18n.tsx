"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { dict, DictKey } from "./dict";
import { supabase } from "./db/client";
import { siteName } from "./branding";

/**
 * Interface languages. Balochi ships in two scripts: Arabic-based (RTL) and
 * Latin-based (LTR). Urdu is RTL, English LTR. Which ones appear in the
 * navigation, and which one a new visit opens in, is set in
 * Admin → Site → Languages (table site_settings, key "languages").
 */
export type Lang = "bal" | "bal-latn" | "en" | "ur";

export const LANGS: { code: Lang; label: string; dir: "rtl" | "ltr"; htmlLang: string }[] = [
  { code: "en", label: "English", dir: "ltr", htmlLang: "en" },
  { code: "bal", label: "بلوچی", dir: "rtl", htmlLang: "bal" },
  { code: "bal-latn", label: "Balòchi", dir: "ltr", htmlLang: "bal-Latn" },
  { code: "ur", label: "اردو", dir: "rtl", htmlLang: "ur" },
];

/** Multilingual content field — Balochi original is mandatory, the rest optional. */
export type L = { bal: string; "bal-latn"?: string; en?: string; ur?: string };

/** Visitor's choice lasts for the visit (tab session); every new visit opens in the site default. */
const STORAGE_KEY = "labzank-lang";
const SETTINGS_CACHE = "labzank-languages";

export type LangSettings = { enabled: Lang[]; default: Lang };
export const DEFAULT_LANG_SETTINGS: LangSettings = { enabled: ["en", "bal", "ur"], default: "en" };

function validSettings(v: unknown): LangSettings | null {
  const o = v as Partial<LangSettings> | null;
  if (!o || !Array.isArray(o.enabled)) return null;
  const enabled = LANGS.map((l) => l.code).filter((c) => o.enabled!.includes(c));
  if (!enabled.length) return null;
  return { enabled, default: o.default && enabled.includes(o.default) ? o.default : enabled[0] };
}

type Ctx = {
  lang: Lang;
  /** languages switched on in the admin, in display order */
  enabled: Lang[];
  settings: LangSettings;
  /** apply new settings immediately (used by the admin screen after saving) */
  applySettings: (s: LangSettings) => void;
  dir: "rtl" | "ltr";
  setLang: (l: Lang) => void;
  t: (k: DictKey) => string;
  pick: (v: L) => { text: string; lang: Lang; fallback: boolean };
};

const LangCtx = createContext<Ctx | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG_SETTINGS.default);
  const [settings, setSettings] = useState<LangSettings>(DEFAULT_LANG_SETTINGS);

  const applySettings = useCallback((next: LangSettings) => {
    setSettings(next);
    let chosen: string | null = null;
    try { chosen = sessionStorage.getItem(STORAGE_KEY); } catch {}
    setLangState(chosen && next.enabled.includes(chosen as Lang) ? (chosen as Lang) : next.default);
  }, []);

  useEffect(() => {
    // 1) last known settings (no flicker), 2) live settings from the database
    let cached: LangSettings | null = null;
    try { cached = validSettings(JSON.parse(localStorage.getItem(SETTINGS_CACHE) ?? "null")); } catch {}
    applySettings(cached ?? DEFAULT_LANG_SETTINGS);
    if (!supabase) return;
    supabase.from("site_settings").select("value").eq("key", "languages").maybeSingle().then(({ data }) => {
      const live = validSettings(data?.value);
      if (!live) return;
      try { localStorage.setItem(SETTINGS_CACHE, JSON.stringify(live)); } catch {}
      applySettings(live);
    });
  }, [applySettings]);

  const meta = LANGS.find((l) => l.code === lang)!;

  useEffect(() => {
    const html = document.documentElement;
    html.lang = meta.htmlLang;
    html.dir = meta.dir;
    html.className = `lang-${lang}`;
  }, [lang, meta]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      sessionStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
    // layout shifts with direction/fonts — let ScrollTrigger re-measure
    requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
  }, []);

  // UI strings name the site "Labzaank"; swap in the name set in Admin → Site → Branding
  const [brand, setBrand] = useState(siteName());
  useEffect(() => {
    const h = () => setBrand(siteName());
    h();
    addEventListener("labzaank:branding", h);
    return () => removeEventListener("labzaank:branding", h);
  }, []);
  const t = useCallback(
    (k: DictKey) => {
      const e = dict[k];
      const v = (e as Record<string, string>)[lang] ?? e.en ?? e.bal;
      return brand === "Labzaank" ? v : v.split("Labzaank").join(brand);
    },
    [lang, brand]
  );

  /**
   * Resolve a content field for the active language. Literary text is never
   * machine-translated: if no approved translation exists we show the
   * original and flag it (fallback=true) so the UI can badge it.
   */
  const pick = useCallback(
    (v: L) => {
      if (v[lang]) return { text: v[lang]!, lang, fallback: false };
      if (lang === "bal-latn") return { text: v.bal, lang: "bal" as Lang, fallback: false };
      return { text: v.bal, lang: "bal" as Lang, fallback: true };
    },
    [lang]
  );

  return (
    <LangCtx.Provider value={{ lang, dir: meta.dir, setLang, t, pick, enabled: settings.enabled, settings, applySettings }}>{children}</LangCtx.Provider>
  );
}

export function useLang() {
  const c = useContext(LangCtx);
  if (!c) throw new Error("useLang outside LangProvider");
  return c;
}

/** Render a multilingual field; badges content shown in its original language. */
export function Tx({ v, className, as: Tag = "span" }: { v: L; className?: string; as?: "span" | "p" | "h3" | "h2" | "h1" | "div" }) {
  const { pick, t } = useLang();
  const r = pick(v);
  const meta = LANGS.find((l) => l.code === r.lang)!;
  return (
    <Tag className={className} lang={meta.htmlLang} dir={meta.dir}>
      {r.text}
      {r.fallback && (
        <span className="fallback-badge" title={t("ui.fallbackTitle")}>
          {t("ui.original")}
        </span>
      )}
    </Tag>
  );
}
