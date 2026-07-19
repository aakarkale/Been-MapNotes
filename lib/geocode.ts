import type { LatLng } from "@/lib/types";

// Free, no-key geocoding by Komoot's Photon (OpenStreetMap data).
const PHOTON_BASE = "https://photon.komoot.io";

export interface PlaceResult {
  label: string;
  detail: string;
  lat: number;
  lng: number;
}

/** Canonical one-line address for a place — used for every notes.address write. */
export function formatPlace(place: Pick<PlaceResult, "label" | "detail">): string {
  return place.detail ? `${place.label}, ${place.detail}` : place.label;
}

interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: {
    name?: string;
    housenumber?: string;
    street?: string;
    district?: string;
    city?: string;
    state?: string;
    country?: string;
    osm_key?: string;
  };
}

function featureLabel(p: PhotonFeature["properties"]): {
  label: string;
  detail: string;
} {
  const street = [p.street, p.housenumber].filter(Boolean).join(" ");
  const label = p.name || street || p.city || p.country || "Unknown place";
  const detail = [street !== label ? street : null, p.district, p.city, p.state, p.country]
    .filter((part): part is string => Boolean(part) && part !== label)
    .filter((part, i, arr) => arr.indexOf(part) === i)
    .join(", ");
  return { label, detail };
}

export async function searchPlaces(
  query: string,
  near?: LatLng,
  signal?: AbortSignal,
): Promise<PlaceResult[]> {
  const url = new URL(`${PHOTON_BASE}/api/`);
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "6");
  if (near) {
    url.searchParams.set("lat", near.lat.toFixed(4));
    url.searchParams.set("lon", near.lng.toFixed(4));
  }
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Search failed (${res.status})`);
  const data = (await res.json()) as { features: PhotonFeature[] };
  return data.features.map((f) => {
    const { label, detail } = featureLabel(f.properties);
    return {
      label,
      detail,
      lat: f.geometry.coordinates[1],
      lng: f.geometry.coordinates[0],
    };
  });
}

export async function reverseGeocode(point: LatLng): Promise<string | null> {
  try {
    const url = new URL(`${PHOTON_BASE}/reverse`);
    url.searchParams.set("lat", String(point.lat));
    url.searchParams.set("lon", String(point.lng));
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as { features: PhotonFeature[] };
    const props = data.features[0]?.properties;
    if (!props) return null;
    return formatPlace(featureLabel(props));
  } catch {
    return null;
  }
}
