-- Been: map notes schema
create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null default '',
  body text not null default '',
  emoji text not null default '📍',
  color text not null default 'coral'
    check (color in ('coral','amber','mint','sky','violet','rose')),
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  address text,
  remind_enabled boolean not null default false,
  remind_radius_m integer not null default 250
    check (remind_radius_m between 50 and 5000),
  share_token uuid unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index notes_user_id_idx on public.notes (user_id);
create index notes_share_token_idx on public.notes (share_token) where share_token is not null;

alter table public.notes enable row level security;

create policy "notes_select_own" on public.notes
  for select using (auth.uid() = user_id);
create policy "notes_insert_own" on public.notes
  for insert with check (auth.uid() = user_id);
create policy "notes_update_own" on public.notes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "notes_delete_own" on public.notes
  for delete using (auth.uid() = user_id);

create table public.note_photos (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create index note_photos_note_id_idx on public.note_photos (note_id);

alter table public.note_photos enable row level security;

create policy "note_photos_select_own" on public.note_photos
  for select using (auth.uid() = user_id);
create policy "note_photos_insert_own" on public.note_photos
  for insert with check (auth.uid() = user_id);
create policy "note_photos_delete_own" on public.note_photos
  for delete using (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger notes_set_updated_at
  before update on public.notes
  for each row execute function public.set_updated_at();

-- Public read of a single note via its unguessable share token.
create or replace function public.get_shared_note(token uuid)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'id', n.id,
    'title', n.title,
    'body', n.body,
    'emoji', n.emoji,
    'color', n.color,
    'lat', n.lat,
    'lng', n.lng,
    'address', n.address,
    'created_at', n.created_at,
    'photos', coalesce(
      (select json_agg(p.storage_path order by p.created_at)
         from public.note_photos p where p.note_id = n.id),
      '[]'::json
    )
  )
  from public.notes n
  where n.share_token = token;
$$;

revoke all on function public.get_shared_note(uuid) from public;
grant execute on function public.get_shared_note(uuid) to anon, authenticated;

-- Photo storage: public-read bucket, owner-scoped writes under <uid>/ prefix.
insert into storage.buckets (id, name, public)
values ('note-photos', 'note-photos', true);

create policy "note_photos_storage_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'note-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "note_photos_storage_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'note-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
