-- Media uploads for the Literature CMS (Supabase Storage).
--   images  (public)  : poet portraits, book covers           ≤ 5 MB, jpeg/png/webp/avif
--   audio   (public)  : recitations for audio_items / poems   ≤ 50 MB
--   books   (private) : PDFs. Readable only through a signed URL, and only when the
--                       book is published AND "can_download" is ticked (copyright gate).
-- Uploading, replacing and deleting is limited to content staff (admin / editor / super_admin).

do $$
begin
  if not exists (select 1 from pg_namespace where nspname = 'storage') then
    return;
  end if;

  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
    ('audio', 'audio', true, 52428800,
      array['audio/mpeg','audio/mp4','audio/aac','audio/ogg','audio/wav','audio/x-wav','audio/webm','audio/x-m4a'])
  on conflict (id) do update
    set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

  update storage.buckets set file_size_limit = 5242880,
         allowed_mime_types = array['image/jpeg','image/png','image/webp','image/avif']
   where id = 'images';
  update storage.buckets set public = false, file_size_limit = 104857600, allowed_mime_types = array['application/pdf']
   where id = 'books';

  drop policy if exists "content staff read media"   on storage.objects;
  drop policy if exists "content staff upload media" on storage.objects;
  drop policy if exists "content staff update media" on storage.objects;
  drop policy if exists "content staff delete media" on storage.objects;
  drop policy if exists "public reads downloadable book pdfs" on storage.objects;

  create policy "content staff read media" on storage.objects for select to authenticated
    using (bucket_id in ('images','audio','books') and (select public.content_is_staff()));
  create policy "content staff upload media" on storage.objects for insert to authenticated
    with check (bucket_id in ('images','audio','books') and (select public.content_is_staff()));
  create policy "content staff update media" on storage.objects for update to authenticated
    using (bucket_id in ('images','audio','books') and (select public.content_is_staff()))
    with check (bucket_id in ('images','audio','books') and (select public.content_is_staff()));
  create policy "content staff delete media" on storage.objects for delete to authenticated
    using (bucket_id in ('images','audio','books') and (select public.content_is_staff()));

  -- signed-URL creation needs SELECT on the object: allow it only for permitted downloads
  create policy "public reads downloadable book pdfs" on storage.objects for select to anon, authenticated
    using (bucket_id = 'books' and exists (
      select 1 from public.books b
       where b.pdf_path = storage.objects.name and b.can_download and b.status = 'published'));
end $$;
