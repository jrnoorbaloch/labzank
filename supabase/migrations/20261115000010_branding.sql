-- Site name and logo, edited in Admin → Site → Branding.
--   site_settings.branding = {"name": "Labzaank", "logo_path": "site/…png" | null, "logo_dark_path": "site/…png" | null}
--   logo_path      : shown in the navigation bar and admin (light background)
--   logo_dark_path : shown in the footer (dark background); falls back to the site name in gold
-- Logos live in the public "images" storage bucket; only admins can change this setting.

insert into public.site_settings (key, value)
values ('branding', '{"name": "Labzaank", "logo_path": null, "logo_dark_path": null}')
on conflict (key) do nothing;

alter table public.site_settings drop constraint if exists branding_shape;
alter table public.site_settings add constraint branding_shape check (
  key <> 'branding' or (
    jsonb_typeof(value -> 'name') = 'string'
    and length(btrim(value ->> 'name')) between 1 and 60
    and (value -> 'logo_path' is null or jsonb_typeof(value -> 'logo_path') in ('string', 'null'))
    and (value -> 'logo_dark_path' is null or jsonb_typeof(value -> 'logo_dark_path') in ('string', 'null'))
  )
);
