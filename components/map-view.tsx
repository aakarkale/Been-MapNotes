"use client";

import {
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
import { MAP_STYLES, STORAGE_KEYS, type MapStyleId } from "@/lib/map-style";
import { NOTE_COLOR_HEX, type LatLng, type Note } from "@/lib/types";

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

export function MapView({
  ref,
  notes,
  selectedId,
  draft,
  position,
  styleId,
  onMapClick,
  onMarkerClick,
  onDraftMove,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const styleRef = useRef<MapStyleId>(styleId);

  // Keep latest callbacks without re-binding map listeners.
  const onMapClickRef = useRef(onMapClick);
  onMapClickRef.current = onMapClick;

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
            <MapMarker key={note.id} map={map} lat={note.lat} lng={note.lng}>
              <button
                type="button"
                aria-label={note.title || "Saved place"}
                className={`note-pin ${selectedId === note.id ? "is-selected" : ""}`}
                style={{ background: NOTE_COLOR_HEX[note.color] ?? NOTE_COLOR_HEX.coral }}
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkerClick(note);
                }}
              >
                <span>{note.emoji}</span>
              </button>
            </MapMarker>
          ))}
          {draft && (
            <MapMarker
              map={map}
              lat={draft.lat}
              lng={draft.lng}
              draggable
              onDragEnd={onDraftMove}
            >
              <div className="note-pin is-draft bg-accent">
                <span>📍</span>
              </div>
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
function MapMarker({
  map,
  lat,
  lng,
  anchor = "bottom",
  draggable = false,
  onDragEnd,
  children,
}: MapMarkerProps) {
  const [container] = useState(() => document.createElement("div"));
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
