"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapMarker } from "@/components/map-view";
import { NotePin } from "@/components/note-pin";
import { MAP_STYLES } from "@/lib/map-style";

interface SharedNoteMapProps {
  lat: number;
  lng: number;
  color: string;
  emoji: string;
}

/** Small read-only map for the public share page. */
export function SharedNoteMap({ lat, lng, color, emoji }: SharedNoteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const instance = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLES.streets,
      center: [lng, lat],
      zoom: 14.5,
      interactive: false,
      attributionControl: { compact: true },
    });
    setMap(instance);
    return () => {
      instance.remove();
      setMap(null);
    };
  }, [lat, lng]);

  return (
    <div ref={containerRef} className="size-full">
      {map && (
        <MapMarker map={map} lat={lat} lng={lng}>
          <NotePin emoji={emoji} color={color} />
        </MapMarker>
      )}
    </div>
  );
}
