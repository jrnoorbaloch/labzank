-- ═══════════════════════════════════════════════════════════════════════
-- Labzank · 0002 Balochi dictionary
-- Normalisation lives in SQL (dict_norm_arab / dict_norm_latn) and is applied
-- by triggers, so search columns stay correct whoever writes the row.
-- All public reads go through RPCs that return entries in the same JSON
-- shape the frontend's local sample data uses (src/lib/dictionary/data.ts).
-- ═══════════════════════════════════════════════════════════════════════

create type public.dict_status   as enum ('draft','imported','pending_review','verified','published','rejected');
create type public.dict_relation as enum ('derived','synonym','antonym','see_also','variant');
create type public.dict_word_type as enum ('simple','derived','compound','phrase','loan');

-- ── normalisation (mirror of src/lib/dictionary/normalize.ts) ──
create or replace function public.dict_norm_arab(t text) returns text
language sql immutable parallel safe as $$
  select btrim(regexp_replace(
    translate(
      regexp_replace(coalesce(t, ''), '[\u064B-\u065F\u0670\u06EA-\u06ED\u0640\u200C\u200D]', '', 'g'),
      'يىئݔےكڪەةۀهھڑۏأإٱآء',
      'یییییککہہہہہڈواااا'
    ), '\s+', ' ', 'g'));
$$;

create or replace function public.dict_norm_latn(t text) returns text
language sql immutable parallel safe as $$
  select btrim(regexp_replace(
    translate(lower(coalesce(t, '')),
      'áàâäãåāéèêëēíìîïīóòôöõōúùûüūñçṭḍ''’ʼ`',
      'aaaaaaaeeeeeiiiiioooooouuuuunctd'),
    '\s+', ' ', 'g'));
$$;

create or replace function public.dict_script(t text) returns text
language sql immutable parallel safe as $$
  select case when t ~ '[\u0600-\u06FF\u0750-\u077F]' then 'arab'
              when t ~ '[A-Za-z\u00C0-\u024F\u1E00-\u1EFF]' then 'latn'
              else 'none' end;
$$;

-- "draft" is public while the site runs on sample data; remove it before launch
-- so only reviewed words are shown:  select s in ('verified','published')
create or replace function public.dict_is_public(s public.dict_status) returns boolean
language sql immutable as $$ select s in ('draft','pending_review','verified','published') $$;

create or replace function public.dict_is_staff() returns boolean
language sql stable as $$ select public.has_role(array['dict_admin','dict_linguist','dict_translator','dict_reviewer','admin','editor']) $$;

-- ── tables ──
create table public.dict_sources (
  id             text primary key,
  name           text not null,
  publisher      text,
  licence        text not null,
  attribution    text not null,
  url            text,
  terms_path     text,                          -- storage path of the signed permission / licence
  is_third_party boolean not null default false,
  created_at     timestamptz not null default now()
);

create table public.dict_import_batches (
  id          bigint generated always as identity primary key,
  source_id   text not null references public.dict_sources(id),
  file_name   text,
  format      text not null check (format in ('csv','xlsx','json','api')),
  mapping     jsonb not null default '{}',
  counts      jsonb not null default '{}',
  status      text not null default 'imported' check (status in ('imported','rolled_back')),
  permission_confirmed boolean not null,
  created_by  uuid references auth.users(id) default auth.uid(),
  created_at  timestamptz not null default now()
);

create table public.dict_entries (
  id                 bigint generated always as identity primary key,
  public_id          text generated always as ('bal-' || lpad(id::text, 6, '0')) stored unique,
  slug               text not null unique,
  headword_arab      text not null,
  headword_latn      text,
  headword_latn_src  text not null default 'editor' check (headword_latn_src in ('editor','machine')),
  headword_norm      text not null default '',
  headword_latn_norm text not null default '',
  word_type          public.dict_word_type not null default 'simple',
  root_entry_id      bigint references public.dict_entries(id) on delete set null,
  status             public.dict_status not null default 'draft',
  source_id          text not null references public.dict_sources(id),
  image_path         text,
  editor_notes       text,
  views              integer not null default 0,
  import_batch_id    bigint references public.dict_import_batches(id) on delete set null,
  version            integer not null default 1,
  created_by         uuid references auth.users(id) default auth.uid(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  published_at       timestamptz
);
create index dict_entries_norm_trgm on public.dict_entries using gin (headword_norm extensions.gin_trgm_ops);
create index dict_entries_latn_trgm on public.dict_entries using gin (headword_latn_norm extensions.gin_trgm_ops);
create index dict_entries_alpha     on public.dict_entries (headword_norm text_pattern_ops, id);
create index dict_entries_status    on public.dict_entries (status);
create index dict_entries_recent    on public.dict_entries (created_at desc);
create index dict_entries_root      on public.dict_entries (root_entry_id);

create table public.dict_senses (
  id              bigint generated always as identity primary key,
  entry_id        bigint not null references public.dict_entries(id) on delete cascade,
  n               smallint not null,
  pos             text not null,
  register        text,
  domain          text,
  dialect         text,
  import_batch_id bigint references public.dict_import_batches(id) on delete set null,
  unique (entry_id, n)
);

create table public.dict_glosses (
  id        bigint generated always as identity primary key,
  sense_id  bigint not null references public.dict_senses(id) on delete cascade,
  lang      text not null,                      -- bal, en, ur, brh … (open-ended)
  text      text not null,
  text_norm text not null default '',
  status    public.dict_status not null default 'draft',
  source_id text references public.dict_sources(id),
  unique (sense_id, lang)
);
create index dict_glosses_trgm on public.dict_glosses using gin (text_norm extensions.gin_trgm_ops);

create table public.dict_examples (
  id        bigint generated always as identity primary key,
  sense_id  bigint not null references public.dict_senses(id) on delete cascade,
  text_arab text not null,
  text_latn text,
  source_id text references public.dict_sources(id)
);
create table public.dict_example_translations (
  example_id bigint not null references public.dict_examples(id) on delete cascade,
  lang       text not null,
  text       text not null,
  primary key (example_id, lang)
);

create table public.dict_pronunciations (
  id         bigint generated always as identity primary key,
  entry_id   bigint not null references public.dict_entries(id) on delete cascade,
  ipa        text,
  syllables  text[],
  respelling text,
  audio_path text,                              -- Supabase Storage path (bucket: dictionary-audio)
  dialect    text
);

create table public.dict_relations (
  from_entry bigint not null references public.dict_entries(id) on delete cascade,
  to_entry   bigint not null references public.dict_entries(id) on delete cascade,
  type       public.dict_relation not null,
  primary key (from_entry, to_entry, type)
);
create index dict_relations_to on public.dict_relations (to_entry);

create table public.dict_entry_sources (
  entry_id     bigint not null references public.dict_entries(id) on delete cascade,
  source_id    text not null references public.dict_sources(id),
  external_ref text,
  primary key (entry_id, source_id)
);

create table public.dict_revisions (
  id         bigint generated always as identity primary key,
  entity     text not null,
  entity_id  bigint not null,
  diff       jsonb not null,
  user_id    uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now()
);
create index dict_revisions_entity on public.dict_revisions (entity, entity_id, created_at desc);

create table public.dict_reviews (
  id          bigint generated always as identity primary key,
  entry_id    bigint not null references public.dict_entries(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id) default auth.uid(),
  stage       text not null check (stage in ('linguistic','translation','publish')),
  decision    text not null check (decision in ('approve','reject','request_changes')),
  note        text,
  created_at  timestamptz not null default now()
);

create table public.dict_word_of_day (
  day              date primary key,
  entry_id         bigint not null references public.dict_entries(id) on delete cascade,
  featured_on_home boolean not null default true,
  note             text
);

create table public.dict_import_rows (
  batch_id bigint not null references public.dict_import_batches(id) on delete cascade,
  row_no   integer not null,
  raw      jsonb not null,
  entry_id bigint references public.dict_entries(id) on delete set null,
  outcome  text not null check (outcome in ('imported','merged','skipped')),
  errors   jsonb not null default '[]',
  primary key (batch_id, row_no)
);

create table public.dict_search_log (
  id         bigint generated always as identity primary key,
  query_norm text not null,
  script     text not null,
  hits       integer not null,
  created_at timestamptz not null default now()
);
create index dict_search_log_recent on public.dict_search_log (created_at desc);

-- ── triggers: keep normalised columns + history ──
create or replace function public.dict_entries_bi() returns trigger language plpgsql set search_path = public, extensions as $$
begin
  new.headword_norm := public.dict_norm_arab(new.headword_arab);
  new.headword_latn_norm := public.dict_norm_latn(new.headword_latn);
  new.updated_at := now();
  if tg_op = 'UPDATE' then
    new.version := old.version + 1;
    if new.status = 'published' and old.status <> 'published' then new.published_at := now(); end if;
    if row(new.headword_arab, new.headword_latn, new.status, new.word_type, new.editor_notes)
       is distinct from row(old.headword_arab, old.headword_latn, old.status, old.word_type, old.editor_notes) then
      insert into public.dict_revisions (entity, entity_id, diff)
      values ('entry', old.id, jsonb_build_object(
        'before', jsonb_build_object('arab', old.headword_arab, 'latn', old.headword_latn, 'status', old.status),
        'after',  jsonb_build_object('arab', new.headword_arab, 'latn', new.headword_latn, 'status', new.status)));
    end if;
  end if;
  return new;
end $$;
create trigger dict_entries_bi before insert or update on public.dict_entries
  for each row execute function public.dict_entries_bi();

create or replace function public.dict_glosses_bi() returns trigger language plpgsql set search_path = public, extensions as $$
begin
  new.text_norm := case when new.lang in ('bal','ur') then public.dict_norm_arab(new.text)
                        else public.dict_norm_latn(new.text) end;
  if tg_op = 'UPDATE' and new.text is distinct from old.text then
    insert into public.dict_revisions (entity, entity_id, diff)
    values ('gloss', old.id, jsonb_build_object('lang', old.lang, 'before', old.text, 'after', new.text));
  end if;
  return new;
end $$;
create trigger dict_glosses_bi before insert or update on public.dict_glosses
  for each row execute function public.dict_glosses_bi();

-- ── row level security ──
do $$ declare t text; begin
  foreach t in array array['dict_sources','dict_import_batches','dict_entries','dict_senses','dict_glosses',
    'dict_examples','dict_example_translations','dict_pronunciations','dict_relations','dict_entry_sources',
    'dict_revisions','dict_reviews','dict_word_of_day','dict_import_rows','dict_search_log'] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

create policy "sources readable"  on public.dict_sources for select using (true);
create policy "entries readable"  on public.dict_entries for select using (public.dict_is_public(status) or public.dict_is_staff());
create policy "senses readable"   on public.dict_senses for select using (exists (select 1 from public.dict_entries e where e.id = entry_id and (public.dict_is_public(e.status) or public.dict_is_staff())));
create policy "glosses readable"  on public.dict_glosses for select using (exists (select 1 from public.dict_senses s join public.dict_entries e on e.id = s.entry_id where s.id = sense_id and (public.dict_is_public(e.status) or public.dict_is_staff())));
create policy "examples readable" on public.dict_examples for select using (true);
create policy "ex tr readable"    on public.dict_example_translations for select using (true);
create policy "pron readable"     on public.dict_pronunciations for select using (true);
create policy "relations readable" on public.dict_relations for select using (true);
create policy "wotd readable"     on public.dict_word_of_day for select using (true);
create policy "entry sources readable" on public.dict_entry_sources for select using (true);

-- staff write access (editing screens use these directly)
do $$ declare t text; begin
  foreach t in array array['dict_sources','dict_entries','dict_senses','dict_glosses','dict_examples',
    'dict_example_translations','dict_pronunciations','dict_relations','dict_entry_sources','dict_word_of_day'] loop
    execute format('create policy "staff write %1$s" on public.%1$I for all using (public.dict_is_staff()) with check (public.dict_is_staff())', t);
  end loop;
end $$;
create policy "staff read batches"   on public.dict_import_batches for select using (public.dict_is_staff());
create policy "staff read rows"      on public.dict_import_rows for select using (public.dict_is_staff());
create policy "staff read revisions" on public.dict_revisions for select using (public.dict_is_staff());
create policy "staff reviews"        on public.dict_reviews for all using (public.dict_is_staff()) with check (public.dict_is_staff());
create policy "staff read search log" on public.dict_search_log for select using (public.dict_is_staff());

-- ═══════════════════════ read API (RPC) ═══════════════════════

-- one entry → the frontend Entry shape
create or replace function public.dict_entry_json(e public.dict_entries) returns jsonb
language sql stable security definer set search_path = public, extensions as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'id', e.public_id,
    'slug', e.slug,
    'arab', e.headword_arab,
    'latn', coalesce(e.headword_latn, ''),
    'type', e.word_type,
    'status', case e.status when 'pending_review' then 'pending' else e.status::text end,
    'source', e.source_id,
    'added', to_char(e.created_at, 'YYYY-MM-DD'),
    'root', (select r.slug from dict_entries r where r.id = e.root_entry_id),
    'ipa', (select p.ipa from dict_pronunciations p where p.entry_id = e.id order by p.id limit 1),
    'syllables', (select to_jsonb(p.syllables) from dict_pronunciations p where p.entry_id = e.id order by p.id limit 1),
    'audio', (select p.audio_path from dict_pronunciations p where p.entry_id = e.id and p.audio_path is not null order by p.id limit 1),
    'senses', coalesce((
      select jsonb_agg(jsonb_build_object(
        'pos', s.pos,
        'gloss', coalesce((select jsonb_object_agg(g.lang, g.text) from dict_glosses g where g.sense_id = s.id), '{}'),
        'examples', coalesce((
          select jsonb_agg(jsonb_build_object('arab', x.text_arab, 'latn', coalesce(x.text_latn, ''))
                 || coalesce((select jsonb_object_agg(t.lang, t.text) from dict_example_translations t where t.example_id = x.id), '{}')
                 order by x.id)
          from dict_examples x where x.sense_id = s.id), '[]')
      ) order by s.n)
      from dict_senses s where s.entry_id = e.id
        -- senses merged in by an import stay hidden until a reviewer approves a gloss
        and (s.import_batch_id is null or dict_is_staff()
             or exists (select 1 from dict_glosses g where g.sense_id = s.id and g.status not in ('imported','rejected')))), '[]'),
    'relations', coalesce((
      select jsonb_agg(jsonb_build_object('type', r.type, 'to', t.slug) order by t.slug)
      from dict_relations r join dict_entries t on t.id = r.to_entry
      where r.from_entry = e.id and (dict_is_public(t.status) or dict_is_staff())), '[]')
  ));
$$;

create or replace function public.dict_visible(e public.dict_entries) returns boolean
language sql stable set search_path = public, extensions as $$ select public.dict_is_public(e.status) or public.dict_is_staff() $$;

-- search either script + English/Urdu meanings; logs the query
create or replace function public.dict_search(q text, lim int default 20, p_pos text default null)
returns setof jsonb language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  v_sc text := dict_script(q);
  v_q  text := case when dict_script(q) = 'arab' then dict_norm_arab(q) else dict_norm_latn(q) end;
  hits int;
begin
  if v_q = '' or v_sc = 'none' then return; end if;
  return query
  with c as (
    select b.e, greatest(
      case when b.h = v_q then 100
           when b.h like v_q || '%' then 70 - (length(b.h) - length(v_q))
           when b.h like '%' || v_q || '%' then 40
           when similarity(b.h, v_q) > 0.35 then 30 * similarity(b.h, v_q)
           else 0 end,
      coalesce((select max(case when v_q = any(regexp_split_to_array(g.text_norm, '[|,;()\s]+')) then 60
                                when g.text_norm like '%' || v_q || '%' then 25 else 0 end)
                from dict_senses s join dict_glosses g on g.sense_id = s.id
                where s.entry_id = (b.e).id and g.lang = case when v_sc = 'arab' then 'ur' else 'en' end), 0)
    ) as score
    from (select x as e, case when v_sc = 'arab' then x.headword_norm else x.headword_latn_norm end as h
          from dict_entries x where dict_visible(x)) b
  )
  select dict_entry_json(c.e) from c
  where c.score > 0 and (p_pos is null or exists (select 1 from dict_senses s where s.entry_id = (c.e).id and s.pos = p_pos))
  order by c.score desc, (c.e).headword_latn_norm
  limit lim;
  get diagnostics hits = row_count;
  insert into dict_search_log (query_norm, script, hits) values (v_q, v_sc, hits);
end $$;

create or replace function public.dict_by_slug(p_slug text) returns jsonb
language sql stable security definer set search_path = public, extensions as $$
  select dict_entry_json(e) from dict_entries e where e.slug = p_slug and dict_visible(e);
$$;

-- words that use this entry as their root (for "derived words")
create or replace function public.dict_derived(p_slug text) returns setof jsonb
language sql stable security definer set search_path = public, extensions as $$
  select dict_entry_json(d) from dict_entries d join dict_entries r on r.id = d.root_entry_id
  where r.slug = p_slug and dict_visible(d) order by d.headword_norm;
$$;

-- A–Z browsing with keyset pagination: pass the last headword_norm seen
create or replace function public.dict_by_letter(letter text, after_norm text default '', lim int default 50)
returns setof jsonb language sql stable security definer set search_path = public, extensions as $$
  select dict_entry_json(e) from dict_entries e
  where e.headword_norm like dict_norm_arab(letter) || '%' and e.headword_norm > after_norm and dict_visible(e)
  order by e.headword_norm, e.id limit lim;
$$;

create or replace function public.dict_recent(lim int default 6) returns setof jsonb
language sql stable security definer set search_path = public, extensions as $$
  select dict_entry_json(e) from dict_entries e where dict_visible(e) order by e.created_at desc, e.id desc limit lim;
$$;

create or replace function public.dict_popular(lim int default 6) returns setof jsonb
language sql stable security definer set search_path = public, extensions as $$
  select dict_entry_json(e) from dict_entries e where dict_visible(e) order by e.views desc, e.id limit lim;
$$;

create or replace function public.dict_word_of_day(p_day date default current_date) returns jsonb
language sql stable security definer set search_path = public, extensions as $$
  select coalesce(
    (select dict_entry_json(e) from dict_word_of_day w join dict_entries e on e.id = w.entry_id where w.day = p_day and dict_visible(e)),
    (select dict_entry_json(e) from dict_entries e where dict_visible(e) order by e.id
       offset (p_day - date '1970-01-01') % greatest((select count(*) from dict_entries x where dict_visible(x)), 1) limit 1));
$$;

create or replace function public.dict_track_view(p_slug text) returns void
language sql volatile security definer set search_path = public, extensions as $$
  update dict_entries set views = views + 1 where slug = p_slug;
$$;

create or replace function public.dict_stats() returns jsonb
language sql stable security definer set search_path = public, extensions as $$
  select jsonb_build_object(
    'entries', (select count(*) from dict_entries),
    'senses', (select count(*) from dict_senses),
    'with_examples', (select count(distinct s.entry_id) from dict_senses s join dict_examples x on x.sense_id = s.id),
    'with_audio', (select count(distinct entry_id) from dict_pronunciations where audio_path is not null),
    'imported', (select count(*) from dict_entries where status = 'imported'),
    'by_status', (select coalesce(jsonb_object_agg(status, c), '{}') from (select status, count(*) c from dict_entries group by status) z),
    'coverage', (select coalesce(jsonb_object_agg(lang, c), '{}') from (select lang, count(*) c from dict_glosses group by lang) z)
  );
$$;

-- ═══════════════════════ write API: bulk import ═══════════════════════
-- rows: [{arab, latn, pos, gloss_bal, gloss_en, gloss_ur, gloss_brh, example, root, ipa, ref}, …]
-- New headwords land as 'imported'. A headword that already exists gets the row
-- as an extra sense (never overwritten). Every row keeps source + batch.
create or replace function public.dict_import(
  p_source jsonb, p_file text, p_format text, p_mapping jsonb, p_rows jsonb, p_permission boolean
) returns jsonb language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  b bigint; r jsonb; i int := 0; eid bigint; sid bigint; base text; nsense int;
  n_imp int := 0; n_merged int := 0; n_skip int := 0; lang text; errs jsonb;
begin
  if not has_role(array['dict_admin','admin']) then raise exception 'not allowed' using errcode = '42501'; end if;
  if not coalesce(p_permission, false) then raise exception 'permission to import must be confirmed'; end if;
  if coalesce(p_source->>'id', '') = '' or coalesce(p_source->>'licence', '') = '' then raise exception 'source id and licence are required'; end if;

  insert into dict_sources (id, name, licence, attribution, url, is_third_party)
  values (p_source->>'id', coalesce(p_source->>'name', p_source->>'id'), p_source->>'licence',
          coalesce(p_source->>'attribution', p_source->>'name', p_source->>'id'), p_source->>'url',
          coalesce((p_source->>'third_party')::boolean, false))
  on conflict (id) do update set licence = excluded.licence, attribution = excluded.attribution;

  insert into dict_import_batches (source_id, file_name, format, mapping, permission_confirmed)
  values (p_source->>'id', p_file, p_format, coalesce(p_mapping, '{}'), true) returning id into b;

  for r in select * from jsonb_array_elements(p_rows) loop
    i := i + 1;
    errs := '[]';
    if coalesce(r->>'arab', '') = '' or dict_script(r->>'arab') <> 'arab' then
      errs := '["headword missing or not Arabic script"]';
    elsif coalesce(r->>'gloss_bal', r->>'gloss_en', r->>'gloss_ur', r->>'gloss_brh', '') = '' then
      errs := '["no meaning in any language"]';
    end if;
    if errs <> '[]' then
      insert into dict_import_rows values (b, i, r, null, 'skipped', errs); n_skip := n_skip + 1; continue;
    end if;

    select id into eid from dict_entries where headword_norm = dict_norm_arab(r->>'arab') order by id limit 1;
    if eid is null then
      base := nullif(trim(both '-' from regexp_replace(dict_norm_latn(r->>'latn'), '[^a-z0-9]+', '-', 'g')), '');
      insert into dict_entries (slug, headword_arab, headword_latn, status, source_id, import_batch_id, root_entry_id)
      values ('tmp-' || b || '-' || i, r->>'arab', nullif(r->>'latn', ''), 'imported', p_source->>'id', b,
              (select id from dict_entries where headword_norm = dict_norm_arab(r->>'root') limit 1))
      returning id into eid;
      update dict_entries set slug = case when base is not null and not exists (select 1 from dict_entries where slug = base)
                                          then base else coalesce(base, 'w') || '-' || eid end
      where id = eid;
      insert into dict_entry_sources values (eid, p_source->>'id', r->>'ref') on conflict do nothing;
      if coalesce(r->>'ipa', '') <> '' then insert into dict_pronunciations (entry_id, ipa) values (eid, r->>'ipa'); end if;
      n_imp := n_imp + 1;
      insert into dict_import_rows values (b, i, r, eid, 'imported', '[]');
    else
      n_merged := n_merged + 1;
      insert into dict_entry_sources values (eid, p_source->>'id', r->>'ref') on conflict do nothing;
      insert into dict_import_rows values (b, i, r, eid, 'merged', '[]');
    end if;

    select coalesce(max(n), 0) + 1 into nsense from dict_senses where entry_id = eid;
    insert into dict_senses (entry_id, n, pos, import_batch_id)
    values (eid, nsense, coalesce(nullif(lower(r->>'pos'), ''), 'noun'), b) returning id into sid;
    foreach lang in array array['bal','en','ur','brh'] loop
      if coalesce(r->>('gloss_' || lang), '') <> '' then
        insert into dict_glosses (sense_id, lang, text, status, source_id)
        values (sid, lang, r->>('gloss_' || lang), 'imported', p_source->>'id');
      end if;
    end loop;
    if coalesce(r->>'example', '') <> '' then
      insert into dict_examples (sense_id, text_arab, source_id) values (sid, r->>'example', p_source->>'id');
    end if;
  end loop;

  update dict_import_batches set counts = jsonb_build_object('total', i, 'imported', n_imp, 'merged', n_merged, 'skipped', n_skip)
  where id = b;
  insert into activity_logs (actor, action, entity, entity_id, detail)
  values (auth.uid(), 'import', 'dict_import_batches', b::text, jsonb_build_object('imported', n_imp, 'merged', n_merged, 'skipped', n_skip));
  return jsonb_build_object('batch', b, 'total', i, 'imported', n_imp, 'merged', n_merged, 'skipped', n_skip);
end $$;

-- roll back: removes untouched imported entries and the senses the batch added
create or replace function public.dict_rollback(p_batch bigint) returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare n_e int; n_s int;
begin
  if not has_role(array['dict_admin','admin']) then raise exception 'not allowed' using errcode = '42501'; end if;
  delete from dict_senses where import_batch_id = p_batch
    and entry_id not in (select id from dict_entries where import_batch_id = p_batch);
  get diagnostics n_s = row_count;
  delete from dict_entries where import_batch_id = p_batch and status = 'imported';
  get diagnostics n_e = row_count;
  update dict_import_batches set status = 'rolled_back' where id = p_batch;
  insert into activity_logs (actor, action, entity, entity_id, detail)
  values (auth.uid(), 'rollback', 'dict_import_batches', p_batch::text, jsonb_build_object('entries', n_e, 'merged_senses', n_s));
  return jsonb_build_object('entries_removed', n_e, 'senses_removed', n_s);
end $$;

-- public may call the read RPCs; writes check roles inside
grant execute on function public.dict_search(text, int, text), public.dict_by_slug(text), public.dict_derived(text),
  public.dict_by_letter(text, text, int), public.dict_recent(int), public.dict_popular(int),
  public.dict_word_of_day(date), public.dict_track_view(text) to anon, authenticated;
-- functions are executable by PUBLIC by default: take that away from the write/admin ones
revoke execute on function public.dict_stats(), public.dict_import(jsonb, text, text, jsonb, jsonb, boolean),
  public.dict_rollback(bigint) from public, anon;
grant execute on function public.dict_stats(), public.dict_import(jsonb, text, text, jsonb, jsonb, boolean),
  public.dict_rollback(bigint) to authenticated;
