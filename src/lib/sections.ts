/** Homepage section keys (table homepage_sections). Order = Rekhta-style default. */
export const SECTION_KEYS = ["poetry", "audio", "videos", "dictionary", "potd", "history", "poets", "collections", "stats", "library", "articles", "explore", "events", "folk", "manifesto", "newsletter", "cta"] as const;
/** shown by default (when there is no database or no saved homepage order) */
export const DEFAULT_SECTIONS: readonly SectionKey[] = ["poetry", "audio", "videos", "dictionary", "potd", "history", "poets", "collections", "library", "articles", "explore", "events", "folk", "newsletter"];
export type SectionKey = (typeof SECTION_KEYS)[number];
