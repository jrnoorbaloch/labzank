-- Hero slides: heading and description are optional, so an image alone makes a slide.
alter table public.hero_slides alter column heading drop not null;
alter table public.hero_slides drop constraint if exists hero_slides_heading_check;
alter table public.hero_slides add constraint hero_slides_heading_check
  check (heading is null or jsonb_typeof(heading) = 'object');
alter table public.hero_slides drop constraint if exists hero_slides_description_check;
alter table public.hero_slides add constraint hero_slides_description_check
  check (description is null or jsonb_typeof(description) = 'object');
