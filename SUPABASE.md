# Supabase backend

Project: **labzz** (`igbixspzzxokgophezrw`), URL `https://igbixspzzxokgophezrw.supabase.co`.
`.env.local` already holds the URL and the publishable key, so `npm run dev` talks to the database.
If the two variables are missing, the site falls back to the bundled sample data.

## What is in the database

| Migration | Contents | Applied |
|---|---|---|
| `20261114000001_platform.sql` | roles, profiles (auto-created on sign-up), `has_role()`, activity log | yes |
| `20261114000002_dictionary.sql` | 15 dictionary tables, SQL normalisation, triggers, RLS, read RPCs (`dict_search`, `dict_by_slug`, `dict_by_letter`, `dict_word_of_day` …), `dict_import`, `dict_rollback` | yes |
| `20261114000003_content.sql` | authors, poems, books, events, folk, audio, hero slides, homepage sections, newsletter, contact messages, storage buckets | yes |
| `20261114000004_hardening.sql` | search_path pinning, internal functions not callable via API | yes |
| `20261114000005_performance.sql` | split write policies, foreign-key indexes | **pending** |

Seed data: `seed.sql` (content) and `seed-dictionary.sql` (30 sample words) are already loaded.
To rebuild the seeds from the app's data: `npx tsx scripts/gen-seed.ts` and `npx tsx scripts/gen-dict-seed-compact.ts`.

## Make yourself admin

1. Supabase dashboard → **Authentication → Users → Add user** (email + password, "Auto confirm").
2. **SQL Editor** → run:
   ```sql
   update public.profiles set roles = array['super_admin']
   where id = (select id from auth.users where email = 'YOUR@EMAIL');
   ```
3. Open `/admin` and sign in.
4. Recommended: Authentication → Sign In / Providers → turn **off** "Allow new users to sign up" (staff accounts are created by the Super Admin).

Roles: `super_admin`, `admin`, `editor`, `dict_admin` (import, rollback), `dict_linguist`, `dict_translator`, `dict_reviewer`, `author`, `contributor`, `visitor`.

## Security model

- Row Level Security is on for every table. Visitors can only read published content.
- `draft` dictionary entries are public while the site runs on sample data. Before launch, change `dict_is_public()` to `s in ('verified','published')`.
- Imports land as `imported` and are hidden until reviewed. Meanings merged into existing words also stay hidden until a reviewer approves them.
- The read RPCs are SECURITY DEFINER on purpose: they filter visibility themselves. The Supabase advisor lists them as warnings. That is expected.
- The publishable key is meant for browsers. Never put the `service_role` / secret key in this app.

## Testing SQL locally

`supabase/` migrations run in PGlite (Postgres in WASM) with auth stubs. See `scripts/` for the generators. The full Supabase CLI (`supabase start`) also works with these migration files.

## Literature CMS (admin.html → "Literature")
Roles `admin`, `editor` (and `super_admin`) can create, edit, publish/unpublish and delete poets, poems, books, events, folk items, audio, hero slides; reorder/hide homepage sections; view newsletter subscribers (admin only via RLS).
New items start as **draft** — only **published** rows are visible on the public site. Give someone editor access:
```sql
update profiles set roles = array_append(roles,'editor') where id = (select id from auth.users where email = 'person@example.org');
```

## Media uploads (migration 20261115000007_media.sql)
- `images` (public, ≤5 MB): poet portraits, book covers
- `audio` (public, ≤50 MB): audio poetry
- `books` (private, ≤100 MB PDF): opened through a 10-minute signed link, only when the book is **published** and **Download allowed** is ticked
Only admin / editor / super_admin can upload, replace or delete. Replaced or removed files are deleted from Storage on save; uploads are cleaned up on Cancel.

## Public pages
- `poets.html` — all poets; `poets.html#<slug>` profile with their poems, books and recitations (linked through `author_id`)
- `poetry.html` — all published poems; `poetry.html#<slug>` the poem (original, Roman, approved translations)
- `library.html` — all books; `library.html#<slug>` book page with "Read online" when allowed
Set **Poet** on a poem / book / recording in the CMS to make it appear on that poet's profile.

## Site languages (migration 20261115000008_site_settings.sql)
Admin → Site → **Languages**: tick which interface languages appear in the navigation menu and choose the default.
Every new visit opens in the default (English out of the box); a visitor's own choice is kept while they browse (per tab session). Only `admin` / `super_admin` can change it.

## Dictionary visibility (migration 20261115000009_dictionary_visibility.sql)
Admin → Site → **Dictionary visibility**. Preview mode (current) shows drafts and words awaiting review; Launch mode shows only Verified and Published words. Imported and rejected words are never public.
