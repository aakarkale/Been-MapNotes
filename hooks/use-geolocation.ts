"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { STORAGE_KEYS } from "@/lib/map-style";
import { distanceMeters } from "@/lib/geo";
import type { LatLng } from "@/lib/types";

// Ignore fixes that moved less than this — every skipped update saves a
// full re-render of the map tree on phones that tick once a second.
const MIN_MOVE_M = 10;

export function useGeolocation() {
  const [position, setPosition] = useState<LatLng | null>(null);
  const [active, setActive] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const lastRef = useRef<LatLng | null>(null);
  const onFirstFixRef = useRef<((pos: LatLng) => void) | null>(null);

  const stop = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    onFirstFixRef.current = null;
    setActive(false);
    try {
      localStorage.removeItem(STORAGE_KEYS.geoOn);
    } catch {}
  }, []);

  /** Start (or keep) watching. `onFirstFix` fires once on the next fix. */
  const start = useCallback(
    (onFirstFix?: (pos: LatLng) => void) => {
      if (!("geolocation" in navigator)) {
        toast.error("Location isn't available in this browser.");
        return;
      }
      if (onFirstFix) {
        if (lastRef.current) onFirstFix(lastRef.current);
        else onFirstFixRef.current = onFirstFix;
      }
      if (watchIdRef.current !== null) return;
      try {
        localStorage.setItem(STORAGE_KEYS.geoOn, "1");
      } catch {}
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setActive(true);
          const first = onFirstFixRef.current;
          if (first) {
            onFirstFixRef.current = null;
            first(next);
          }
          if (
            lastRef.current &&
            distanceMeters(lastRef.current, next) < MIN_MOVE_M
          ) {
            return;
          }
          lastRef.current = next;
          setPosition(next);
        },
        (err) => {
          // Transient errors (timeout, no signal) keep the watch alive —
          // only a permission denial should shut it down.
          if (err.code === err.PERMISSION_DENIED) {
            stop();
            toast.error("Location permission denied.");
          }
        },
        { enableHighAccuracy: true, maximumAge: 10_000, timeout: 20_000 },
      );
    },
    [stop],
  );

  // Resume watching if the user had it on last visit.
  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEYS.geoOn) === "1") start();
    } catch {}
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [start]);

  return { position, active, start, stop };
}
