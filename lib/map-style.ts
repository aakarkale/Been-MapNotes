import type { StyleSpecification } from "maplibre-gl";

export const MAP_STYLE_IDS = ["streets", "dark", "satellite"] as const;
export type MapStyleId = (typeof MAP_STYLE_IDS)[number];

// Esri World Imagery raster tiles — free to use with attribution.
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
  },
  layers: [{ id: "esri", type: "raster", source: "esri" }],
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

export const STORAGE_KEYS = {
  mapStyle: "been:map-style",
  camera: "been:camera",
  geoOn: "been:geo-on",
  nudgePrefix: "been:nudged:",
} as const;
