-- Site-wide settings edited from the admin panel (Admin → Site → Languages).
-- languages = {"enabled": ["en","bal","ur"], "default": "en"}
--   enabled : interface languages shown in the navigation dropdown
--   default : language every new visit opens in

create table if not exists public.site_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid(),
  constraint languages_shape check (
    key <> 'languages' or (
      jsonb_typeof(value -> 'enabled') = 'array'
      and jsonb_array_length(value -> 'enabled') > 0
      and (value -> 'enabled') <@ '["bal","bal-latn","en","ur"]'::jsonb
      and (value -> 'enabled') ? (value ->> 'default')
    )
  )
);

alter table public.site_settings enable row level security;

drop policy if exists "public reads site settings" on public.site_settings;
drop policy if exists "admins insert site settings" on public.site_settings;
drop policy if exists "admins update site settings" on public.site_settings;
drop policy if exists "admins delete site settings" on public.site_settings;

create policy "public reads site settings" on public.site_settings for select to anon, authenticated using (true);
create policy "admins insert site settings" on public.site_settings for insert to authenticated
  with check ((select public.has_role(array['admin'])));
create policy "admins update site settings" on public.site_settings for update to authenticated
  using ((select public.has_role(array['admin']))) with check ((select public.has_role(array['admin'])));
create policy "admins delete site settings" on public.site_settings for delete to authenticated
  using ((select public.has_role(array['admin'])));

grant select on public.site_settings to anon, authenticated;
grant insert, update, delete on public.site_settings to authenticated;

insert into public.site_settings (key, value)
values ('languages', '{"enabled": ["en", "bal", "ur"], "default": "en"}')
on conflict (key) do nothing;
