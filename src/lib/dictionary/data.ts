/**
 * Sample dictionary — ORIGINAL entries written for Labzaank, status "draft".
 * No entry here is copied from Labzganj or any other dictionary. Every entry
 * still needs a native linguistic editor before it may be marked verified.
 * Shapes mirror db/dictionary.sql (entries → senses → glosses / examples).
 */

export type GlossLang = "bal" | "en" | "ur" | "brh";
export type Pos = "noun" | "verb" | "adjective" | "adverb" | "pronoun" | "particle" | "numeral";
export type Status = "draft" | "imported" | "pending" | "verified" | "published" | "rejected";
export type RelType = "derived" | "synonym" | "antonym" | "see_also" | "variant";

export type Sense = {
  pos: Pos;
  gloss: Partial<Record<GlossLang, string>>;
  examples?: { arab: string; latn: string; en?: string; ur?: string }[];
};

export type Entry = {
  id: string;
  slug: string;
  arab: string;
  latn: string;
  ipa?: string;
  syllables?: string[];
  root?: string; // slug of root entry
  type: "simple" | "derived" | "compound";
  senses: Sense[];
  relations?: { type: RelType; to: string }[];
  status: Status;
  source: string; // sources.id
  added: string; // ISO date
  audio?: string;
};

export const sources: Record<string, { name: string; licence: string; attribution: string; url?: string }> = {
  "labzank-editorial": {
    name: "Labzaank editorial (sample)",
    licence: "CC BY-SA 4.0 (proposed)",
    attribution: "Labzaank editors — draft, not yet verified",
  },
};

const e = (x: Omit<Entry, "status" | "source" | "type"> & Partial<Pick<Entry, "status" | "source" | "type">>): Entry => ({
  status: "draft",
  source: "labzank-editorial",
  type: "simple",
  ...x,
});

export const entries: Entry[] = [
  e({
    id: "bal-000001", slug: "ap", arab: "آپ", latn: "áp", ipa: "/ɑːp/", syllables: ["áp"], added: "2026-11-01",
    senses: [{
      pos: "noun",
      gloss: { en: "water", ur: "پانی", brh: "dīr" },
      examples: [{ arab: "آپ سارت اِنت", latn: "Áp sárt ent.", en: "The water is cold.", ur: "پانی ٹھنڈا ہے۔" }],
    }],
    relations: [{ type: "see_also", to: "kaur" }],
  }),
  e({ id: "bal-000002", slug: "mah", arab: "ماہ", latn: "máh", ipa: "/mɑːh/", added: "2026-11-01",
    senses: [{ pos: "noun", gloss: { en: "moon", ur: "چاند" } }], relations: [{ type: "see_also", to: "estar" }] }),
  e({ id: "bal-000003", slug: "koh", arab: "کوہ", latn: "kóh", ipa: "/koːh/", added: "2026-11-01",
    senses: [{ pos: "noun", gloss: { en: "mountain", ur: "پہاڑ" } }] }),
  e({ id: "bal-000004", slug: "har", arab: "ہار", latn: "hár", ipa: "/hɑːr/", added: "2026-11-02",
    senses: [{ pos: "noun", gloss: { en: "flood", ur: "سیلاب" } }], relations: [{ type: "see_also", to: "ap" }] }),
  e({ id: "bal-000005", slug: "hon", arab: "ہون", latn: "hón", ipa: "/hoːn/", added: "2026-11-02",
    senses: [{ pos: "noun", gloss: { en: "blood", ur: "خون" } }] }),
  e({ id: "bal-000006", slug: "estar", arab: "استار", latn: "estár", ipa: "/es.tɑːr/", syllables: ["es", "tár"], added: "2026-11-02",
    senses: [{ pos: "noun", gloss: { en: "star", ur: "ستارہ" } }], relations: [{ type: "see_also", to: "mah" }] }),
  e({
    id: "bal-000007", slug: "roch", arab: "روچ", latn: "róch", ipa: "/roːtʃ/", added: "2026-11-03",
    senses: [
      { pos: "noun", gloss: { en: "sun", ur: "سورج" } },
      { pos: "noun", gloss: { en: "day", ur: "دن" } },
    ],
    relations: [{ type: "antonym", to: "shap" }],
  }),
  e({ id: "bal-000008", slug: "shap", arab: "شپ", latn: "shap", ipa: "/ʃap/", added: "2026-11-03",
    senses: [{ pos: "noun", gloss: { en: "night", ur: "رات" } }], relations: [{ type: "antonym", to: "roch" }] }),
  e({
    id: "bal-000009", slug: "gwat", arab: "گوات", latn: "gwát", ipa: "/gwɑːt/", added: "2026-11-03",
    senses: [{ pos: "noun", gloss: { en: "wind", ur: "ہوا" },
      examples: [{ arab: "گوات کوہاں گوں گپ جنت", latn: "Gwát kóhán gón gap jant.", en: "The wind talks with the mountains.", ur: "ہوا پہاڑوں سے باتیں کرتی ہے۔" }] }],
  }),
  e({ id: "bal-000010", slug: "log", arab: "لوگ", latn: "lóg", ipa: "/loːg/", added: "2026-11-04",
    senses: [{ pos: "noun", gloss: { en: "house, home", ur: "گھر" } }] }),
  e({ id: "bal-000011", slug: "ketab", arab: "کتاب", latn: "ketáb", ipa: "/ke.tɑːb/", syllables: ["ke", "táb"], added: "2026-11-04",
    senses: [{ pos: "noun", gloss: { en: "book", ur: "کتاب" } }] }),
  e({
    id: "bal-000012", slug: "zaban", arab: "زبان", latn: "zabán", ipa: "/za.bɑːn/", syllables: ["za", "bán"], added: "2026-11-04",
    senses: [
      { pos: "noun", gloss: { en: "language", ur: "زبان" } },
      { pos: "noun", gloss: { en: "tongue (body part)", ur: "زبان (عضو)" } },
    ],
  }),
  e({ id: "bal-000013", slug: "del", arab: "دل", latn: "del", ipa: "/del/", added: "2026-11-05",
    senses: [{ pos: "noun", gloss: { en: "heart", ur: "دل" } }] }),
  e({ id: "bal-000014", slug: "cherag", arab: "چراگ", latn: "cherág", ipa: "/tʃe.rɑːg/", added: "2026-11-05",
    senses: [{ pos: "noun", gloss: { en: "lamp", ur: "چراغ" } }] }),
  e({ id: "bal-000015", slug: "shaer", arab: "شاعر", latn: "shá'er", ipa: "/ʃɑː.ʔer/", added: "2026-11-05",
    senses: [{ pos: "noun", gloss: { en: "poet", ur: "شاعر" } }], relations: [{ type: "see_also", to: "sher" }] }),
  e({ id: "bal-000016", slug: "sher", arab: "شعر", latn: "shé'r", added: "2026-11-06",
    senses: [{ pos: "noun", gloss: { en: "poem, verse", ur: "شعر" } }], relations: [{ type: "see_also", to: "shaer" }] }),
  e({
    id: "bal-000017", slug: "labz", arab: "لبز", latn: "labz", ipa: "/labz/", added: "2026-11-06",
    senses: [{ pos: "noun", gloss: { en: "word", ur: "لفظ" } }],
    relations: [{ type: "derived", to: "labzank" }, { type: "derived", to: "labzbald" }],
  }),
  e({
    id: "bal-000018", slug: "labzank", arab: "لبزانک", latn: "labzánk", root: "labz", type: "derived", added: "2026-11-07",
    senses: [{ pos: "noun", gloss: { en: "literature", ur: "ادب" } }],
  }),
  e({
    id: "bal-000019", slug: "labzbald", arab: "لبزبلد", latn: "labzbald", root: "labz", type: "compound", added: "2026-11-07",
    senses: [{ pos: "noun", gloss: { en: "dictionary", ur: "لغت" } }],
  }),
  e({ id: "bal-000020", slug: "wanag", arab: "وانگ", latn: "wánag", added: "2026-11-08",
    senses: [{ pos: "verb", gloss: { en: "to read; to study", ur: "پڑھنا" } }] }),
  e({
    id: "bal-000021", slug: "nebeshta", arab: "نبشتہ", latn: "nebeshta", added: "2026-11-08",
    senses: [{ pos: "noun", gloss: { en: "writing, written text", ur: "تحریر" } }],
    relations: [{ type: "derived", to: "nebeshtakar" }],
  }),
  e({ id: "bal-000022", slug: "nebeshtakar", arab: "نبشتہ کار", latn: "nebeshtakár", root: "nebeshta", type: "compound", added: "2026-11-09",
    senses: [{ pos: "noun", gloss: { en: "writer, author", ur: "مصنف، لکھاری" } }] }),
  e({ id: "bal-000023", slug: "sart", arab: "سارت", latn: "sárt", ipa: "/sɑːrt/", added: "2026-11-09",
    senses: [{ pos: "adjective", gloss: { en: "cold", ur: "ٹھنڈا" } }], relations: [{ type: "antonym", to: "garm" }] }),
  e({ id: "bal-000024", slug: "garm", arab: "گرم", latn: "garm", ipa: "/garm/", added: "2026-11-10",
    senses: [{ pos: "adjective", gloss: { en: "hot, warm", ur: "گرم" } }], relations: [{ type: "antonym", to: "sart" }] }),
  e({ id: "bal-000025", slug: "mat", arab: "مات", latn: "mát", ipa: "/mɑːt/", added: "2026-11-10",
    senses: [{ pos: "noun", gloss: { en: "mother", ur: "ماں" } }], relations: [{ type: "see_also", to: "pet" }] }),
  e({ id: "bal-000026", slug: "pet", arab: "پت", latn: "pet", ipa: "/pet/", added: "2026-11-11",
    senses: [{ pos: "noun", gloss: { en: "father", ur: "باپ" } }], relations: [{ type: "see_also", to: "mat" }] }),
  e({ id: "bal-000027", slug: "dost", arab: "دوست", latn: "dóst", ipa: "/doːst/", added: "2026-11-11",
    senses: [{ pos: "noun", gloss: { en: "friend", ur: "دوست" } }] }),
  e({ id: "bal-000028", slug: "kaur", arab: "کئور", latn: "kaur", ipa: "/kawr/", added: "2026-11-12",
    senses: [{ pos: "noun", gloss: { en: "river, seasonal stream", ur: "دریا، ندی" } }], relations: [{ type: "see_also", to: "ap" }] }),
  e({ id: "bal-000029", slug: "dod", arab: "دود", latn: "dód", added: "2026-11-13",
    senses: [{ pos: "noun", gloss: { en: "custom, tradition", ur: "رسم، روایت" } }] }),
  e({ id: "bal-000030", slug: "ganj", arab: "گنج", latn: "ganj", ipa: "/gandʒ/", added: "2026-11-14",
    senses: [{ pos: "noun", gloss: { en: "treasure", ur: "خزانہ" } }] }),
  // Labzaank editorial — common words (numbers, family); draft until reviewed by a native speaker
  e({ id: "bal-000031", slug: "yak", arab: "یک", latn: "yak", added: "2026-11-15",
    senses: [{ pos: "numeral", gloss: { en: "one", ur: "ایک" } }] }),
  e({ id: "bal-000032", slug: "do", arab: "دو", latn: "do", added: "2026-11-15",
    senses: [{ pos: "numeral", gloss: { en: "two", ur: "دو" } }] }),
  e({ id: "bal-000033", slug: "say", arab: "سئے", latn: "say", added: "2026-11-15",
    senses: [{ pos: "numeral", gloss: { en: "three", ur: "تین" } }] }),
  e({ id: "bal-000034", slug: "char", arab: "چار", latn: "chár", added: "2026-11-15",
    senses: [{ pos: "numeral", gloss: { en: "four", ur: "چار" } }] }),
  e({ id: "bal-000035", slug: "panch", arab: "پنچ", latn: "panch", added: "2026-11-15",
    senses: [{ pos: "numeral", gloss: { en: "five", ur: "پانچ" } }] }),
  e({ id: "bal-000036", slug: "shash", arab: "شش", latn: "shash", added: "2026-11-15",
    senses: [{ pos: "numeral", gloss: { en: "six", ur: "چھ" } }] }),
  e({ id: "bal-000037", slug: "hapt", arab: "ھپت", latn: "hapt", added: "2026-11-15",
    senses: [{ pos: "numeral", gloss: { en: "seven", ur: "سات" } }] }),
  e({ id: "bal-000038", slug: "hasht", arab: "ھشت", latn: "hasht", added: "2026-11-15",
    senses: [{ pos: "numeral", gloss: { en: "eight", ur: "آٹھ" } }] }),
  e({ id: "bal-000039", slug: "noh", arab: "نُہ", latn: "noh", added: "2026-11-15",
    senses: [{ pos: "numeral", gloss: { en: "nine", ur: "نو" } }] }),
  e({ id: "bal-000040", slug: "dah", arab: "دہ", latn: "dah", added: "2026-11-15",
    senses: [{ pos: "numeral", gloss: { en: "ten", ur: "دس" } }] }),
  e({ id: "bal-000041", slug: "brat", arab: "برات", latn: "brát", added: "2026-11-15",
    senses: [{ pos: "noun", gloss: { en: "brother", ur: "بھائی" } }] }),
  e({ id: "bal-000042", slug: "gohar", arab: "گہار", latn: "gohár", added: "2026-11-15",
    senses: [{ pos: "noun", gloss: { en: "sister", ur: "بہن" } }] }),
];

/** Arabic-script alphabetical order (Balochi Standard Alphabet + common letters). */
export const ALPHABET = ["ا", "آ", "ب", "پ", "ت", "ٹ", "ج", "چ", "خ", "د", "ڈ", "ر", "ز", "ژ", "س", "ش", "ع", "غ", "ف", "ک", "گ", "ل", "م", "ن", "و", "ہ", "ی"];

/** word_of_day schedule (admin-managed); falls back to a rotating pick. */
export const wordOfDaySchedule: { date: string; slug: string }[] = [
  { date: "2026-11-14", slug: "labzank" },
  { date: "2026-11-15", slug: "gwat" },
  { date: "2026-11-16", slug: "cherag" },
];

/** Popular = top search_log queries over 30 days (seeded). */
export const popularSlugs = ["labzank", "ap", "mah", "dost", "ketab", "zaban"];

export const bySlug = (s: string) => entries.find((x) => x.slug === s);

export function wordOfDay(date = new Date()): Entry {
  const iso = date.toISOString().slice(0, 10);
  const hit = wordOfDaySchedule.find((w) => w.date === iso);
  if (hit && bySlug(hit.slug)) return bySlug(hit.slug)!;
  const day = Math.floor(date.getTime() / 864e5);
  return entries[day % entries.length];
}
