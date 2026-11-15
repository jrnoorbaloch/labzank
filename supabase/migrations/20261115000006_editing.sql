-- ═══════════════════════════════════════════════════════════════════════
-- Labzank · 0006 dictionary editing + editorial workflow
--   dict_admin_list   – paged staff list with filters
--   dict_admin_get    – one entry with raw status, notes, history, reviews
--   dict_save_entry   – create / update an entry with senses, glosses, examples, relations
--   dict_set_status   – workflow transitions with role checks + review log
--   dict_delete_entry – dictionary admins only
--   dict_duplicates   – headwords that appear more than once
-- Gloss rows are updated in place (not deleted/re-inserted) so the revision
-- trigger records every change of meaning.
-- ═══════════════════════════════════════════════════════════════════════

create or replace function public.dict_require(roles text[]) returns void
language plpgsql stable set search_path = public, extensions as $$
begin
  if not public.has_role(roles) then
    raise exception 'not allowed: needs one of %', array_to_string(roles, ', ') using errcode = '42501';
  end if;
end $$;

-- ── list for the admin table ──
create or replace function public.dict_admin_list(q text default '', p_status text default null, lim int default 50, off int default 0)
returns jsonb language plpgsql stable security definer set search_path = public, extensions as $$
declare v_q text; res jsonb; total int;
begin
  perform dict_require(array['dict_admin','dict_linguist','dict_translator','dict_reviewer','admin','editor']);
  v_q := case when dict_script(coalesce(q, '')) = 'arab' then dict_norm_arab(q) else dict_norm_latn(q) end;
  select count(*) into total from dict_entries e
  where (v_q = '' or e.headword_norm like '%' || v_q || '%' or e.headword_latn_norm like '%' || v_q || '%')
    and (p_status is null or e.status::text = p_status);
  select coalesce(jsonb_agg(r order by r->>'updated' desc), '[]') into res from (
    select jsonb_build_object(
      'slug', e.slug, 'id', e.public_id, 'arab', e.headword_arab, 'latn', coalesce(e.headword_latn, ''),
      'status', e.status, 'updated', e.updated_at, 'version', e.version, 'source', e.source_id,
      'senses', (select count(*) from dict_senses s where s.entry_id = e.id),
      'langs', (select coalesce(jsonb_agg(distinct g.lang), '[]') from dict_senses s join dict_glosses g on g.sense_id = s.id where s.entry_id = e.id)
    ) r
    from dict_entries e
    where (v_q = '' or e.headword_norm like '%' || v_q || '%' or e.headword_latn_norm like '%' || v_q || '%')
      and (p_status is null or e.status::text = p_status)
    order by e.updated_at desc, e.id desc
    limit lim offset off
  ) z;
  return jsonb_build_object('total', total, 'rows', res);
end $$;

-- ── one entry, editor view ──
create or replace function public.dict_admin_get(p_slug text) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
declare e dict_entries; out jsonb;
begin
  perform dict_require(array['dict_admin','dict_linguist','dict_translator','dict_reviewer','admin','editor']);
  select * into e from dict_entries where slug = p_slug;
  if not found then return null; end if;
  out := dict_entry_json(e) || jsonb_build_object(
    'status_raw', e.status,
    'editor_notes', e.editor_notes,
    'version', e.version,
    'updated', e.updated_at,
    -- all senses, including imported ones still hidden from the public
    'senses', coalesce((
      select jsonb_agg(jsonb_build_object(
        'pos', s.pos,
        'gloss', coalesce((select jsonb_object_agg(g.lang, g.text) from dict_glosses g where g.sense_id = s.id), '{}'),
        'gloss_status', coalesce((select jsonb_object_agg(g.lang, g.status) from dict_glosses g where g.sense_id = s.id), '{}'),
        'imported', s.import_batch_id is not null,
        'examples', coalesce((
          select jsonb_agg(jsonb_build_object('arab', x.text_arab, 'latn', coalesce(x.text_latn, ''))
                 || coalesce((select jsonb_object_agg(t.lang, t.text) from dict_example_translations t where t.example_id = x.id), '{}')
                 order by x.id)
          from dict_examples x where x.sense_id = s.id), '[]')
      ) order by s.n) from dict_senses s where s.entry_id = e.id), '[]'),
    'relations', coalesce((
      select jsonb_agg(jsonb_build_object('type', r.type, 'to', t.slug, 'arab', t.headword_arab) order by t.slug)
      from dict_relations r join dict_entries t on t.id = r.to_entry where r.from_entry = e.id), '[]'),
    'history', coalesce((
      select jsonb_agg(jsonb_build_object('at', v.created_at, 'entity', v.entity, 'diff', v.diff,
                                          'by', (select p.display_name from profiles p where p.id = v.user_id)) order by v.created_at desc)
      from (select * from dict_revisions v
            where (v.entity = 'entry' and v.entity_id = e.id)
               or (v.entity = 'gloss' and v.entity_id in (select g.id from dict_glosses g join dict_senses s on s.id = g.sense_id where s.entry_id = e.id))
            order by v.created_at desc limit 30) v), '[]'),
    'reviews', coalesce((
      select jsonb_agg(jsonb_build_object('at', r.created_at, 'stage', r.stage, 'decision', r.decision, 'note', r.note,
                                          'by', (select p.display_name from profiles p where p.id = r.reviewer_id)) order by r.created_at desc)
      from dict_reviews r where r.entry_id = e.id), '[]')
  );
  return out;
end $$;

-- ── create / update ──
-- p: {slug?, arab, latn, word_type, root, ipa, syllables[], editor_notes,
--     senses:[{pos, gloss:{bal,en,ur,brh}, examples:[{arab,latn,en,ur}]}],
--     relations:[{type,to}]}
create or replace function public.dict_save_entry(p jsonb) returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  eid bigint; v_slug text := nullif(p->>'slug', ''); base text; s jsonb; sid bigint; v_n int := 0;
  v_lang text; txt text; x jsonb; xid bigint; r jsonb; is_new boolean := false; translator_only boolean;
begin
  perform dict_require(array['dict_admin','dict_linguist','dict_translator','admin','editor']);
  translator_only := not has_role(array['dict_admin','dict_linguist','admin','editor']);
  if coalesce(p->>'arab', '') = '' or dict_script(p->>'arab') <> 'arab' then raise exception 'Arabic-script headword is required'; end if;
  if jsonb_array_length(coalesce(p->'senses', '[]')) = 0 then raise exception 'at least one meaning is required'; end if;

  if v_slug is not null then select id into eid from dict_entries where slug = v_slug; end if;

  if eid is null then
    if translator_only then raise exception 'translators can edit meanings but not create words' using errcode = '42501'; end if;
    is_new := true;
    base := nullif(trim(both '-' from regexp_replace(dict_norm_latn(p->>'latn'), '[^a-z0-9]+', '-', 'g')), '');
    insert into dict_entries (slug, headword_arab, headword_latn, word_type, source_id, editor_notes, status)
    values ('tmp-' || gen_random_uuid(), p->>'arab', nullif(p->>'latn', ''),
            coalesce(nullif(p->>'word_type', ''), 'simple')::dict_word_type,
            coalesce(nullif(p->>'source', ''), 'labzank-editorial'), p->>'editor_notes', 'draft')
    returning id into eid;
    update dict_entries set slug = case when base is not null and not exists (select 1 from dict_entries where slug = base)
                                        then base else coalesce(base, 'w') || '-' || eid end
    where id = eid returning slug into v_slug;
  elsif not translator_only then
    update dict_entries set
      headword_arab = p->>'arab',
      headword_latn = nullif(p->>'latn', ''),
      headword_latn_src = 'editor',
      word_type = coalesce(nullif(p->>'word_type', ''), word_type::text)::dict_word_type,
      editor_notes = p->>'editor_notes',
      -- an edited word goes back to draft unless it was still a draft/imported
      status = case when status in ('verified','published') then 'pending_review' else status end
    where id = eid;
  end if;

  if not translator_only then
    update dict_entries set root_entry_id = (select id from dict_entries where slug = nullif(p->>'root', '') and id <> eid) where id = eid;
    delete from dict_pronunciations where entry_id = eid and audio_path is null;
    if coalesce(p->>'ipa', '') <> '' or jsonb_array_length(coalesce(p->'syllables', '[]')) > 0 then
      insert into dict_pronunciations (entry_id, ipa, syllables)
      values (eid, nullif(p->>'ipa', ''), nullif(array(select jsonb_array_elements_text(coalesce(p->'syllables', '[]'))), '{}'));
    end if;
  end if;

  -- senses in order; update in place, add new, drop extras
  for s in select * from jsonb_array_elements(p->'senses') loop
    v_n := v_n + 1;
    select id into sid from dict_senses where entry_id = eid and dict_senses.n = v_n;
    if sid is null then
      if translator_only then raise exception 'translators cannot add meanings' using errcode = '42501'; end if;
      insert into dict_senses (entry_id, n, pos) values (eid, v_n, coalesce(nullif(s->>'pos', ''), 'noun')) returning id into sid;
    elsif not translator_only then
      update dict_senses set pos = coalesce(nullif(s->>'pos', ''), pos) where id = sid;
    end if;
    foreach v_lang in array array['bal','en','ur','brh'] loop
      txt := nullif(btrim(coalesce(s->'gloss'->>v_lang, '')), '');
      if txt is null then
        delete from dict_glosses where sense_id = sid and dict_glosses.lang = v_lang;
      else
        insert into dict_glosses (sense_id, lang, text, status) values (sid, v_lang, txt, 'draft')
        on conflict (sense_id, lang) do update set text = excluded.text,
          status = case when dict_glosses.text = excluded.text then dict_glosses.status else 'draft' end;
      end if;
    end loop;
    if not translator_only then
      delete from dict_examples where sense_id = sid;
      for x in select * from jsonb_array_elements(coalesce(s->'examples', '[]')) loop
        if coalesce(x->>'arab', '') <> '' then
          insert into dict_examples (sense_id, text_arab, text_latn) values (sid, x->>'arab', nullif(x->>'latn', '')) returning id into xid;
          foreach v_lang in array array['en','ur'] loop
            if coalesce(x->>v_lang, '') <> '' then insert into dict_example_translations values (xid, v_lang, x->>v_lang); end if;
          end loop;
        end if;
      end loop;
    end if;
  end loop;
  if not translator_only then
    delete from dict_senses where entry_id = eid and dict_senses.n > v_n;
    delete from dict_relations where from_entry = eid;
    for r in select * from jsonb_array_elements(coalesce(p->'relations', '[]')) loop
      insert into dict_relations
      select eid, t.id, (r->>'type')::dict_relation from dict_entries t where t.slug = r->>'to' and t.id <> eid
      on conflict do nothing;
    end loop;
  end if;

  update dict_entries set updated_at = now() where id = eid;
  insert into activity_logs (actor, action, entity, entity_id) values (auth.uid(), case when is_new then 'create' else 'update' end, 'dict_entries', v_slug);
  return jsonb_build_object('slug', v_slug, 'created', is_new);
end $$;

-- ── workflow ──
-- draft/imported → pending_review → verified → published ; any → rejected ; rejected/published → draft
create or replace function public.dict_set_status(p_slug text, p_status public.dict_status, p_note text default null)
returns jsonb language plpgsql volatile security definer set search_path = public, extensions as $$
declare e dict_entries; verifier uuid; v_stage text; v_decision text;
begin
  select * into e from dict_entries where slug = p_slug;
  if not found then raise exception 'word not found'; end if;
  if e.status = p_status then return jsonb_build_object('slug', p_slug, 'status', p_status); end if;

  case p_status
    when 'pending_review' then
      perform dict_require(array['dict_admin','dict_linguist','dict_translator','dict_reviewer','admin','editor']);
      v_stage := 'linguistic'; v_decision := 'request_changes';
    when 'verified' then
      perform dict_require(array['dict_admin','dict_linguist','admin']);
      if e.status not in ('pending_review','draft','imported') then raise exception 'only words awaiting review can be verified'; end if;
      v_stage := 'linguistic'; v_decision := 'approve';
    when 'published' then
      perform dict_require(array['dict_admin','dict_reviewer','admin']);
      if e.status <> 'verified' then raise exception 'a word must be verified before it is published'; end if;
      -- four-eyes rule: the publisher is not the person who verified (super_admin may override)
      select reviewer_id into verifier from dict_reviews
      where entry_id = e.id and dict_reviews.stage = 'linguistic' and dict_reviews.decision = 'approve' order by created_at desc limit 1;
      if verifier = auth.uid() and not exists (select 1 from profiles where id = auth.uid() and 'super_admin' = any(roles)) then
        raise exception 'a second person must publish what you verified';
      end if;
      v_stage := 'publish'; v_decision := 'approve';
    when 'rejected' then
      perform dict_require(array['dict_admin','dict_linguist','dict_reviewer','admin']);
      v_stage := case when e.status = 'verified' then 'publish' else 'linguistic' end; v_decision := 'reject';
    when 'draft' then
      perform dict_require(array['dict_admin','dict_linguist','admin','editor']);
      v_stage := 'linguistic'; v_decision := 'request_changes';
    else
      raise exception 'status % cannot be set by hand', p_status;
  end case;

  update dict_entries set status = p_status where id = e.id;
  -- approved words carry their meanings with them (imported meanings become visible)
  if p_status in ('verified','published') then
    update dict_glosses g set status = p_status
    from dict_senses s where s.id = g.sense_id and s.entry_id = e.id and g.status <> 'rejected';
  end if;
  insert into dict_reviews (entry_id, stage, decision, note) values (e.id, v_stage, v_decision, p_note);
  insert into activity_logs (actor, action, entity, entity_id, detail)
  values (auth.uid(), 'status', 'dict_entries', p_slug, jsonb_build_object('from', e.status, 'to', p_status));
  return jsonb_build_object('slug', p_slug, 'status', p_status);
end $$;

create or replace function public.dict_delete_entry(p_slug text) returns void
language plpgsql volatile security definer set search_path = public, extensions as $$
begin
  perform dict_require(array['dict_admin','admin']);
  delete from dict_entries where slug = p_slug;
  insert into activity_logs (actor, action, entity, entity_id) values (auth.uid(), 'delete', 'dict_entries', p_slug);
end $$;

create or replace function public.dict_duplicates() returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  perform dict_require(array['dict_admin','dict_linguist','dict_reviewer','admin','editor']);
  return coalesce((
    select jsonb_agg(jsonb_build_object('norm', d.headword_norm, 'words',
      (select jsonb_agg(jsonb_build_object('slug', e.slug, 'arab', e.headword_arab, 'latn', e.headword_latn, 'status', e.status, 'source', e.source_id) order by e.id)
       from dict_entries e where e.headword_norm = d.headword_norm)))
    from (select headword_norm from dict_entries group by headword_norm having count(*) > 1) d), '[]');
end $$;

-- deletes go through dict_delete_entry (admins only); other staff keep insert/update
drop policy if exists "staff delete dict_entries" on public.dict_entries;
create policy "admins delete dict_entries" on public.dict_entries for delete using (public.has_role(array['dict_admin','admin']));

revoke execute on function public.dict_require(text[]), public.dict_admin_list(text, text, int, int), public.dict_admin_get(text),
  public.dict_save_entry(jsonb), public.dict_set_status(text, public.dict_status, text), public.dict_delete_entry(text),
  public.dict_duplicates() from public, anon;
grant execute on function public.dict_require(text[]), public.dict_admin_list(text, text, int, int), public.dict_admin_get(text),
  public.dict_save_entry(jsonb), public.dict_set_status(text, public.dict_status, text), public.dict_delete_entry(text),
  public.dict_duplicates() to authenticated;
