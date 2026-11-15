"use client";

/**
 * Site name + logo (Admin → Site → Branding, site_settings.branding).
 * Read once per page load, cached in localStorage so the header does not flicker,
 * and refreshed live when an admin saves new branding.
 */
import { useEffect, useState } from "react";
import { supabase } from "./db/client";
import { mediaUrl } from "./media";

export type Branding = { name: string; logoPath: string | null; logoDarkPath: string | null };
export const DEFAULT_BRANDING: Branding = { name: "Labzaank", logoPath: null, logoDarkPath: null };

const CACHE = "labzaank-branding";
const EVENT = "labzaank:branding";

let current: Branding = DEFAULT_BRANDING;
let loading: Promise<Branding> | null = null;

export function parseBranding(v: unknown): Branding | null {
  const o = v as { name?: unknown; logo_path?: unknown; logo_dark_path?: unknown } | null;
  if (!o || typeof o.name !== "string" || !o.name.trim()) return null;
  return {
    name: o.name.trim(),
    logoPath: typeof o.logo_path === "string" && o.logo_path ? o.logo_path : null,
    logoDarkPath: typeof o.logo_dark_path === "string" && o.logo_dark_path ? o.logo_dark_path : null,
  };
}

const esc = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** Replace the site name where it sits in a title ("Name — …" or "… — Name"), never inside a longer name. */
function swapName(title: string, from: string, to: string) {
  if (from === to) return title;
  return title.replace(new RegExp(`(^|— )${esc(from)}(?= —|$)`), `$1${to}`);
}
let keeper: MutationObserver | null = null;
/** Next.js re-applies the static <title> (built with the default name) after load; keep the real name in it. */
function keepTitle() {
  if (keeper || typeof document === "undefined") return;
  const fix = () => {
    const t = swapName(document.title, DEFAULT_BRANDING.name, current.name);
    if (t !== document.title) document.title = t;
  };
  keeper = new MutationObserver(fix);
  keeper.observe(document.head, { subtree: true, childList: true, characterData: true });
  fix();
}

/** Current site name (for document titles set from code). */
export function siteName() {
  return current.name;
}

function load(): Promise<Branding> {
  if (loading) return loading;
  loading = (async () => {
    if (!supabase) return current;
    const { data } = await supabase.from("site_settings").select("value").eq("key", "branding").maybeSingle();
    const b = parseBranding(data?.value);
    if (b) publish(b);
    return current;
  })();
  return loading;
}

/** Apply new branding everywhere on the page (used after load and after an admin saves). */
export function publish(b: Branding) {
  const prev = current;
  current = b;
  // cached in the same shape as the database row so parseBranding reads both
  try { localStorage.setItem(CACHE, JSON.stringify({ name: b.name, logo_path: b.logoPath, logo_dark_path: b.logoDarkPath })); } catch {}
  if (typeof document !== "undefined") document.title = swapName(document.title, prev.name, b.name);
  window.dispatchEvent(new CustomEvent(EVENT, { detail: b }));
}

export function useBranding() {
  const [b, setB] = useState<Branding>(current);
  useEffect(() => {
    try {
      const cached = parseBranding(JSON.parse(localStorage.getItem(CACHE) ?? "null"));
      if (cached) {
        document.title = swapName(document.title, current.name, cached.name);
        current = cached;
        setB(current);
      }
    } catch {}
    keepTitle();
    const h = (e: Event) => setB((e as CustomEvent<Branding>).detail);
    addEventListener(EVENT, h);
    load().then(setB);
    return () => removeEventListener(EVENT, h);
  }, []);
  return {
    ...b,
    logoUrl: mediaUrl("images", b.logoPath),
    logoDarkUrl: mediaUrl("images", b.logoDarkPath),
  };
}
