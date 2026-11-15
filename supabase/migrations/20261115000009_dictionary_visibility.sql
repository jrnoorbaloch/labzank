-- Dictionary visibility for the public site, switchable in Admin → Site → Dictionary visibility.
--   site_settings.dictionary = {"preview": true | false}
--   preview = true  : drafts and words awaiting review are visible too (useful while the site is being built)
--   preview = false : only "verified" and "published" words are public — use this at launch
-- "imported" and "rejected" words are never public. Staff always see everything.

insert into public.site_settings (key, value)
values ('dictionary', '{"preview": true}')
on conflict (key) do nothing;

alter table public.site_settings drop constraint if exists dictionary_shape;
alter table public.site_settings add constraint dictionary_shape check (
  key <> 'dictionary' or jsonb_typeof(value -> 'preview') = 'boolean'
);

create or replace function public.dict_is_public(s public.dict_status) returns boolean
language sql stable
set search_path = public, extensions
as $$
  select s in ('verified', 'published')
      or (s in ('draft', 'pending_review')
          and coalesce((select (value ->> 'preview')::boolean from public.site_settings where key = 'dictionary'), false));
$$;
