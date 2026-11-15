-- ═══════════════════════════════════════════════════════════════════════
-- Labzank · 0001 platform: profiles, roles, role checks
-- Supabase Auth owns users (auth.users); every user gets a profile row.
-- ═══════════════════════════════════════════════════════════════════════

create schema if not exists extensions;
create extension if not exists pg_trgm with schema extensions;

-- roles from the brief + the dictionary roles
create table public.roles (
  key  text primary key,
  name text not null
);
insert into public.roles (key, name) values
  ('super_admin',     'Super Admin'),
  ('admin',           'Admin'),
  ('editor',          'Editor'),
  ('author',          'Author'),
  ('contributor',     'Contributor'),
  ('visitor',         'Visitor'),
  ('dict_admin',      'Dictionary Administrator'),
  ('dict_linguist',   'Linguistic Editor'),
  ('dict_translator', 'Translator'),
  ('dict_reviewer',   'Reviewer');

create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  roles        text[] not null default array['visitor'],
  created_at   timestamptz not null default now()
);

-- new sign-ups become visitors; an admin promotes them
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- true when the signed-in user holds any of the given roles (super_admin holds all)
create or replace function public.has_role(wanted text[]) returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (p.roles && wanted or 'super_admin' = any(p.roles))
  );
$$;

alter table public.roles enable row level security;
alter table public.profiles enable row level security;

create policy "roles readable" on public.roles for select using (true);
create policy "own profile readable" on public.profiles for select using (id = auth.uid() or public.has_role(array['admin']));
create policy "admins manage profiles" on public.profiles for update using (public.has_role(array['admin'])) with check (public.has_role(array['admin']));

-- ── activity log (brief §15) ──
create table public.activity_logs (
  id         bigint generated always as identity primary key,
  actor      uuid references auth.users(id),
  action     text not null,
  entity     text not null,
  entity_id  text,
  detail     jsonb not null default '{}',
  created_at timestamptz not null default now()
);
alter table public.activity_logs enable row level security;
create policy "admins read logs" on public.activity_logs for select using (public.has_role(array['admin']));
