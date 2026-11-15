-- split "staff write" FOR ALL policies so SELECT is evaluated by one policy only (linter 0006)
do $$ declare t text; cond text; begin
  for t, cond in select * from (values
    ('dict_sources','public.dict_is_staff()'), ('dict_entries','public.dict_is_staff()'), ('dict_senses','public.dict_is_staff()'),
    ('dict_glosses','public.dict_is_staff()'), ('dict_examples','public.dict_is_staff()'), ('dict_example_translations','public.dict_is_staff()'),
    ('dict_pronunciations','public.dict_is_staff()'), ('dict_relations','public.dict_is_staff()'), ('dict_entry_sources','public.dict_is_staff()'),
    ('dict_word_of_day','public.dict_is_staff()'),
    ('authors','public.content_is_staff()'), ('poems','public.content_is_staff()'), ('books','public.content_is_staff()'),
    ('events','public.content_is_staff()'), ('folk_items','public.content_is_staff()'), ('audio_items','public.content_is_staff()')) v(t, c)
  loop
    execute format('drop policy if exists "staff write %1$s" on public.%1$I', t);
    execute format('create policy "staff insert %1$s" on public.%1$I for insert with check (%2$s)', t, cond);
    execute format('create policy "staff update %1$s" on public.%1$I for update using (%2$s) with check (%2$s)', t, cond);
    execute format('create policy "staff delete %1$s" on public.%1$I for delete using (%2$s)', t, cond);
  end loop;
end $$;

drop policy if exists "staff write slides" on public.hero_slides;
create policy "staff insert slides" on public.hero_slides for insert with check (public.content_is_staff());
create policy "staff update slides" on public.hero_slides for update using (public.content_is_staff()) with check (public.content_is_staff());
create policy "staff delete slides" on public.hero_slides for delete using (public.content_is_staff());
drop policy if exists "staff write sections" on public.homepage_sections;
create policy "staff insert sections" on public.homepage_sections for insert with check (public.content_is_staff());
create policy "staff update sections" on public.homepage_sections for update using (public.content_is_staff()) with check (public.content_is_staff());
create policy "staff delete sections" on public.homepage_sections for delete using (public.content_is_staff());

drop policy if exists "own profile readable" on public.profiles;
create policy "own profile readable" on public.profiles for select using (id = (select auth.uid()) or public.has_role(array['admin']));

-- covering indexes for foreign keys used in joins / cascades
create index if not exists dict_examples_sense       on public.dict_examples (sense_id);
create index if not exists dict_pron_entry           on public.dict_pronunciations (entry_id);
create index if not exists dict_wotd_entry           on public.dict_word_of_day (entry_id);
create index if not exists dict_senses_batch         on public.dict_senses (import_batch_id) where import_batch_id is not null;
create index if not exists dict_entries_batch        on public.dict_entries (import_batch_id) where import_batch_id is not null;
create index if not exists dict_entries_source       on public.dict_entries (source_id);
create index if not exists dict_reviews_entry        on public.dict_reviews (entry_id);
create index if not exists dict_import_rows_entry    on public.dict_import_rows (entry_id);
create index if not exists dict_import_batches_src   on public.dict_import_batches (source_id);
create index if not exists poems_author              on public.poems (author_id);
create index if not exists books_author              on public.books (author_id);
create index if not exists audio_items_author        on public.audio_items (author_id);
