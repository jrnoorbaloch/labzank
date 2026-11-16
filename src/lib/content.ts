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
  {
    slug: "mulla-fazul",
    name: { bal: "مُلا فاضل", "bal-latn": "Mullá Fázel", en: "Mulla Fazul", ur: "ملا فاضل" },
    period: "classical",
    years: "c. 1774–1854",
    place: { bal: "منڈ", "bal-latn": "Mand", en: "Mand", ur: "منڈ" },
    bio: {
      bal: "کلاسیکی دور ءِ مزنیں شاعر، کہ بلوچی شعر ءَ نوکیں موضوع ءُ لبز دات اَنت.",
      "bal-latn": "Kelásiki daur é mazanén shá'er, ke Balòchi shé'rá nókén mauzu' o labz dátant.",
      en: "A leading poet of the classical age from Mand, who brought new themes and diction to Balochi verse and wrote with a command of Arabic and Persian.",
      ur: "کلاسیکی دور کے بڑے شاعر، جنہوں نے بلوچی شاعری کو نئے موضوعات اور نیا لہجہ دیا؛ عربی اور فارسی پر بھی عبور رکھتے تھے۔",
    },
    works: 0,
    hue: 36,
  },
  {
    slug: "mubarak-qazi",
    name: { bal: "مبارک کازی", "bal-latn": "Mobárak Kázi", en: "Mubarak Qazi", ur: "مبارک قاضی" },
    period: "modern",
    years: "1956–2023",
    place: { bal: "پسنی", "bal-latn": "Pasni", en: "Pasni", ur: "پسنی" },
    bio: {
      bal: "پسنی ءِ شاعر، کہ آئی ءِ شعر ءَ مہر ءُ مزاہمت یکجاہ اَنت؛ مردمانی شاعر زانگ بیت.",
      "bal-latn": "Pasni é shá'er, ke ái é shé'rá mehr o mozáhamat yakjáh ant; mardománi shá'er zánag bit.",
      en: "Poet of Pasni whose modern, revolutionary verse joined love and resistance — remembered as a people's poet. His first collection appeared in 1990.",
      ur: "پسنی کے شاعر جن کی جدید اور انقلابی شاعری میں محبت اور مزاحمت ایک ساتھ ہیں — عوام کے شاعر کہلاتے ہیں۔ پہلا مجموعہ 1990 میں شائع ہوا۔",
    },
    works: 0,
    hue: 200,
  },
  {
    slug: "munir-momin",
    name: { bal: "منیر مومن", "bal-latn": "Monir Momen", en: "Munir Momin", ur: "منیر مومن" },
    period: "modern",
    years: "1966–",
    place: { bal: "پیدارک، کیچ", "bal-latn": "Pidárak, Kéch", en: "Pidrak, Kech", ur: "پیدارک، کیچ" },
    bio: {
      bal: "مروچی ءِ شاعر، کہ آئی ءِ شعر ءِ نقش ءُ زبان ءِ نازکی نامدار اِنت.",
      "bal-latn": "Marochí é shá'er, ke ái é shé'r é naqsh o zabán é názoki námdár ent.",
      en: "Contemporary poet known for finely crafted images and linguistic finesse; author of several collections, including Yak Bechelley Aazman (2014).",
      ur: "عصرِ حاضر کے شاعر، جن کی شاعری کی تصویریں اور زبان کی نزاکت مشہور ہے؛ کئی مجموعوں کے مصنف، جن میں ’یک بچیلّے آزمان‘ (2014) شامل ہے۔",
    },
    works: 0,
    hue: 160,
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
    by: { bal: "لبزانک دیوان (ڈیمو)", "bal-latn": "Labzaank Diwán (demo)", en: "Labzaank Diwan (demo)", ur: "لبزانک دیوان (ڈیمو)" },
    dur: "18:05",
    bars: [],
  },
  {
    title: {"bal": "مست ءِ کلام", "bal-latn": "Mast é kalám", "en": "Verses of Mast Tawakali (reading)", "ur": "مست توکلی کا کلام (قرأت)"},
    by: {"bal": "لبزانک (ڈیمو)", "bal-latn": "Labzaank (demo)", "en": "Labzaank (demo)", "ur": "لبزانک (ڈیمو)"},
    dur: "6:20",
    bars: [],
  },
  {
    title: {"bal": "لیکو — ساربانی سوت", "bal-latn": "Léko — sárbáni saut", "en": "Leeko — a camel-driver's song", "ur": "لیکو — ساربان کا گیت"},
    by: {"bal": "دودی ریکارڈ (ڈیمو)", "bal-latn": "Folk archive (demo)", "en": "Folk archive (demo)", "ur": "لوک آرکائیو (ڈیمو)"},
    dur: "4:05",
    bars: [],
  },
  {
    title: {"bal": "شپ ءِ غزل", "bal-latn": "Shap é ghazal", "en": "A ghazal for the night", "ur": "رات کی غزل"},
    by: {"bal": "شعر خوانی (ڈیمو)", "bal-latn": "Recitation (demo)", "en": "Recitation (demo)", "ur": "شعر خوانی (ڈیمو)"},
    dur: "7:48",
    bars: [],
  },
  {
    title: {"bal": "سوت ءُ سروز", "bal-latn": "Saut o sorúz", "en": "Song and the sorud", "ur": "گیت اور سروز"},
    by: {"bal": "دودی ریکارڈ (ڈیمو)", "bal-latn": "Folk archive (demo)", "en": "Folk archive (demo)", "ur": "لوک آرکائیو (ڈیمو)"},
    dur: "9:12",
    bars: [],
  },
  {
    title: {"bal": "بلوچی زبان ءِ تاریخ", "bal-latn": "Balòchi zabán é tárikh", "en": "A short history of Balochi (talk)", "ur": "بلوچی زبان کی مختصر تاریخ (گفتگو)"},
    by: {"bal": "لبزانک دیوان (ڈیمو)", "bal-latn": "Labzaank Diwán (demo)", "en": "Labzaank Diwan (demo)", "ur": "لبزانک دیوان (ڈیمو)"},
    dur: "22:30",
    bars: [],
  },
  {
    title: {"bal": "زہیروک — ماتی یات", "bal-latn": "Zahirók — máti yát", "en": "Zahirok — remembering mother", "ur": "زہیروک — ماں کی یاد"},
    by: {"bal": "دودی ریکارڈ (ڈیمو)", "bal-latn": "Folk archive (demo)", "en": "Folk archive (demo)", "ur": "لوک آرکائیو (ڈیمو)"},
    dur: "5:36",
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

/** hero_slides row — heading, description, image and button are CMS-managed. */
export type HeroSlide = {
  heading: L;
  description: L;
  /** image URL; without one the built-in artwork for that position is used */
  image?: string;
  imageMobile?: string;
  cta?: { label: L; href: string };
};

/** Built-in carousel artwork (public/hero), used when a slide has no uploaded image. */
export const heroArt = ["hero/1.jpg", "hero/2.jpg", "hero/3.jpg", "hero/4.jpg"];

export const heroSlides: HeroSlide[] = [
  {
    heading: { bal: "بلوچی شاعری ءِ گنج", "bal-latn": "Balòchi shá'eri é ganj", en: "The treasury of Balochi poetry", ur: "بلوچی شاعری کا خزانہ" },
    description: {
      bal: "کوہنیں ءُ نوکیں شعر، اصل بلوچی ءَ — رومن ءُ رجانک ءِ همراہ.",
      "bal-latn": "Kóhnén o nókén shé'r, asl Balòchi á — Roman o rajánk é hamráh.",
      en: "Classical and modern verse in the original Balochi, with Roman script and translations.",
      ur: "کلاسیکی اور جدید شاعری اصل بلوچی میں — رومن اور ترجمے کے ساتھ۔",
    },
    cta: { label: { bal: "شعر بوانیں", "bal-latn": "Shé'r bewánén", en: "Read poetry", ur: "شاعری پڑھیں" }, href: "@poetry" },
  },
  {
    heading: { bal: "بلوچی لبزبلد", "bal-latn": "Balòchi labzbald", en: "The Balochi dictionary", ur: "بلوچی لغت" },
    description: {
      bal: "لبز ءَ عربی یا لاتینی سیاہگ ءَ شوہاز کن — انگریزی، اردو ءُ براہوئی معنا.",
      "bal-latn": "Labzá Arabi yá Látini siáhagá shóház kan — Angrézi, Urdu o Bráhui ma'ná.",
      en: "Search in Arabic or Latin script, with English, Urdu and Brahui meanings.",
      ur: "عربی یا لاطینی رسم الخط میں تلاش کریں — انگریزی، اردو اور براہوی معنی کے ساتھ۔",
    },
    cta: { label: { bal: "لبزبلد ءَ پچ کن", "bal-latn": "Labzbaldá pach kan", en: "Open dictionary", ur: "لغت کھولیں" }, href: "@dictionary" },
  },
  {
    heading: { bal: "بلوچی کتابانی کتابجاہ", "bal-latn": "Balòchi ketábáni ketábjáh", en: "A library of Balochi books", ur: "بلوچی کتابوں کا کتب خانہ" },
    description: {
      bal: "شاعری، تاریخ، زبان ءُ دود — اجازت ءِ همراہ آنلائن وانگ.",
      "bal-latn": "Shá'eri, tárikh, zabán o dód — ejázat é hamráh online wánag.",
      en: "Poetry, history, language and culture — read online where the rights allow.",
      ur: "شاعری، تاریخ، زبان اور ثقافت — جہاں اجازت ہو وہاں آن لائن پڑھیں۔",
    },
    cta: { label: { bal: "کتابجاہ ءَ بچار", "bal-latn": "Ketábjáhá bechár", en: "Browse the library", ur: "کتب خانہ دیکھیں" }, href: "@library" },
  },
  {
    heading: { bal: "دودی لبزانک ءُ میراث", "bal-latn": "Dódi labzánk o mirás", en: "Folk literature & heritage", ur: "لوک ادب اور ورثہ" },
    description: {
      bal: "شیر، داستان، گیدی ءُ لیکو — مردمانی زبان ءِ گنج.",
      "bal-latn": "Shér, dástán, gidi o léko — mardománi zabán é ganj.",
      en: "Ballads, epics and songs carried by the people of Balochistan.",
      ur: "بلوچستان کے لوگوں کی زبان پر زندہ گیت، داستانیں اور نغمے۔",
    },
    cta: { label: { bal: "گیشتر بزان", "bal-latn": "Géshtar bezán", en: "Explore heritage", ur: "مزید جانیں" }, href: "#folk" },
  },
];

export const stats = { poets: 1240, poems: 38600, books: 4100, audio: 920 };

/** articles row (list shape; the body is loaded on the article page) */
export type Article = {
  slug: string;
  title: L;
  excerpt: L;
  category: string;
  tags: string[];
  cover?: string;
  authorSlug?: string;
  authorText?: L;
  date?: string; // ISO
  body?: Partial<L>; // only present for local sample content
};

/** videos row */
export type Video = {
  id: string;
  title: L;
  description: L;
  url: string;
  thumb?: string;
  duration?: string;
  authorSlug?: string;
};

export const articleCats: { id: string; label: L }[] = [
  { id: "news", label: { bal: "نوکیں ہال", "bal-latn": "Nókén hál", en: "News", ur: "خبریں" } },
  { id: "essay", label: { bal: "نبشتانک", "bal-latn": "Nebeshtánk", en: "Essays", ur: "مضامین" } },
  { id: "criticism", label: { bal: "تنقید", "bal-latn": "Tanqíd", en: "Criticism", ur: "تنقید" } },
  { id: "history", label: { bal: "تاریخ", "bal-latn": "Tárikh", en: "History", ur: "تاریخ" } },
  { id: "interview", label: { bal: "گپ ءُ تران", "bal-latn": "Gap o trán", en: "Interviews", ur: "انٹرویو" } },
  { id: "language", label: { bal: "زبان", "bal-latn": "Zabán", en: "Language", ur: "زبان" } },
];

/** sample shown only without a database */
export const articles: Article[] = [
  {
    slug: "welcome-to-labzaank",
    title: { bal: "لبزانک ءَ وش آتکے", "bal-latn": "Labzaanká wash átké", en: "Welcome to Labzaank", ur: "لبزانک میں خوش آمدید" },
    excerpt: {
      bal: "بلوچی لبزانک ءِ نوکیں ڈیجیٹل لوگ — شعر، کتاب، توار ءُ لبزبلد.",
      en: "A new digital home for Balochi literature — poetry, books, recordings and a dictionary.",
      ur: "بلوچی ادب کا نیا ڈیجیٹل گھر — شاعری، کتابیں، آوازیں اور لغت۔",
    },
    category: "news",
    tags: ["labzaank"],
    date: "2026-11-15T00:00:00Z",
    body: {
      en: "Labzaank brings Balochi literature together in one place: classical and modern poetry in the original script, profiles of poets, a growing library, folk literature, recordings and a Balochi dictionary.\n\n## Read it your way\n\nEvery page works in Balochi (Arabic script), English and Urdu.",
      ur: "لبزانک بلوچی ادب کو ایک جگہ جمع کرتا ہے: اصل رسم الخط میں شاعری، شعرا کے تعارف، کتب خانہ، لوک ادب، آوازیں اور بلوچی لغت۔",
    },
  },
  {
    slug: "mubarak-qazi-a-peoples-poet",
    title: {"bal": "مبارک کازی — مردمانی شاعر", "bal-latn": "Mobárak Kázi — mardománi shá'er", "en": "Mubarak Qazi: a people's poet", "ur": "مبارک قاضی — عوام کے شاعر"},
    excerpt: {"bal": "پسنی ءِ شاعر کہ مہر ءُ مزاہمت ءَ یک توار ءَ گوشت.", "en": "The poet from Pasni who spoke of love and resistance in one voice, and whose verse was sung across Balochistan.", "ur": "پسنی کے شاعر جنہوں نے محبت اور مزاحمت کو ایک آواز میں کہا۔"},
    category: "essay",
    tags: ["mubarak-qazi", "modern-poetry"],
    authorText: {"bal": "لبزانک ءِ ایڈیٹر", "bal-latn": "Labzaank editors", "en": "Labzaank editors", "ur": "لبزانک مدیران"},
    date: "2026-11-14T00:00:00Z",
    body: {"en": "Mubarak Qazi was born in Pasni, on the Makran coast, in the mid-1950s and died in Turbat in September 2023. After school in Pasni he studied in Karachi, then returned home, where he worked at the Pasni fish harbour and helped found a local literary society.\n\n## A poet everyone could read\n\nQazi wrote in a modern style, but his language stayed close to everyday speech. That is one reason he is so often called a *people's poet*: readers of every background could follow him, and many of his poems became songs performed by well-known Balochi singers on radio and television.\n\n## Love and resistance\n\nCritics and obituary writers return to the same pairing: his poems hold tenderness and political protest side by side. He published more than ten collections, the first in 1990 and the last in 2022, and English translations of his work have appeared in recent years.\n\n## Further reading\n\nObituaries in *Dawn* and *The Friday Times* (September 2023) and the Wikipedia article on Mubarak Qazi give more detail. Labzaank does not publish the texts of his poems, which remain under copyright.", "ur": "مبارک قاضی مکران کے ساحلی شہر پسنی میں پیدا ہوئے اور ستمبر 2023 میں تربت میں انتقال کر گئے۔ ان کی جدید مگر عام فہم شاعری میں محبت اور مزاحمت ساتھ ساتھ چلتی ہیں، اسی لیے انہیں عوام کا شاعر کہا جاتا ہے۔ ان کے دس سے زیادہ مجموعے شائع ہوئے، اور ان کا بہت سا کلام معروف بلوچی گلوکاروں نے گایا۔"},
  },
  {
    slug: "forms-of-balochi-poetry",
    title: {"bal": "بلوچی شعر ءِ دروشم", "bal-latn": "Balòchi shé'r é droshm", "en": "The forms of Balochi poetry: a short guide", "ur": "بلوچی شاعری کی اصناف: مختصر رہنما"},
    excerpt: {"bal": "شیئر، زہیروک، لیکو، غزل ءُ نوکیں آزاتیں شعر.", "en": "From heroic ballads and zahirok to the ghazal and free verse — how Balochi poetry has changed shape over five centuries.", "ur": "رزمیہ داستانوں اور زہیروک سے غزل اور آزاد نظم تک — بلوچی شاعری کی صورتیں۔"},
    category: "language",
    tags: ["forms", "classical", "folk"],
    authorText: {"bal": "لبزانک ءِ ایڈیٹر", "bal-latn": "Labzaank editors", "en": "Labzaank editors", "ur": "لبزانک مدیران"},
    date: "2026-11-13T00:00:00Z",
    body: {"en": "Balochi poetry was an oral art long before it was a written one. By the fifteenth century it was already well established, carried by poets and minstrels who performed from memory.\n\n## Classical ballads\n\nThe oldest surviving poems are long narrative ballads — heroic, historical and romantic. They tell of battles, of tribal heroes and of famous lovers, and were sung rather than read.\n\n## Folk forms\n\n- **Zahirok** — a melancholy song of longing, often for an absent loved one.\n- **Leeko** — short sung couplets, traditionally linked with travellers and camel drivers.\n- **Lullabies and wedding songs** — a large body of verse kept alive mostly by women.\n\n## Lyric and mystic verse\n\nFrom the eighteenth century onward, lyric poetry grows alongside the ballads. Poets such as Mulla Fazul and Mast Tawakali in the nineteenth century brought new themes, mystic ideas and a richer vocabulary.\n\n## Modern poetry\n\nIn the twentieth century poets like Gul Khan Naseer, Syed Zahoor Shah Hashmi and Atta Shad adopted the ghazal and the nazm, and later free verse, sonnets and haiku. Today, contemporary poets continue to experiment with form while drawing on this long oral tradition.\n\n*Source note: this overview summarises the standard histories of Balochi literature; see the Uppsala University Balochi Language Project for a scholarly introduction.*", "ur": "بلوچی شاعری تحریر سے بہت پہلے زبانی فن تھی۔ قدیم ترین نظمیں رزمیہ، تاریخی اور رومانوی داستانیں ہیں۔ لوک اصناف میں زہیروک اور لیکو مشہور ہیں۔ انیسویں صدی میں ملا فاضل اور مست توکلی نے نئے موضوعات دیے، اور بیسویں صدی میں گل خان نصیر، سید ظہور شاہ ہاشمی اور عطا شاد نے غزل، نظم اور آزاد نظم کو فروغ دیا۔"},
  },
];

export const videos: Video[] = [];

/* ─────────────────────────── prose (afsana, essay, …) ─────────────────────────── */

export type Prose = {
  slug: string;
  kind: string; // forms.ts PROSE_KINDS key
  title: L;
  excerpt: L;
  cover?: string;
  authorSlug?: string;
  authorText?: L;
  date?: string;
  /** Markdown per language; bal = the Balochi original. Fetched on the detail page when live. */
  body?: Partial<L>;
  sample?: boolean;
};

export const prose: Prose[] = [
  {
    slug: "the-lamp-at-the-well",
    kind: "afsana",
    title: { bal: "چاتءِ سرءِ چراگ", "bal-latn": "Cháté sará cherág", en: "The lamp at the well", ur: "کنویں پر چراغ" },
    excerpt: { bal: "شپ ءِ تہاری ءَ یک جنکے چراگے زُرت ءُ چات ءِ نیمگ ءَ شت.", en: "On a dark night a girl carries a lamp to the village well — a short sample story.", ur: "اندھیری رات میں ایک لڑکی چراغ لے کر کنویں کی طرف جاتی ہے — ایک مختصر نمونہ کہانی۔" },
    authorText: { bal: "لبزانک (نمونہ)", "bal-latn": "Labzaank (sample)", en: "Labzaank (sample)", ur: "لبزانک (نمونہ)" },
    date: "2026-11-16T00:00:00Z",
    sample: true,
    body: {
      en: "*Sample text written for the demo — replace it from the admin panel.*\n\nThe wind had blown out every lamp in the village except one. Gul Bibi held it close to her chest and walked to the well, counting the stars she knew by name.\n\nAt the well she found her grandmother, who had been waiting there since evening. \"I knew someone would bring the light,\" the old woman said, and they sat together until the moon rose over the hills.",
      ur: "*یہ نمونے کا متن ہے — ایڈمن پینل سے بدل دیں۔*\n\nہوا نے گاؤں کے سب چراغ بجھا دیے تھے، بس ایک باقی تھا۔ گل بی بی اسے سینے سے لگائے کنویں تک گئی، جہاں اس کی دادی شام سے انتظار کر رہی تھیں۔",
    },
  },
];
