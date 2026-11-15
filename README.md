# Labzank — Balochi Literature & Heritage (homepage, phase 1)

A cinematic, scroll-driven homepage for the Balochi digital literature platform. It is built with Next.js 15, GSAP ScrollTrigger and Lenis, and the interface comes in three languages: Balochi (default, in Arabic and Latin script), English and Urdu.

## Run

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # static export → out/ (post-export renames _next → next for hosts that reserve "_")
```

## What's here

| Area | File |
|---|---|
| Scroll film: 6 pinned chapters (calligraphy, voice, doch embroidery, library, poet constellation, hero card) | `src/components/ScrollFilm.tsx` |
| Homepage sections (manifesto, poet of the day, poetry, stats, poets, library, folk, audio, events, newsletter, CTA, footer) | `src/components/BrandSections.tsx` |
| Nav with language dropdown, "More" menu, mobile drawer | `src/components/Nav.tsx` |
| Global search (all scripts, normalises Arabic letter variants and diacritics, Ctrl/⌘-K) | `src/components/SearchOverlay.tsx` |
| i18n: `bal` / `bal-latn` / `en` / `ur`, automatic `dir` switching, saved preference, `Tx` component with "Original" fallback badge | `src/lib/i18n.tsx` |
| Interface strings (seed for the `translations` table) | `src/lib/dict.ts` |
| Demo content shaped like the planned DB tables | `src/lib/content.ts` |

## Content rules already honoured

- Literary text is never machine-translated. When no approved translation exists, the Balochi original is shown with an "Original" badge (see the *Sheh Mureed and Hani* book in Urdu).
- The original Balochi text is kept as a separate field and is never overwritten by a translation.
- The verses are original placeholder lines, and they are credited to demo contributors, not to historical poets. Poet bios are deliberately short and should be verified and expanded by an editor.
- **The Balochi UI strings (both scripts) are a first draft. A native-speaking editor should review them before launch.**

## Next phases (from the brief)

1. Add PostgreSQL + Prisma using the schema from the brief: users, roles, authors(+translations), poems(+translations), books, hero_slides, homepage_sections, navigation_items …
2. Replace `content.ts` with server data loaders. The components only read the content shapes, so the UI doesn't need a rewrite.
3. Add auth (Auth.js) and RBAC: Super Admin, Admin, Editor, Author, Contributor, Visitor.
4. Build `/admin`: CRUD modules, a homepage builder that drives `homepage_sections` order and visibility, a hero slide manager and a translations editor.
5. Build a contributor portal with an editorial workflow (Draft → Pending → Published → Archived) and revision history.
6. Add author, poem and book detail pages (SSR, SEO, structured data) and a PDF reader.
7. Drop `output: "export"` and deploy as a Next server (Vercel or a Node host), with object storage for media.

## Dictionary module (phase 1b)

| Area | File |
|---|---|
| Dictionary page: search in both scripts plus English/Urdu, Balochi keyboard, filters, A–Z, Word of the Day, recent/popular words, word pages with Balochi/English/Urdu/Brahui tabs, converter | `src/components/dictionary/DictionaryApp.tsx` → `/dictionary` (`dictionary.html`) |
| Admin: overview, 4-step bulk import (CSV / Excel / JSON → mapping → validation → batch with rollback), import history, Word of the Day | `src/components/dictionary/AdminDictionary.tsx` → `/admin` (`admin.html`) |
| Sample entries (30, our own, **draft**), alphabet, Word-of-the-Day schedule | `src/lib/dictionary/data.ts` |
| Normalisation and script detection | `src/lib/dictionary/normalize.ts` |
| Arabic ⇄ Latin converter (**draft rules, needs linguist review**) | `src/lib/dictionary/translit.ts` |
| Importer: parsing, field mapping, duplicate and missing-translation checks, error report | `src/lib/dictionary/importer.ts` |
| PostgreSQL schema / migration | `db/dictionary.sql` |

Word pages use the hash (`dictionary.html#word-ap`), so the static export works from any folder. On a Next server, move them to `/dictionary/[slug]` for SEO.

**Labzganj data is NOT included.** Import it only after the Balochi Academy gives written permission. The planning doc includes a draft request letter.

## Backend: Supabase (phase 2)

The site now reads from Supabase when `.env.local` is present. That covers the homepage content, the homepage section order, the dictionary search and word pages, Word of the Day, newsletter sign-ups, admin sign-in, and import/rollback. Without `.env.local` it falls back to the sample data. Setup, roles and security notes are in **SUPABASE.md**.


## Going live
See **DEPLOY.md** — `npm run build` creates `out/`, ready for Netlify (drag & drop) or Vercel.
