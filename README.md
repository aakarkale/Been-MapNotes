# Been — notes on a map

Been is a mobile-first map app for saving the places that matter: drop notes
and reminders on locations and get gently nudged when you're nearby.

This is the Vercel + Supabase re-architecture of the original Replit build —
one lean Next.js app instead of a pnpm monorepo with a separate Express API.

## Features

- 🗺️ Full-screen MapLibre map — Streets / Dark / Satellite styles, no API key
  or billing account required (OpenFreeMap, Carto, Esri tiles)
- 📍 Tap anywhere (or drag the pin) to drop a note: emoji, color, title, text
- 🔎 Place search with autocomplete + reverse geocoding (Photon / OpenStreetMap)
- 🔔 "Nudge me when I'm nearby" — geofenced reminders via the browser's
  geolocation, with toasts and system notifications and a 30-min cooldown
- 📷 Photo attachments (Supabase Storage)
- 🔗 Public share links (`/s/<token>`) with a read-only card + mini map
- 💾 Map style and camera persist in `localStorage`

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js (App Router) + React 19 + TypeScript |
| Styling | Tailwind CSS 4 |
| Map | MapLibre GL JS (free vector/raster tiles, no key) |
| Geocoding | Photon (komoot) — free, no key |
| Auth | Supabase Auth (`@supabase/ssr`, cookie sessions) |
| Database | Supabase Postgres with Row Level Security |
| Files | Supabase Storage (public-read bucket, owner-scoped writes) |
| Hosting | Vercel |

No Express server, no ORM, no codegen: the browser talks to Supabase directly
and RLS enforces access. The schema lives in `supabase/migrations/`.

## Local development

```bash
pnpm install
cp .env.example .env.local   # fill in your Supabase URL + publishable key
pnpm dev
```

## Supabase setup

1. Create a project and run `supabase/migrations/0001_create_notes_schema.sql`
   (SQL editor or `supabase db push`).
2. In **Auth → URL Configuration**, set the Site URL to your deployed domain
   and add `https://<your-domain>/auth/callback` to the redirect allowlist —
   otherwise magic-link/confirmation emails redirect to `localhost:3000`.
3. (Optional) Disable **Confirm email** for instant password signups.

## Deploying to Vercel

Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
in the Vercel project settings and deploy. The publishable key is safe to
expose; everything sensitive is enforced by RLS.
