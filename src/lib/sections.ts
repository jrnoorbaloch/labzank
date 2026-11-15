/** Homepage section keys (table homepage_sections). Order = Rekhta-style default. */
export const SECTION_KEYS = ["poetry", "audio", "dictionary", "potd", "poets", "stats", "library", "events", "folk", "manifesto", "newsletter", "cta"] as const;
/** shown by default (when there is no database or no saved homepage order) */
export const DEFAULT_SECTIONS: readonly SectionKey[] = ["poetry", "audio", "dictionary", "potd", "poets", "library", "events", "folk", "newsletter"];
export type SectionKey = (typeof SECTION_KEYS)[number];
