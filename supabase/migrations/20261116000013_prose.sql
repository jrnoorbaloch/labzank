-- Prose: short stories (afsana), essays, tales, travelogues, memoirs, drama.
-- Same model as articles: multilingual jsonb, content_status, public reads
-- published rows only, content staff (admin / editor) write.
-- `body` is Markdown per language: body.bal is the Balochi text as written;
-- other keys are approved translations and never replace it.

create table if not exists public.prose (
  id           bigint generated always as identity primary key,
  slug         text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  kind         text not null default 'afsana'
               check (kind in ('afsana','essay','kahani','travelogue','memoir','drama','other')),
  title        jsonb not null check (jsonb_typeof(title) = 'object' and coalesce(title->>'bal', title->>'en', '') <> ''),
  excerpt      jsonb check (excerpt is null or jsonb_typeof(excerpt) = 'object'),
  body         jsonb check (body is null or jsonb_typeof(body) = 'object'),
  cover_path   text,
  author_id    bigint references public.authors(id) on delete set null,
  author_text  jsonb check (author_text is null or jsonb_typeof(author_text) = 'object'),
  source       text,
  status       public.content_status not null default 'draft',
  published_at timestamptz,
  sort         integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists prose_author on public.prose (author_id);
create index if not exists prose_published on public.prose (status, published_at desc);

alter table public.prose enable row level security;
drop policy if exists "public reads published prose" on public.prose;
drop policy if exists "staff insert prose" on public.prose;
drop policy if exists "staff update prose" on public.prose;
drop policy if exists "staff delete prose" on public.prose;
create policy "public reads published prose" on public.prose for select using (status = 'published' or (select public.content_is_staff()));
create policy "staff insert prose" on public.prose for insert with check ((select public.content_is_staff()));
create policy "staff update prose" on public.prose for update using ((select public.content_is_staff())) with check ((select public.content_is_staff()));
create policy "staff delete prose" on public.prose for delete using ((select public.content_is_staff()));
grant select on public.prose to anon, authenticated;
grant insert, update, delete on public.prose to authenticated;
