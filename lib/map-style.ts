import type { StyleSpecification } from "maplibre-gl";

export const MAP_STYLE_IDS = ["streets", "dark", "satellite"] as const;
export type MapStyleId = (typeof MAP_STYLE_IDS)[number];

// Esri World Imagery + reference labels (hybrid) — free to use with attribution.
const SATELLITE_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    esri: {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      maxzoom: 19,
      attribution:
        "Powered by <a href='https://www.esri.com'>Esri</a> — Source: Esri, Maxar, Earthstar Geographics",
    },
    "esri-labels": {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      maxzoom: 19,
    },
  },
  layers: [
    { id: "esri", type: "raster", source: "esri" },
    { id: "esri-labels", type: "raster", source: "esri-labels" },
  ],
};

// Vector styles are free, no-key hosted styles (OpenFreeMap / Carto).
export const MAP_STYLES: Record<MapStyleId, string | StyleSpecification> = {
  streets: "https://tiles.openfreemap.org/styles/liberty",
  dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  satellite: SATELLITE_STYLE,
};

export const MAP_STYLE_LABELS: Record<MapStyleId, string> = {
  streets: "Streets",
  dark: "Dark",
  satellite: "Satellite",
};

/** The "Show places" POI toggle only affects vector styles — satellite
 *  labels are baked into raster tiles, mirroring the original app. */
export function placesToggleSupported(id: MapStyleId): boolean {
  return id !== "satellite";
}

export function isMapStyleId(value: string | null): value is MapStyleId {
  return (MAP_STYLE_IDS as readonly string[]).includes(value ?? "");
}

/** Default map style follows the system theme until the user picks one. */
export function defaultMapStyle(): MapStyleId {
  if (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    return "dark";
  }
  return "streets";
}

export const STORAGE_KEYS = {
  mapStyle: "been:map-style",
  camera: "been:camera",
  geoOn: "been:geo-on",
  showPlaces: "been:show-places",
  nudgePrefix: "been:nudged:",
} as const;
