# Been

Been is a mobile-first map app for saving the places that matter — drop notes and reminders on locations and get gently nudged when you're nearby.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

_Populate as you build — short repo map plus pointers to the source-of-truth file for DB schema, API contracts, theme files, etc._

## Architecture decisions

_Populate as you build — non-obvious choices a reader couldn't infer from the code (3-5 bullets)._

## Product

_Describe the high-level user-facing capabilities of this app once they exist._

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- **The main map (`map-experience.tsx`) is a RASTER map with NO `mapId`.** This is
  deliberate: a cloud `mapId` makes the Maps JS API ignore runtime `styles`, which
  broke the "Show places" toggle and dark mode. Dropping `mapId` means JSON `styles`
  ARE honored, so both the POI toggle and dark mode are driven entirely by runtime
  `styles` (`POI_HIDE_STYLES` for hiding places, a night-style array for dark mode) —
  **zero Google Cloud Console setup required.** Do not re-add a `mapId` here.
  - Because there is no `mapId`, `<AdvancedMarker>` is unavailable. Custom React
    markers are rendered via `OverlayMarker` (`src/components/overlay-marker.tsx`), a
    `google.maps.OverlayView` + `createPortal` component. Add new markers through it,
    not `AdvancedMarker`.
  - Caveat: `styles` only affect the `roadmap`/`terrain` base map. They do NOT alter
    `satellite`/`hybrid` imagery (labels are baked into those tiles), so the "Show
    places" toggle is **disabled** on satellite/hybrid (`placesToggleSupported`) with
    a "Always shown on Satellite & Hybrid" note, to avoid it looking broken there.
  - `@types/google.maps` is a direct devDependency and `"google.maps"` is in the
    tsconfig `types` array (the explicit `types` list otherwise excludes it), so the
    global `google.*` namespace resolves in `overlay-marker.tsx`/`map-experience.tsx`.
  - `src/pages/shared-note.tsx` is a separate read-only view that still uses
    `<AdvancedMarker>` + a `mapId` — that's fine, it has no style/POI toggle.
- Map type/places/view preferences persist in `localStorage` (`map-notes-maptype-v1`,
  `map-notes-places-v1`).
- The Google Maps API key is referrer-restricted, so map tiles do not render on
  `localhost` (expect `RefererNotAllowedMapError` in dev) — verify map visuals on the
  deployed/preview domain, not screenshots of the local dev server.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
