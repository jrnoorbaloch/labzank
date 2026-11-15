import type { L } from "./i18n";

/**
 * Seed / demo content. Every collection here maps 1:1 to a table in the
 * planned schema (authors + author_translations, poems + poem_translations,
 * books + book_translations, hero_slides, homepage_sections …). The homepage
 * reads only from these shapes, so swapping this module for API calls is a
 * data-layer change, not a UI rewrite.
 *
 * Poet names and short bios are real figures (bios kept deliberately brief —
 * an editor should expand and verify). Verses marked `sample: true` are
 * ORIGINAL placeholder lines written for the demo and attributed to demo
 * contributors, not to historical poets.
 */

export type Period = "classical" | "modern";

export type Poet = {
  slug: string;
  name: L;
  period: Period;
  years: string;
  place: L;
  bio: L;
  works: number;
  hue: number; // medallion tint until a portrait is uploaded
  photo?: string; // public URL of the uploaded portrait
  id?: number; // database id (live data only)
};

export const poets: Poet[] = [
  {
    slug: "mast-tawakali",
    name: { bal: "مست توکلی", "bal-latn": "Mast Tawakali", en: "Mast Tawakali", ur: "مست توکلی" },
    period: "classical",
    years: "1825–1892",
    place: { bal: "کوہستانِ مری", "bal-latn": "Kóhestán-e Marri", en: "Marri hills", ur: "مری کوہستان" },
    bio: {
      bal: "بلوچی کلاسیکی شاعری ءِ مزنیں نام، عشق ءُ تصوف ءِ شاعر.",
      "bal-latn": "Balòchi kelásiki shá'eri é mazanén nám, eshk o tasawwuf é shá'er.",
      en: "A towering name of classical Balochi poetry — a poet of love and Sufi devotion.",
      ur: "بلوچی کلاسیکی شاعری کا بڑا نام — عشق اور تصوف کے شاعر۔",
    },
    works: 64,
    hue: 32,
  },
  {
    slug: "jam-durrak",
    name: { bal: "جام دُرّک", "bal-latn": "Jám Durrak", en: "Jam Durrak", ur: "جام درک" },
    period: "classical",
    years: "18th c.",
    place: { bal: "کلات", "bal-latn": "Kalát", en: "Kalat", ur: "قلات" },
    bio: {
      bal: "کلات ءِ دربار ءِ شاعر، بلوچی غزل ءِ پیش رو.",
      "bal-latn": "Kalát é darbár é shá'er, Balòchi ghazal é pésh-rav.",
      en: "Court poet of Kalat, remembered as a pioneer of the Balochi lyric.",
      ur: "دربارِ قلات کے شاعر، بلوچی غزل کے پیش رو۔",
    },
    works: 41,
    hue: 18,
  },
  {
    slug: "gul-khan-naseer",
    name: { bal: "گل خان نصیر", "bal-latn": "Gul Khán Nasír", en: "Gul Khan Naseer", ur: "گل خان نصیر" },
    period: "modern",
    years: "1914–1983",
    place: { bal: "نوشکی", "bal-latn": "Nóshki", en: "Noshki", ur: "نوشکی" },
    bio: {
      bal: "ملک الشعرا — نوکیں بلوچی شاعری ءِ بنیاد کنوک.",
      "bal-latn": "Malek-ul-Sho'ará — nókén Balòchi shá'eri é buniád kanók.",
      en: "Honoured as Malik-ush-Shu'ara, a founding voice of modern Balochi poetry.",
      ur: "ملک الشعرا — جدید بلوچی شاعری کی بنیادی آواز۔",
    },
    works: 112,
    hue: 42,
  },
  {
    slug: "atta-shad",
    name: { bal: "عطا شاد", "bal-latn": "Atá Shád", en: "Atta Shad", ur: "عطا شاد" },
    period: "modern",
    years: "1939–1997",
    place: { bal: "کیچ", "bal-latn": "Kéch", en: "Kech", ur: "کیچ" },
    bio: {
      bal: "نوکیں بلوچی شعر ءِ ماڈرنسٹ شاعر.",
      "bal-latn": "Nókén Balòchi shé'r é modernist shá'er.",
      en: "The modernist who reshaped the form and imagery of Balochi verse.",
      ur: "جدید بلوچی نظم کو نئی ہیئت اور نئے استعارے دینے والے شاعر۔",
    },
    works: 87,
    hue: 8,
  },
  {
    slug: "zahoor-shah-hashmi",
    name: { bal: "سید ظہور شاہ ہاشمی", "bal-latn": "Sayad Zahúr Sháh Háshmi", en: "Syed Zahoor Shah Hashmi", ur: "سید ظہور شاہ ہاشمی" },
    period: "modern",
    years: "1926–1978",
    place: { bal: "گوادر", "bal-latn": "Gwádar", en: "Gwadar", ur: "گوادر" },
    bio: {
      bal: "شاعر ءُ لبزبلد ءِ نبشتہ کار — سید گنج ءِ مستر.",
      "bal-latn": "Shá'er o labzbald é nebeshtakár — Sayad Ganj é mastar.",
      en: "Poet and lexicographer, author of the Balochi dictionary Sayad Ganj.",
      ur: "شاعر اور لغت نویس — بلوچی لغت 'سید گنج' کے مصنف۔",
    },
    works: 59,
    hue: 50,
  },
  {
    slug: "azat-jamaldini",
    name: { bal: "آزات جمالدینی", "bal-latn": "Ázát Jamáldini", en: "Azat Jamaldini", ur: "آزات جمالدینی" },
    period: "modern",
    years: "1912–1981",
    place: { bal: "نوشکی", "bal-latn": "Nóshki", en: "Noshki", ur: "نوشکی" },
    bio: {
      bal: "شاعر ءُ روژنامہ کار، بلوچی نبشتہ کاری ءِ زندگ کنوک.",
      "bal-latn": "Shá'er o rózhnámakár, Balòchi nebeshtakári é zendag kanók.",
      en: "Poet and journalist who championed Balochi as a written, published language.",
      ur: "شاعر اور صحافی، بلوچی کو تحریری زبان بنانے کے علمبردار۔",
    },
    works: 48,
    hue: 26,
  },
];

export type Poem = {
  id: string;
  form: L;
  /** original Balochi, Arabic script — lines separated by \n. Never overwritten. */
  original: string;
  roman: string;
  translation: { en: string; ur: string };
  contributor: L;
  /** placeholder verse written for the demo, not by a historical poet */
  sample: boolean;
  authorSlug?: string;
};

export const poems: Poem[] = [
  {
    id: "p1",
    form: { bal: "شعر", "bal-latn": "Shé'r", en: "Sher", ur: "شعر" },
    original: "ماہ ءِ رُژن ءَ کوہ ءِ سرا\nمنی دل ءِ چراگ روک اِنت",
    roman: "Máh é ruzhná kóh é sará\nMani del é cherág rók ent",
    translation: {
      en: "In the moonlight, on the mountain's crown,\nthe lamp of my heart is burning.",
      ur: "چاند کی روشنی میں، پہاڑ کی چوٹی پر\nمیرے دل کا چراغ روشن ہے",
    },
    contributor: { bal: "شاہمیر (ڈیمو)", "bal-latn": "Sháhmir (demo)", en: "Shahmir (demo)", ur: "شاہمیر (ڈیمو)" },
    sample: true,
  },
  {
    id: "p2",
    form: { bal: "نظم", "bal-latn": "Nazm", en: "Nazm", ur: "نظم" },
    original: "گوات کوہاں گوں گپ جنت\nمئے زبان ءِ توار نہ مریت",
    roman: "Gwát kóhán gón gap jant\nMai zabán é tawár na mirit",
    translation: {
      en: "The wind keeps talking with the mountains —\nthe voice of our language does not die.",
      ur: "ہوا پہاڑوں سے باتیں کرتی ہے\nہماری زبان کی آواز نہیں مرتی",
    },
    contributor: { bal: "ماہناز (ڈیمو)", "bal-latn": "Máhnáz (demo)", en: "Mahnaz (demo)", ur: "ماہناز (ڈیمو)" },
    sample: true,
  },
  {
    id: "p3",
    form: { bal: "غزل", "bal-latn": "Ghazal", en: "Ghazal", ur: "غزل" },
    original: "کتاب ءِ ہر تاک ءَ\nیک استار ءِ رُژن اِنت",
    roman: "Ketáb é har táká\nYak estár é ruzhn ent",
    translation: {
      en: "On every page of the book\nlies the light of a star.",
      ur: "کتاب کے ہر ورق پر\nایک ستارے کی روشنی ہے",
    },
    contributor: { bal: "بالاچ (ڈیمو)", "bal-latn": "Bálách (demo)", en: "Balach (demo)", ur: "بالاچ (ڈیمو)" },
    sample: true,
  },
];

export type BookCat = "poetry" | "dictionary" | "history" | "fiction" | "folk";

export type Book = {
  id: string;
  title: L;
  author: L;
  cat: BookCat;
  pages: number;
  year?: string;
  palette: [string, string];
  demo?: boolean;
  cover?: string; // public URL of the uploaded cover
  pdf?: string; // storage path in the private "books" bucket
  canDownload?: boolean;
  authorSlug?: string;
  isbn?: string;
  copyright?: string;
};

export const bookCats: { id: BookCat | "all"; label: L }[] = [
  { id: "all", label: { bal: "سجّہ", "bal-latn": "Sajjah", en: "All", ur: "سب" } },
  { id: "poetry", label: { bal: "شاعری", "bal-latn": "Shá'eri", en: "Poetry", ur: "شاعری" } },
  { id: "dictionary", label: { bal: "لبزبلد", "bal-latn": "Labzbald", en: "Dictionaries", ur: "لغات" } },
  { id: "history", label: { bal: "تاریخ", "bal-latn": "Tárikh", en: "History", ur: "تاریخ" } },
  { id: "folk", label: { bal: "دودی", "bal-latn": "Dódi", en: "Folk", ur: "لوک ادب" } },
  { id: "fiction", label: { bal: "آزمانک", "bal-latn": "Ázmánk", en: "Fiction", ur: "افسانہ" } },
];

export const books: Book[] = [
  {
    id: "sayad-ganj",
    authorSlug: "zahoor-shah-hashmi",
    title: { bal: "سید گنج", "bal-latn": "Sayad Ganj", en: "Sayad Ganj", ur: "سید گنج" },
    author: { bal: "سید ظہور شاہ ہاشمی", "bal-latn": "Sayad Zahúr Sháh Háshmi", en: "Syed Zahoor Shah Hashmi", ur: "سید ظہور شاہ ہاشمی" },
    cat: "dictionary",
    pages: 840,
    palette: ["#5b2a14", "#c98a3b"],
  },
  {
    id: "gulbang",
    authorSlug: "gul-khan-naseer",
    title: { bal: "گلبانگ", "bal-latn": "Gulbáng", en: "Gulbang", ur: "گلبانگ" },
    author: { bal: "گل خان نصیر", "bal-latn": "Gul Khán Nasír", en: "Gul Khan Naseer", ur: "گل خان نصیر" },
    cat: "poetry",
    pages: 212,
    palette: ["#123a3a", "#d9a441"],
  },
  {
    id: "roch-gir",
    authorSlug: "atta-shad",
    title: { bal: "روچ گِر", "bal-latn": "Róch Gir", en: "Roch Gir", ur: "روچ گر" },
    author: { bal: "عطا شاد", "bal-latn": "Atá Shád", en: "Atta Shad", ur: "عطا شاد" },
    cat: "poetry",
    pages: 176,
    palette: ["#3a1020", "#e0b25c"],
  },
  {
    id: "sheh-mureed",
    // no approved Urdu translation of the title yet → demonstrates the fallback badge
    title: { bal: "شَہ مُرید ءُ ہانی", "bal-latn": "Shah Murid o Háni", en: "Sheh Mureed and Hani" },
    author: { bal: "دودی داستان", "bal-latn": "Dódi dástán", en: "Folk epic", ur: "لوک داستان" },
    cat: "folk",
    pages: 96,
    palette: ["#2a1f45", "#c9a050"],
    demo: true,
  },
  {
    id: "baloch-history",
    title: { bal: "بلوچ ءِ تاریخ ءِ تاک", "bal-latn": "Baloch é tárikh é ták", en: "Leaves of Baloch History", ur: "بلوچ تاریخ کے اوراق" },
    author: { bal: "ڈیمو مستر", "bal-latn": "Demo author", en: "Demo author", ur: "ڈیمو مصنف" },
    cat: "history",
    pages: 384,
    palette: ["#1d2b1a", "#b98b4a"],
    demo: true,
  },
  {
    id: "dasht-stories",
    title: { bal: "دشت ءِ آزمانک", "bal-latn": "Dasht é ázmánk", en: "Stories of the Dasht", ur: "دشت کے افسانے" },
    author: { bal: "ڈیمو مستر", "bal-latn": "Demo author", en: "Demo author", ur: "ڈیمو مصنف" },
    cat: "fiction",
    pages: 148,
    palette: ["#40210d", "#e8c477"],
    demo: true,
  },
  {
    id: "zahirok",
    title: { bal: "زہیروک", "bal-latn": "Zahirók", en: "Zahirok: Songs of Longing", ur: "زہیروک" },
    author: { bal: "گچین ءُ ترتیب (ڈیمو)", "bal-latn": "Selected (demo)", en: "Anthology (demo)", ur: "انتخاب (ڈیمو)" },
    cat: "folk",
    pages: 120,
    palette: ["#0f2a33", "#d6a24e"],
    demo: true,
  },
];

export const folk: { title: L; body: L; glyph: string }[] = [
  {
    title: { bal: "شیر", "bal-latn": "Shér", en: "Shér — the epic ballad", ur: "شیر — رزمیہ داستان" },
    body: {
      bal: "رند ءُ لاشار ءِ جنگ ءُ میر چاکر ءِ داستان.",
      "bal-latn": "Rend o Láshár é jang o Mir Chákar é dástán.",
      en: "Heroic narrative verse — the Rind–Lashari wars and the saga of Mir Chakar.",
      ur: "رزمیہ منظوم داستانیں — رند و لاشار کی جنگیں اور میر چاکر کی کہانی۔",
    },
    glyph: "◆",
  },
  {
    title: { bal: "زہیروک", "bal-latn": "Zahirók", en: "Zahirok — the song of longing", ur: "زہیروک — ہجر کا گیت" },
    body: {
      bal: "دوری ءُ یات ءِ گیت، کہ زالبولانی توار ءَ زندگ اِنت.",
      "bal-latn": "Dóri o yát é git, ke zálbólání tawárá zendag ent.",
      en: "Melodies of separation and remembrance, kept alive largely by women's voices.",
      ur: "جدائی اور یاد کے گیت، جو زیادہ تر خواتین کی آواز میں زندہ ہیں۔",
    },
    glyph: "✦",
  },
  {
    title: { bal: "لیکو", "bal-latn": "Likó", en: "Liko — the short verse", ur: "لیکو — مختصر گیت" },
    body: {
      bal: "کسانیں دودی شعر، کہ راہ ءُ کاروان ءَ گوشگ بنت.",
      "bal-latn": "Kasánén dódi shé'r, ke ráh o kárwáná gushag bant.",
      en: "Brief folk couplets sung on the road and with the caravan.",
      ur: "مختصر لوک اشعار جو سفر اور کارواں میں گائے جاتے ہیں۔",
    },
    glyph: "❖",
  },
  {
    title: { bal: "شَہ مُرید ءُ ہانی", "bal-latn": "Shah Murid o Háni", en: "Sheh Mureed & Hani", ur: "شہ مرید و ہانی" },
    body: {
      bal: "بلوچی دودی عشق ءِ نامداریں داستان.",
      "bal-latn": "Balòchi dódi eshk é námdárén dástán.",
      en: "The best-known of the Balochi folk romances.",
      ur: "بلوچی لوک عشقیہ داستانوں میں سب سے مشہور۔",
    },
    glyph: "✧",
  },
];

export const audio: { title: L; by: L; dur: string; bars: number[]; src?: string; authorSlug?: string }[] = [
  {
    title: { bal: "ماہ ءِ رُژن", "bal-latn": "Máh é ruzhn", en: "Moonlight (recitation)", ur: "چاندنی (قرأت)" },
    by: { bal: "شاہمیر (ڈیمو)", "bal-latn": "Sháhmir (demo)", en: "Shahmir (demo)", ur: "شاہمیر (ڈیمو)" },
    dur: "3:42",
    bars: [],
  },
  {
    title: { bal: "زہیروک ءِ توار", "bal-latn": "Zahirók é tawár", en: "A Zahirok melody", ur: "زہیروک کی دھن" },
    by: { bal: "دودی ریکارڈ (ڈیمو)", "bal-latn": "Folk archive (demo)", en: "Folk archive (demo)", ur: "لوک آرکائیو (ڈیمو)" },
    dur: "5:10",
    bars: [],
  },
  {
    title: { bal: "شاعر ءِ گوں گپ", "bal-latn": "Shá'er é gón gap", en: "In conversation with a poet", ur: "شاعر سے گفتگو" },
    by: { bal: "لبزانک دیوان (ڈیمو)", "bal-latn": "Labzánk Diwán (demo)", en: "Labzank Diwan (demo)", ur: "لبزانک دیوان (ڈیمو)" },
    dur: "18:05",
    bars: [],
  },
];

export const events: { day: string; month: L; title: L; place: L }[] = [
  {
    day: "02",
    month: { bal: "مارچ", "bal-latn": "Márch", en: "March", ur: "مارچ" },
    title: { bal: "بلوچ دود ءِ روچ", "bal-latn": "Baloch Dód é Róch", en: "Baloch Culture Day", ur: "بلوچ ثقافتی دن" },
    place: { bal: "سجّہیں شہر", "bal-latn": "Sajjahén shahr", en: "Celebrated everywhere", ur: "ہر شہر میں" },
  },
  {
    day: "21",
    month: { bal: "مارچ", "bal-latn": "Márch", en: "March", ur: "مارچ" },
    title: { bal: "شعر ءِ شپ — مشاعرہ (ڈیمو)", "bal-latn": "Shé'r é shap — Mushá'era (demo)", en: "A Night of Verse — mushaira (demo)", ur: "شبِ شعر — مشاعرہ (ڈیمو)" },
    place: { bal: "کویٹہ", "bal-latn": "Kwatta", en: "Quetta", ur: "کوئٹہ" },
  },
  {
    day: "10",
    month: { bal: "اپریل", "bal-latn": "Apríl", en: "April", ur: "اپریل" },
    title: { bal: "کتاب ءِ پچ کنگ (ڈیمو)", "bal-latn": "Ketáb é pach kanag (demo)", en: "Book launch (demo)", ur: "کتاب کی رونمائی (ڈیمو)" },
    place: { bal: "کراچی", "bal-latn": "Karáchi", en: "Karachi", ur: "کراچی" },
  },
];

export type HeroQuote = { text: string; roman: string; credit: L };

/** hero_slides row — heading/description/quote/CTA are all CMS-managed. */
export const heroSlides: {
  heading: L;
  description: L;
  quote: HeroQuote;
  featuredBookId: string;
}[] = [
  {
    heading: {
      bal: "بلوچی لبزانک ءِ گنج، یک جاہ ءَ",
      "bal-latn": "Balòchi labzánk é ganj, yak jáhá",
      en: "The treasury of Balochi literature, in one place",
      ur: "بلوچی ادب کا خزانہ، ایک جگہ",
    },
    description: {
      bal: "شاعر، شعر، کتاب، آزمانک ءُ توار — بلوچی، انگریزی ءُ اردو ءَ.",
      "bal-latn": "Shá'er, shé'r, ketáb, ázmánk o tawár — Balòchi, Angrézi o Urdu á.",
      en: "Poets, poems, books, stories and recordings — in Balochi, English and Urdu.",
      ur: "شعرا، اشعار، کتب، افسانے اور آوازیں — بلوچی، انگریزی اور اردو میں۔",
    },
    quote: {
      text: "گوات کوہاں گوں گپ جنت",
      roman: "Gwát kóhán gón gap jant",
      credit: { bal: "نمونہ", "bal-latn": "Namúna", en: "Sample verse", ur: "نمونہ" },
    },
    featuredBookId: "sayad-ganj",
  },
];

export const stats = { poets: 1240, poems: 38600, books: 4100, audio: 920 };
