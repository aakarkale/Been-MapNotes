"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Search, X } from "lucide-react";
import { searchPlaces, type PlaceResult } from "@/lib/geocode";
import type { LatLng } from "@/lib/types";

interface SearchBarProps {
  near: LatLng | null;
  onSelect: (place: PlaceResult) => void;
}

export function SearchBar({ near, onSelect }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [open, setOpen] = useState(false);
  const nearRef = useRef(near);
  nearRef.current = near;

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const places = await searchPlaces(q, nearRef.current ?? undefined, controller.signal);
        setResults(places);
        setOpen(true);
      } catch {
        // aborted or offline — keep previous results
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return (
    <div className="relative w-full">
      <div className="flex items-center gap-2 rounded-full border border-edge bg-surface/95 px-4 py-2.5 shadow-lg backdrop-blur">
        <Search className="size-4 shrink-0 text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search places…"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
        />
        {query && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setQuery("");
              setResults([]);
              setOpen(false);
            }}
          >
            <X className="size-4 text-muted" />
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <ul className="absolute inset-x-0 top-full mt-2 overflow-hidden rounded-2xl border border-edge bg-surface shadow-xl">
          {results.map((place, i) => (
            <li key={`${place.lat}-${place.lng}-${i}`}>
              <button
                type="button"
                className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-surface-2"
                onClick={() => {
                  onSelect(place);
                  setQuery("");
                  setResults([]);
                  setOpen(false);
                }}
              >
                <MapPin className="mt-0.5 size-4 shrink-0 text-accent" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">
                    {place.label}
                  </span>
                  {place.detail && (
                    <span className="block truncate text-xs text-muted">
                      {place.detail}
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
