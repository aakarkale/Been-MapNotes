-- Harden photo storage and RLS.

-- 1. A user must own the parent note to attach photos to it — otherwise any
--    authenticated user could inject photos into a note whose id they learned
--    from a share link.
drop policy "note_photos_insert_own" on public.note_photos;
create policy "note_photos_insert_own" on public.note_photos
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.notes n
      where n.id = note_id and n.user_id = auth.uid()
    )
  );

-- 2. Make the bucket private. Photos are served via short-lived signed URLs,
--    so "Stop sharing" and note deletion actually revoke access to images.
update storage.buckets set public = false where id = 'note-photos';

-- 3. Storage SELECT policies. Without a SELECT policy, storage remove()
--    matches zero rows and silently deletes nothing. Owners can read their
--    own objects; anyone (incl. anon) can read objects belonging to a note
--    that is currently shared — which is what lets the share page mint
--    signed URLs.
create policy "note_photos_storage_select_own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'note-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "note_photos_storage_select_shared" on storage.objects
  for select to anon, authenticated
  using (
    bucket_id = 'note-photos'
    and exists (
      select 1
      from public.note_photos p
      join public.notes n on n.id = p.note_id
      where p.storage_path = name and n.share_token is not null
    )
  );

-- 4. Align the reminder radius bound with the UI (50–2000 m).
alter table public.notes drop constraint notes_remind_radius_m_check;
alter table public.notes add constraint notes_remind_radius_m_check
  check (remind_radius_m between 50 and 2000);
