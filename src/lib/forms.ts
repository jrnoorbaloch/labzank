/**
 * Standard forms of Balochi poetry and prose. The admin picks a form from
 * this list, so every poem lands in the same category (no "Ghazal" vs
 * "ghazal" vs "غزل" duplicates). The stored value stays a multilingual label
 * (jsonb), and `formKey()` maps any stored label back to its key.
 */
import type { L } from "./i18n";

export type FormDef = { key: string; l: L };

export const POETRY_FORMS: FormDef[] = [
  { key: "ghazal", l: { bal: "غزل", "bal-latn": "Ghazal", en: "Ghazal", ur: "غزل" } },
  { key: "nazm", l: { bal: "نظم", "bal-latn": "Nazm", en: "Nazm", ur: "نظم" } },
  { key: "sher", l: { bal: "شعر", "bal-latn": "Shé'r", en: "Sher", ur: "شعر" } },
  { key: "rubai", l: { bal: "رباعی", "bal-latn": "Rubá'i", en: "Rubai", ur: "رباعی" } },
  { key: "qita", l: { bal: "قطعہ", "bal-latn": "Qet'a", en: "Qita", ur: "قطعہ" } },
  { key: "azad-nazm", l: { bal: "آزاتیں نظم", "bal-latn": "Ázátén nazm", en: "Free verse", ur: "آزاد نظم" } },
  { key: "sonnet", l: { bal: "سانیٹ", "bal-latn": "Sánét", en: "Sonnet", ur: "سانیٹ" } },
  { key: "haiku", l: { bal: "ھائیکو", "bal-latn": "Háiku", en: "Haiku", ur: "ہائیکو" } },
  { key: "dastunk", l: { bal: "دستونک", "bal-latn": "Dastónk", en: "Dastunk", ur: "دستونک" } },
  { key: "shair", l: { bal: "شئیر", "bal-latn": "Sha'ér", en: "Ballad (sha'er)", ur: "رزمیہ (شئیر)" } },
  { key: "zahirok", l: { bal: "زہیروک", "bal-latn": "Zahirók", en: "Zahirok", ur: "زہیروک" } },
  { key: "leeko", l: { bal: "لیکو", "bal-latn": "Léko", en: "Leeko", ur: "لیکو" } },
  { key: "geet", l: { bal: "سوت", "bal-latn": "Saut", en: "Song (saut)", ur: "گیت" } },
  { key: "marsia", l: { bal: "مرثیہ", "bal-latn": "Marsia", en: "Elegy", ur: "مرثیہ" } },
  { key: "naat", l: { bal: "نعت", "bal-latn": "Na't", en: "Naat", ur: "نعت" } },
];

export const PROSE_KINDS: FormDef[] = [
  { key: "afsana", l: { bal: "افسانہ", "bal-latn": "Afsána", en: "Short story", ur: "افسانہ" } },
  { key: "essay", l: { bal: "نبشتانک", "bal-latn": "Nebeshtánk", en: "Essay", ur: "انشائیہ / مضمون" } },
  { key: "kahani", l: { bal: "کسّہ", "bal-latn": "Kessa", en: "Tale", ur: "کہانی" } },
  { key: "travelogue", l: { bal: "سپرنامہ", "bal-latn": "Saparnáma", en: "Travelogue", ur: "سفرنامہ" } },
  { key: "memoir", l: { bal: "یاتانی", "bal-latn": "Yátáni", en: "Memoir", ur: "یادداشت" } },
  { key: "drama", l: { bal: "ڈرامہ", "bal-latn": "Dráma", en: "Drama", ur: "ڈرامہ" } },
  { key: "other", l: { bal: "دگہ", "bal-latn": "Dega", en: "Other prose", ur: "دیگر نثر" } },
];

const norm = (s?: string) => (s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ'’ʼ\s()-]/g, "");

/** key for any stored form label: the standard key if it matches, else a slug of its English/Balochi text */
export function formKey(l?: Partial<L> | null): string {
  if (!l) return "other";
  for (const f of POETRY_FORMS) {
    if ([l.en, l["bal-latn"], l.bal, l.ur].some((v) => v && [f.l.en, f.l["bal-latn"], f.l.bal, f.l.ur, f.key].some((x) => norm(x) === norm(v)))) return f.key;
  }
  return norm(l.en ?? l["bal-latn"] ?? l.bal) || "other";
}

export function formByKey(key: string): FormDef | undefined {
  return POETRY_FORMS.find((f) => f.key === key);
}

/** position in the standard list (custom forms sort after it) */
export function formOrder(key: string): number {
  const i = POETRY_FORMS.findIndex((f) => f.key === key);
  return i < 0 ? 99 : i;
}

export function proseKind(key: string): FormDef {
  return PROSE_KINDS.find((f) => f.key === key) ?? PROSE_KINDS[PROSE_KINDS.length - 1];
}
