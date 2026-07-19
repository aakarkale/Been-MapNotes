-- The shared-photo storage policy subquery ran under the caller's RLS, where
-- anon sees no rows in notes/note_photos — so it never matched. Check
-- shared-ness via a security-definer helper instead.
create or replace function public.is_photo_shared(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from note_photos p
    join notes n on n.id = p.note_id
    where p.storage_path = object_name and n.share_token is not null
  );
$$;

revoke all on function public.is_photo_shared(text) from public;
grant execute on function public.is_photo_shared(text) to anon, authenticated;

drop policy "note_photos_storage_select_shared" on storage.objects;
create policy "note_photos_storage_select_shared" on storage.objects
  for select to anon, authenticated
  using (
    bucket_id = 'note-photos'
    and public.is_photo_shared(name)
  );
