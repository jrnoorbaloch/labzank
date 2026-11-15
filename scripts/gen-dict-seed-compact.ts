/** Compact dictionary seed: one JSON document + one DO block (for the Supabase SQL editor / MCP). */
import { writeFileSync } from "node:fs";
import { entries, sources, wordOfDaySchedule } from "../src/lib/dictionary/data";
const doc = JSON.stringify({ sources, entries, wotd: wordOfDaySchedule });
const sql = `do $seed$
declare d jsonb := $json$${doc}$json$::jsonb; e jsonb; s jsonb; x jsonb; sid bigint; eid bigint; xid bigint; n int; k text; v text;
begin
  for k, v in select key, value::text from jsonb_each(d->'sources') loop
    insert into public.dict_sources (id, name, licence, attribution, url) values (k, (v::jsonb)->>'name', (v::jsonb)->>'licence', (v::jsonb)->>'attribution', (v::jsonb)->>'url') on conflict (id) do nothing;
  end loop;
  for e in select * from jsonb_array_elements(d->'entries') loop
    insert into public.dict_entries (slug, headword_arab, headword_latn, word_type, status, source_id, created_at)
    values (e->>'slug', e->>'arab', e->>'latn', (e->>'type')::public.dict_word_type, (e->>'status')::public.dict_status, e->>'source', (e->>'added')::timestamptz)
    returning id into eid;
    if e ? 'ipa' or e ? 'syllables' then
      insert into public.dict_pronunciations (entry_id, ipa, syllables)
      values (eid, e->>'ipa', case when e ? 'syllables' then array(select jsonb_array_elements_text(e->'syllables')) end);
    end if;
    n := 0;
    for s in select * from jsonb_array_elements(e->'senses') loop
      n := n + 1;
      insert into public.dict_senses (entry_id, n, pos) values (eid, n, s->>'pos') returning id into sid;
      for k, v in select key, value from jsonb_each_text(s->'gloss') loop
        insert into public.dict_glosses (sense_id, lang, text) values (sid, k, v);
      end loop;
      for x in select * from jsonb_array_elements(coalesce(s->'examples', '[]')) loop
        insert into public.dict_examples (sense_id, text_arab, text_latn, source_id) values (sid, x->>'arab', x->>'latn', e->>'source') returning id into xid;
        for k in select unnest(array['en','ur']) loop
          if x ? k then insert into public.dict_example_translations values (xid, k, x->>k); end if;
        end loop;
      end loop;
    end loop;
  end loop;
  for e in select * from jsonb_array_elements(d->'entries') loop
    if e ? 'root' then update public.dict_entries set root_entry_id = (select id from public.dict_entries where slug = e->>'root') where slug = e->>'slug'; end if;
    for x in select * from jsonb_array_elements(coalesce(e->'relations', '[]')) loop
      insert into public.dict_relations select f.id, t.id, (x->>'type')::public.dict_relation
      from public.dict_entries f, public.dict_entries t where f.slug = e->>'slug' and t.slug = x->>'to' on conflict do nothing;
    end loop;
  end loop;
  for x in select * from jsonb_array_elements(d->'wotd') loop
    insert into public.dict_word_of_day (day, entry_id) select (x->>'date')::date, id from public.dict_entries where slug = x->>'slug';
  end loop;
end $seed$;
`;
writeFileSync(new URL("../supabase/seed-dictionary.sql", import.meta.url), sql);
console.log(sql.length, "chars");
