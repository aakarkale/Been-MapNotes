"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { STORAGE_KEYS } from "@/lib/map-style";
import type { LatLng } from "@/lib/types";

export function useGeolocation() {
  const [position, setPosition] = useState<LatLng | null>(null);
  const [active, setActive] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setActive(false);
    try {
      localStorage.removeItem(STORAGE_KEYS.geoOn);
    } catch {}
  }, []);

  const start = useCallback(() => {
    if (!("geolocation" in navigator)) {
      toast.error("Location isn't available in this browser.");
      return;
    }
    if (watchIdRef.current !== null) return;
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setActive(true);
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        try {
          localStorage.setItem(STORAGE_KEYS.geoOn, "1");
        } catch {}
      },
      (err) => {
        stop();
        if (err.code === err.PERMISSION_DENIED) {
          toast.error("Location permission denied.");
        }
      },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 20_000 },
    );
  }, [stop]);

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
