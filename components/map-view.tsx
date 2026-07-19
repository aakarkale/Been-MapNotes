"use client";

import {
  memo,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from "react";
import { createPortal } from "react-dom";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { NotePin } from "@/components/note-pin";
import {
  MAP_STYLES,
  STORAGE_KEYS,
  placesToggleSupported,
  type MapStyleId,
} from "@/lib/map-style";
import type { LatLng, Note } from "@/lib/types";

export interface MapViewHandle {
  flyTo: (center: LatLng, zoom?: number) => void;
}

interface MapViewProps {
  ref?: Ref<MapViewHandle>;
  notes: Note[];
  selectedId: string | null;
  draft: LatLng | null;
  position: LatLng | null;
  styleId: MapStyleId;
  showPlaces: boolean;
  onMapClick: (point: LatLng) => void;
  onMarkerClick: (note: Note) => void;
  onDraftMove: (point: LatLng) => void;
}

interface CameraState {
  center: [number, number];
  zoom: number;
}

function loadCamera(): CameraState {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.camera);
    if (raw) {
      const saved = JSON.parse(raw) as CameraState;
      if (Array.isArray(saved.center) && typeof saved.zoom === "number") {
        return saved;
      }
    }
  } catch {}
  return { center: [0, 24], zoom: 1.6 };
}

/** Hide/show the basemap's own POI labels on vector styles. */
function applyPlacesVisibility(map: maplibregl.Map, show: boolean) {
  for (const layer of map.getStyle()?.layers ?? []) {
    const sourceLayer = "source-layer" in layer ? layer["source-layer"] : "";
    if (/poi/i.test(layer.id) || /poi/i.test(sourceLayer ?? "")) {
      map.setLayoutProperty(layer.id, "visibility", show ? "visible" : "none");
    }
  }
}

export function MapView({
  ref,
  notes,
  selectedId,
  draft,
  position,
  styleId,
  showPlaces,
  onMapClick,
  onMarkerClick,
  onDraftMove,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const styleRef = useRef<MapStyleId>(styleId);

  // Latest values for map-owned listeners, without re-binding them.
  const onMapClickRef = useRef(onMapClick);
  onMapClickRef.current = onMapClick;
  const showPlacesRef = useRef(showPlaces);
  showPlacesRef.current = showPlaces;

  useEffect(() => {
    if (!containerRef.current) return;
    const camera = loadCamera();
    const instance = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLES[styleRef.current],
      center: camera.center,
      zoom: camera.zoom,
      attributionControl: { compact: true },
    });

    instance.on("click", (e) => {
      // MapLibre's click listener lives on the canvas container, which also
      // contains marker elements — React-level stopPropagation runs too late
      // to help, so filter marker taps out here.
      const target = e.originalEvent.target as HTMLElement | null;
      if (target?.closest("[data-been-marker]")) return;
      onMapClickRef.current({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    });

    instance.on("moveend", () => {
      try {
        const center = instance.getCenter();
        localStorage.setItem(
          STORAGE_KEYS.camera,
          JSON.stringify({
            center: [center.lng, center.lat],
            zoom: instance.getZoom(),
          }),
        );
      } catch {}
    });

    // Re-apply the POI preference whenever a style finishes loading
    // (initial load and every setStyle swap).
    instance.on("styledata", () => {
      if (placesToggleSupported(styleRef.current)) {
        applyPlacesVisibility(instance, showPlacesRef.current);
      }
    });

    setMap(instance);
    return () => {
      instance.remove();
      setMap(null);
    };
  }, []);

  // Swap basemap style when the user changes it.
  useEffect(() => {
    if (!map || styleRef.current === styleId) return;
    styleRef.current = styleId;
    map.setStyle(MAP_STYLES[styleId]);
  }, [map, styleId]);

  // Toggle POI labels in place.
  useEffect(() => {
    if (map?.isStyleLoaded() && placesToggleSupported(styleId)) {
      applyPlacesVisibility(map, showPlaces);
    }
  }, [map, showPlaces, styleId]);

  useImperativeHandle(ref, () => ({
    flyTo: (center, zoom) => {
      map?.flyTo({
        center: [center.lng, center.lat],
        zoom: zoom ?? Math.max(map.getZoom(), 15),
        duration: 1200,
        essential: true,
      });
    },
  }), [map]);

  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="size-full" />
      {map && (
        <>
          {notes.map((note) => (
            <NoteMarker
              key={note.id}
              map={map}
              note={note}
              selected={selectedId === note.id}
              onClick={onMarkerClick}
            />
          ))}
          {draft && (
            <MapMarker
              map={map}
              lat={draft.lat}
              lng={draft.lng}
              draggable
              onDragEnd={onDraftMove}
            >
              <NotePin emoji="📍" color="coral" draft />
            </MapMarker>
          )}
          {position && (
            <MapMarker map={map} lat={position.lat} lng={position.lng} anchor="center">
              <div className="here-dot" />
            </MapMarker>
          )}
        </>
      )}
    </div>
  );
}

interface NoteMarkerProps {
  map: maplibregl.Map;
  note: Note;
  selected: boolean;
  onClick: (note: Note) => void;
}

// Memoized so a position tick or draft move doesn't reconcile every pin.
const NoteMarker = memo(function NoteMarker({
  map,
  note,
  selected,
  onClick,
}: NoteMarkerProps) {
  return (
    <MapMarker map={map} lat={note.lat} lng={note.lng}>
      <NotePin
        emoji={note.emoji}
        color={note.color}
        selected={selected}
        label={note.title || "Saved place"}
        onClick={() => onClick(note)}
      />
    </MapMarker>
  );
});

interface MapMarkerProps {
  map: maplibregl.Map;
  lat: number;
  lng: number;
  anchor?: "bottom" | "center";
  draggable?: boolean;
  onDragEnd?: (point: LatLng) => void;
  children: ReactNode;
}

/** Renders React children as a MapLibre HTML marker via a portal. */
export function MapMarker({
  map,
  lat,
  lng,
  anchor = "bottom",
  draggable = false,
  onDragEnd,
  children,
}: MapMarkerProps) {
  const [container] = useState(() => {
    const el = document.createElement("div");
    el.dataset.beenMarker = "1";
    return el;
  });
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const onDragEndRef = useRef(onDragEnd);
  onDragEndRef.current = onDragEnd;

  useEffect(() => {
    const marker = new maplibregl.Marker({ element: container, anchor, draggable })
      .setLngLat([lng, lat])
      .addTo(map);
    if (draggable) {
      marker.on("dragend", () => {
        const pos = marker.getLngLat();
        onDragEndRef.current?.({ lat: pos.lat, lng: pos.lng });
      });
    }
    markerRef.current = marker;
    return () => {
      marker.remove();
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, container, anchor, draggable]);

  useEffect(() => {
    markerRef.current?.setLngLat([lng, lat]);
  }, [lat, lng]);

  return createPortal(children, container);
}
