"use client";

import { useState } from "react";
import { Layers, LocateFixed, LocateOff, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  MAP_STYLE_IDS,
  MAP_STYLE_LABELS,
  placesToggleSupported,
  type MapStyleId,
} from "@/lib/map-style";

const fabClass =
  "grid size-11 place-items-center rounded-full border border-edge bg-surface/95 shadow-lg backdrop-blur transition hover:bg-surface-2 active:scale-95";

interface MapControlsProps {
  styleId: MapStyleId;
  showPlaces: boolean;
  geoActive: boolean;
  onStyleChange: (id: MapStyleId) => void;
  onShowPlacesChange: (show: boolean) => void;
  onLocate: () => void;
  onLocateOff: () => void;
}

export function MapControls({
  styleId,
  showPlaces,
  geoActive,
  onStyleChange,
  onShowPlacesChange,
  onLocate,
  onLocateOff,
}: MapControlsProps) {
  const [layersOpen, setLayersOpen] = useState(false);
  const router = useRouter();

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="pointer-events-none absolute inset-y-0 right-3 z-10 flex flex-col items-end justify-between py-20">
      <button
        type="button"
        aria-label="Sign out"
        onClick={signOut}
        className={`${fabClass} pointer-events-auto`}
      >
        <LogOut className="size-4.5 text-muted" />
      </button>

      <div className="pointer-events-auto flex flex-col items-end gap-2.5">
        {layersOpen && (
          <div className="flex w-44 flex-col overflow-hidden rounded-2xl border border-edge bg-surface/95 shadow-lg backdrop-blur">
            {MAP_STYLE_IDS.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  onStyleChange(id);
                  setLayersOpen(false);
                }}
                className={`px-4 py-2.5 text-left text-sm transition hover:bg-surface-2 ${
                  id === styleId ? "font-semibold text-accent" : ""
                }`}
              >
                {MAP_STYLE_LABELS[id]}
              </button>
            ))}
            <div className="border-t border-edge px-4 py-2.5">
              <label className="flex items-center justify-between gap-2 text-sm">
                <span
                  className={
                    placesToggleSupported(styleId) ? "" : "text-muted"
                  }
                >
                  Show places
                </span>
                <input
                  type="checkbox"
                  checked={showPlaces}
                  disabled={!placesToggleSupported(styleId)}
                  onChange={(e) => onShowPlacesChange(e.target.checked)}
                  className="size-4 accent-(--accent)"
                />
              </label>
              {!placesToggleSupported(styleId) && (
                <p className="mt-1 text-[11px] leading-tight text-muted">
                  Always shown on Satellite
                </p>
              )}
            </div>
            {geoActive && (
              <button
                type="button"
                onClick={() => {
                  onLocateOff();
                  setLayersOpen(false);
                }}
                className="flex items-center gap-2 border-t border-edge px-4 py-2.5 text-left text-sm transition hover:bg-surface-2"
              >
                <LocateOff className="size-4 text-muted" /> Turn off location
              </button>
            )}
          </div>
        )}
        <button
          type="button"
          aria-label="Map style"
          onClick={() => setLayersOpen((v) => !v)}
          className={fabClass}
        >
          <Layers className="size-4.5" />
        </button>
        <button
          type="button"
          aria-label="My location"
          onClick={onLocate}
          className={fabClass}
        >
          <LocateFixed
            className={`size-4.5 ${geoActive ? "text-sky-500" : ""}`}
          />
        </button>
      </div>
    </div>
  );
}
