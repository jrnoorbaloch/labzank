/**
 * Dictionary data access. One async API, two backends:
 *   - Supabase RPCs (supabase/migrations/…_dictionary.sql) when configured
 *   - the bundled sample data otherwise
 * The RPCs return entries in the same `Entry` shape as data.ts.
 */
import { supabase } from "@/lib/db/client";
import { bySlug as localBySlug, entries, Entry, popularSlugs, Pos, wordOfDay as localWotd } from "./data";
import { detectScript, normArab, normLatn } from "./normalize";

/* ── local implementation ── */

const idx = entries.map((e) => ({
  e,
  arab: normArab(e.arab),
  latn: normLatn(e.latn),
  en: normLatn(e.senses.map((s) => s.gloss.en ?? "").join(" | ")),
  ur: normArab(e.senses.map((s) => s.gloss.ur ?? "").join(" | ")),
}));

function localSearch(q: string): Entry[] {
  const sc = detectScript(q);
  if (sc === "none") return [];
  const n = sc === "arab" ? normArab(q) : normLatn(q);
  if (!n) return [];
  return idx
    .map((x) => {
      let s = 0;
      const head = sc === "arab" ? x.arab : x.latn;
      if (head === n) s = 100;
      else if (head.startsWith(n)) s = 70 - (head.length - n.length);
      else if (head.includes(n)) s = 40;
      const g = sc === "arab" ? x.ur : x.en;
      if (g.split(/[|,;()\s]+/).includes(n)) s = Math.max(s, 60);
      else if (g.includes(n)) s = Math.max(s, 25);
      return { e: x.e, s };
    })
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.e.latn.localeCompare(b.e.latn))
    .map((x) => x.e);
}

/* ── shared helpers ── */

async function rpcList(fn: string, args: Record<string, unknown>): Promise<Entry[]> {
  const { data, error } = await supabase!.rpc(fn, args);
  if (error) throw error;
  return ((data ?? []) as Entry[]).filter(Boolean);
}

/* ── public API ── */

export const repo = {
  live: !!supabase,

  async search(q: string, pos?: Pos | ""): Promise<Entry[]> {
    if (!q.trim()) return [];
    if (!supabase) return localSearch(q).filter((e) => !pos || e.senses.some((s) => s.pos === pos)).slice(0, 20);
    return rpcList("dict_search", { q, lim: 20, p_pos: pos || null });
  },

  async bySlug(slug: string): Promise<Entry | null> {
    if (!supabase) return localBySlug(slug) ?? null;
    const { data, error } = await supabase.rpc("dict_by_slug", { p_slug: slug });
    if (error) throw error;
    supabase.rpc("dict_track_view", { p_slug: slug }).then(() => {}); // fire and forget
    return (data as Entry) ?? null;
  },

  /** several entries by slug (related words) */
  async many(slugs: string[]): Promise<Entry[]> {
    const uniq = [...new Set(slugs)];
    if (!supabase) return uniq.map(localBySlug).filter(Boolean) as Entry[];
    const all = await Promise.all(uniq.map((s) => supabase!.rpc("dict_by_slug", { p_slug: s })));
    return all.map((r) => r.data as Entry).filter(Boolean);
  },

  async derived(slug: string): Promise<Entry[]> {
    if (!supabase) return entries.filter((x) => x.root === slug);
    return rpcList("dict_derived", { p_slug: slug });
  },

  async byLetter(letter: string, afterNorm = "", lim = 50): Promise<Entry[]> {
    if (!supabase) {
      const l = normArab(letter) || "ا";
      return entries.filter((e) => normArab(e.arab).startsWith(l)).sort((a, b) => normArab(a.arab).localeCompare(normArab(b.arab)));
    }
    return rpcList("dict_by_letter", { letter, after_norm: afterNorm, lim });
  },

  async recent(lim = 6): Promise<Entry[]> {
    if (!supabase) return [...entries].sort((a, b) => b.added.localeCompare(a.added)).slice(0, lim);
    return rpcList("dict_recent", { lim });
  },

  async popular(lim = 6): Promise<Entry[]> {
    if (!supabase) return popularSlugs.map(localBySlug).filter(Boolean).slice(0, lim) as Entry[];
    return rpcList("dict_popular", { lim });
  },

  async wordOfDay(): Promise<Entry | null> {
    if (!supabase) return localWotd();
    const { data, error } = await supabase.rpc("dict_word_of_day", { p_day: new Date().toISOString().slice(0, 10) });
    if (error) throw error;
    return (data as Entry) ?? null;
  },
};
