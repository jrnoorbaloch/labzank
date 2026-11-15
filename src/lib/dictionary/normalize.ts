/**
 * Search normalisation for Balochi in both scripts.
 * The same function runs on stored headwords (→ *_norm columns, see db/dictionary.sql)
 * and on user queries, so that spelling variants meet in the middle.
 */

const ARABIC_RANGE = /[؀-ۿݐ-ݿࢠ-ࣿ]/;
const LATIN_RANGE = /[A-Za-zÀ-ɏḀ-ỿ]/;

export type Script = "arab" | "latn" | "mixed" | "none";

/** Which script a string is written in (character-range check). */
export function detectScript(s: string): Script {
  const a = ARABIC_RANGE.test(s);
  const l = LATIN_RANGE.test(s);
  if (a && l) return "mixed";
  if (a) return "arab";
  if (l) return "latn";
  return "none";
}

/** Arabic-script normaliser: unify letter variants, drop diacritics/tatweel/ZWNJ. */
export function normArab(s: string): string {
  return s
    .normalize("NFC")
    .replace(/[ً-ٰٟ۪-ۭ]/g, "") // harakat, shadda, sukun, superscript alef
    .replace(/ـ/g, "") // tatweel
    .replace(/[‌‍]/g, "")
    .replace(/[يىئ]/g, "ی")
    .replace(/[ݔ]/g, "ی") // ݔ (standard é) ↔ ی
    .replace(/ے/g, "ی")
    .replace(/[كڪ]/g, "ک")
    .replace(/[ەةۀه]/g, "ہ")
    .replace(/ھ/g, "ہ")
    .replace(/ڑ/g, "ڈ") // merged in the Balochi Standard Alphabet
    .replace(/ۏ/g, "و")
    .replace(/[أإٱ]/g, "ا")
    .replace(/آ/g, "ا")
    .replace(/ء/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Latin-script normaliser: lower-case, strip accents and apostrophes. */
export function normLatn(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’ʼ`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Normalise according to the script detected. */
export function norm(s: string): string {
  const sc = detectScript(s);
  if (sc === "arab") return normArab(s);
  if (sc === "latn") return normLatn(s);
  return normLatn(normArab(s));
}
