"use client";

import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { mediaUrl } from "@/lib/media";
import { supabase } from "@/lib/db/client";
import * as local from "@/lib/content";
import type { L } from "@/lib/i18n";

/**
 * Homepage content. Starts with the bundled sample content (so the page
 * renders instantly and works offline), then — when Supabase is configured —
 * swaps in the published rows from the database.
 */

export const SECTION_KEYS = ["manifesto", "potd", "poetry", "dictionary", "stats", "poets", "library", "folk", "audio", "events", "newsletter", "cta"] as const;
export type SectionKey = (typeof SECTION_KEYS)[number];

export type Content = {
  poets: local.Poet[];
  poems: local.Poem[];
  books: local.Book[];
  events: typeof local.events;
  folk: typeof local.folk;
  audio: typeof local.audio;
  heroSlides: typeof local.heroSlides;
  stats: typeof local.stats;
  sections: SectionKey[];
  live: boolean;
  /** true once live data has arrived (or failed / no database) — detail pages wait for it */
  loaded: boolean;
  error: string;
};

const initial: Content = {
  poets: local.poets,
  poems: local.poems,
  books: local.books,
  events: local.events,
  folk: local.folk,
  audio: local.audio,
  heroSlides: local.heroSlides,
  stats: local.stats,
  sections: [...SECTION_KEYS],
  live: false,
  loaded: !supabase,
  error: "",
};

const Ctx = createContext<Content>(initial);

/* row → frontend shape */
type Row = Record<string, unknown>;
type Slugs = Map<number, string>;
const mapPoet = (r: Row): local.Poet => ({
  id: r.id as number, slug: r.slug as string, name: r.name as L, period: r.period === "classical" ? "classical" : "modern",
  years: (r.years as string) ?? "", place: (r.place as L) ?? { bal: "" }, bio: (r.bio as L) ?? { bal: "" },
  works: (r.works as number) ?? 0, hue: (r.hue as number) ?? 30, photo: mediaUrl("images", r.photo_path as string),
});
const mapPoem = (r: Row, ids: Slugs): local.Poem => ({
  authorSlug: ids.get(r.author_id as number),
  id: r.slug as string, form: r.form as L, original: r.original as string, roman: (r.roman as string) ?? "",
  translation: { en: "", ur: "", ...(r.translation as object) }, contributor: (r.contributor as L) ?? { bal: "" }, sample: !!r.is_sample,
});
const mapBook = (r: Row, ids: Slugs): local.Book => {
  const p = (r.palette as string[]) ?? [];
  return {
    id: r.slug as string, title: r.title as L, author: (r.author_text as L) ?? { bal: "" }, cat: r.cat as local.BookCat,
    pages: (r.pages as number) ?? 0, year: (r.year as string) ?? undefined, palette: [p[0] ?? "#3a1020", p[1] ?? "#d9a441"], demo: !!r.is_demo,
    cover: mediaUrl("images", r.cover_path as string), pdf: (r.pdf_path as string) ?? undefined, canDownload: !!r.can_download,
    authorSlug: ids.get(r.author_id as number), isbn: (r.isbn as string) ?? undefined, copyright: (r.copyright as string) ?? undefined,
  };
};

async function load(): Promise<Partial<Content>> {
  const db = supabase!;
  const pub = (t: string, cols = "*") => db.from(t).select(cols).eq("status", "published").order("sort");
  const [a, p, b, e, f, au, h, s, st] = await Promise.all([
    pub("authors"), pub("poems"), pub("books"), pub("events"), pub("folk_items"), pub("audio_items"),
    db.from("hero_slides").select("*").eq("enabled", true).order("sort"),
    db.from("homepage_sections").select("key, enabled, sort").order("sort"),
    db.rpc("site_stats"),
  ]);
  const err = [a, p, b, e, f, au, h, s, st].find((r) => r.error)?.error;
  if (err) throw err;
  const rows = (r: { data: unknown }) => (r.data ?? []) as Row[];
  const out: Partial<Content> = { live: true };
  // keep sample content for any table that is still empty
  if (rows(a).length) out.poets = rows(a).map(mapPoet);
  const ids: Slugs = new Map(rows(a).map((r) => [r.id as number, r.slug as string]));
  if (rows(p).length) out.poems = rows(p).map((r) => mapPoem(r, ids));
  if (rows(b).length) out.books = rows(b).map((r) => mapBook(r, ids));
  if (rows(e).length) out.events = rows(e).map((r) => ({ day: r.day as string, month: r.month as L, title: r.title as L, place: (r.place as L) ?? { bal: "" } }));
  if (rows(f).length) out.folk = rows(f).map((r) => ({ title: r.title as L, body: r.body as L, glyph: (r.glyph as string) ?? "◆" }));
  if (rows(au).length) out.audio = rows(au).map((r) => ({ title: r.title as L, by: r.by_line as L, dur: (r.duration as string) ?? "", bars: [], src: mediaUrl("audio", r.audio_path as string), authorSlug: ids.get(r.author_id as number) }));
  if (rows(h).length)
    out.heroSlides = rows(h).map((r) => ({
      heading: r.heading as L,
      description: (r.description as L) ?? { bal: "" },
      quote: (r.quote as local.HeroQuote) ?? local.heroSlides[0].quote,
      featuredBookId: (r.featured_book_slug as string) ?? local.heroSlides[0].featuredBookId,
    }));
  if (rows(s).length)
    out.sections = rows(s).filter((r) => r.enabled).map((r) => r.key as SectionKey).filter((k) => SECTION_KEYS.includes(k));
  const sd = st.data as Partial<typeof local.stats> | null;
  if (sd) out.stats = { poets: sd.poets ?? 0, poems: sd.poems ?? 0, books: sd.books ?? 0, audio: sd.audio ?? 0 };
  return out;
}

export function ContentProvider({ children }: { children: ReactNode }) {
  const [c, setC] = useState<Content>(initial);
  useEffect(() => {
    if (!supabase) return;
    load()
      .then((x) => setC((prev) => ({ ...prev, ...x, loaded: true })))
      .catch((e) => {
        console.warn("[labzank] Supabase content failed, using sample content:", e?.message ?? e);
        setC((prev) => ({ ...prev, loaded: true, error: e?.message ?? String(e) }));
      });
  }, []);
  return <Ctx.Provider value={c}>{children}</Ctx.Provider>;
}

export const useContent = () => useContext(Ctx);
