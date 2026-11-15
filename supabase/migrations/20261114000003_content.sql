-- ═══════════════════════════════════════════════════════════════════════
-- Labzank · 0003 literary content + homepage builder + newsletter
-- Multilingual text fields are jsonb in the frontend's `L` shape:
--   {"bal": "…", "bal-latn": "…", "en": "…", "ur": "…"}   (bal is required)
-- Original Balochi text is a separate column/key and is never overwritten.
-- ═══════════════════════════════════════════════════════════════════════

create type public.content_status as enum ('draft','pending_review','published','archived');

-- a multilingual field must at least carry the Balochi original
create or replace function public.is_l(v jsonb) returns boolean
language sql immutable set search_path = public as $$ select jsonb_typeof(v) = 'object' and coalesce(v->>'bal', '') <> '' $$;

create or replace function public.content_is_staff() returns boolean
language sql stable set search_path = public as $$ select public.has_role(array['admin','editor']) $$;

create table public.authors (
  id          bigint generated always as identity primary key,
  slug        text not null unique,
  name        jsonb not null check (public.is_l(name)),
  period      text not null check (period in ('classical','modern','contemporary')),
  years       text,
  born_on     date,
  died_on     date,
  place       jsonb check (place is null or public.is_l(place)),
  bio         jsonb check (bio is null or public.is_l(bio)),
  bio_long    jsonb,
  works       integer not null default 0,
  hue         smallint not null default 30,
  photo_path  text,
  cover_path  text,
  socials     jsonb not null default '{}',
  seo         jsonb not null default '{}',
  featured    boolean not null default false,
  sort        integer not null default 0,
  status      public.content_status not null default 'draft',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.poems (
  id           bigint generated always as identity primary key,
  slug         text not null unique,
  form         jsonb not null check (public.is_l(form)),
  original     text not null,                       -- Balochi, Arabic script, lines split by \n
  roman        text,
  translation  jsonb not null default '{}',          -- {"en": "…", "ur": "…"} — editorially approved only
  contributor  jsonb check (contributor is null or public.is_l(contributor)),
  author_id    bigint references public.authors(id) on delete set null,
  is_sample    boolean not null default false,
  audio_path   text,
  video_url    text,
  tags         text[] not null default '{}',
  featured     boolean not null default false,
  sort         integer not null default 0,
  status       public.content_status not null default 'draft',
  published_at timestamptz,
  created_at   timestamptz not null default now()
);

create table public.books (
  id          bigint generated always as identity primary key,
  slug        text not null unique,
  title       jsonb not null check (public.is_l(title)),
  author_text jsonb check (author_text is null or public.is_l(author_text)),
  author_id   bigint references public.authors(id) on delete set null,
  cat         text not null,
  pages       integer,
  year        text,
  isbn        text,
  palette     text[] not null default array['#3a1020','#d9a441'],
  cover_path  text,
  pdf_path    text,                                 -- private bucket; served via signed URL when permitted
  can_download boolean not null default false,
  copyright   text,
  is_demo     boolean not null default false,
  sort        integer not null default 0,
  status      public.content_status not null default 'draft',
  created_at  timestamptz not null default now()
);

create table public.events (
  id         bigint generated always as identity primary key,
  event_date date,
  day        text not null,
  month      jsonb not null check (public.is_l(month)),
  title      jsonb not null check (public.is_l(title)),
  place      jsonb check (place is null or public.is_l(place)),
  sort       integer not null default 0,
  status     public.content_status not null default 'draft'
);

create table public.folk_items (
  id     bigint generated always as identity primary key,
  title  jsonb not null check (public.is_l(title)),
  body   jsonb not null check (public.is_l(body)),
  glyph  text not null default '◆',
  sort   integer not null default 0,
  status public.content_status not null default 'draft'
);

create table public.audio_items (
  id         bigint generated always as identity primary key,
  title      jsonb not null check (public.is_l(title)),
  by_line    jsonb not null check (public.is_l(by_line)),
  duration   text,
  audio_path text,
  author_id  bigint references public.authors(id) on delete set null,
  sort       integer not null default 0,
  status     public.content_status not null default 'draft'
);

create table public.hero_slides (
  id                 bigint generated always as identity primary key,
  heading            jsonb not null check (public.is_l(heading)),
  description        jsonb check (description is null or public.is_l(description)),
  quote              jsonb,                          -- {"text": "…", "roman": "…", "credit": L}
  featured_book_slug text,
  image_desktop_path text,
  image_mobile_path  text,
  video_path         text,
  cta                jsonb not null default '[]',
  sort               integer not null default 0,
  enabled            boolean not null default true,
  publish_from       timestamptz,
  publish_until      timestamptz
);

-- homepage builder: order + visibility of sections, no code change needed
create table public.homepage_sections (
  key     text primary key,                         -- manifesto, potd, poetry, dictionary, stats, poets, library, folk, audio, events, newsletter, cta
  enabled boolean not null default true,
  sort    integer not null,
  config  jsonb not null default '{}'
);

create table public.newsletter_subscribers (
  id         bigint generated always as identity primary key,
  email      text not null unique check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  lang       text,
  created_at timestamptz not null default now()
);

create table public.contact_messages (
  id         bigint generated always as identity primary key,
  name       text not null,
  email      text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  message    text not null check (length(message) between 2 and 5000),
  created_at timestamptz not null default now()
);

-- ── RLS ──
do $$ declare t text; begin
  foreach t in array array['authors','poems','books','events','folk_items','audio_items'] loop
    execute format('alter table public.%1$I enable row level security', t);
    execute format('create policy "public reads published %1$s" on public.%1$I for select using (status = ''published'' or public.content_is_staff())', t);
    execute format('create policy "staff write %1$s" on public.%1$I for all using (public.content_is_staff()) with check (public.content_is_staff())', t);
  end loop;
end $$;

alter table public.hero_slides enable row level security;
create policy "public reads live slides" on public.hero_slides for select
  using ((enabled and (publish_from is null or publish_from <= now()) and (publish_until is null or publish_until > now())) or public.content_is_staff());
create policy "staff write slides" on public.hero_slides for all using (public.content_is_staff()) with check (public.content_is_staff());

alter table public.homepage_sections enable row level security;
create policy "public reads sections" on public.homepage_sections for select using (true);
create policy "staff write sections" on public.homepage_sections for all using (public.content_is_staff()) with check (public.content_is_staff());

alter table public.newsletter_subscribers enable row level security;
create policy "anyone subscribes" on public.newsletter_subscribers for insert to anon, authenticated with check (length(email) <= 254 and (lang is null or lang in ('bal','bal-latn','en','ur')));
create policy "admins read subscribers" on public.newsletter_subscribers for select using (public.has_role(array['admin']));

alter table public.contact_messages enable row level security;
create policy "anyone writes" on public.contact_messages for insert to anon, authenticated with check (length(name) between 1 and 200 and length(email) <= 254);
create policy "admins read messages" on public.contact_messages for select using (public.has_role(array['admin']));

-- real archive counts for the numbers strip
create or replace function public.site_stats() returns jsonb
language sql stable security definer set search_path = public, extensions as $$
  select jsonb_build_object(
    'poets',  (select count(*) from authors where status = 'published'),
    'poems',  (select count(*) from poems   where status = 'published'),
    'books',  (select count(*) from books   where status = 'published'),
    'audio',  (select count(*) from audio_items where status = 'published'),
    'words',  (select count(*) from dict_entries where dict_is_public(status))
  );
$$;
grant execute on function public.site_stats() to anon, authenticated;

-- ── storage buckets (Supabase Storage) ──
-- covers/portraits public; PDFs and audio originals private (signed URLs)
do $$ begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public) values
      ('images', 'images', true), ('dictionary-audio', 'dictionary-audio', true),
      ('books', 'books', false), ('permissions', 'permissions', false)
    on conflict (id) do nothing;
  end if;
end $$;
