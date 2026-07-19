"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
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

  useEffect(() => {
    if (!containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLES.streets,
      center: [lng, lat],
      zoom: 14.5,
      interactive: false,
      attributionControl: { compact: true },
    });

    const el = document.createElement("div");
    el.className = "note-pin";
    el.style.background = color;
    const span = document.createElement("span");
    span.textContent = emoji;
    el.appendChild(span);

    const marker = new maplibregl.Marker({ element: el, anchor: "bottom" })
      .setLngLat([lng, lat])
      .addTo(map);

    return () => {
      marker.remove();
      map.remove();
    };
  }, [lat, lng, color, emoji]);

  return <div ref={containerRef} className="size-full" />;
}
