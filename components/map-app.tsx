"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { List } from "lucide-react";
import { MapControls } from "@/components/map-controls";
import { NoteList } from "@/components/note-list";
import { NoteSheet, type Draft } from "@/components/note-sheet";
import { SearchBar } from "@/components/search-bar";
import type { MapViewHandle } from "@/components/map-view";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useNearbyNudges } from "@/hooks/use-nearby-nudges";
import { useNotes, type NewNote } from "@/hooks/use-notes";
import { reverseGeocode } from "@/lib/geocode";
import { STORAGE_KEYS, type MapStyleId } from "@/lib/map-style";
import type { LatLng, Note } from "@/lib/types";
import type { PlaceResult } from "@/lib/geocode";

const MapView = dynamic(
  () => import("@/components/map-view").then((m) => m.MapView),
  { ssr: false },
);

interface MapAppProps {
  initialNotes: Note[];
  userId: string;
}

export function MapApp({ initialNotes, userId }: MapAppProps) {
  const { notes, createNote, updateNote, deleteNote } = useNotes(initialNotes);
  const geo = useGeolocation();
  const mapRef = useRef<MapViewHandle>(null);
  const pendingLocateRef = useRef(false);

  const [styleId, setStyleId] = useState<MapStyleId>("streets");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [listOpen, setListOpen] = useState(false);

  const selectedNote = notes.find((n) => n.id === selectedId) ?? null;
  const sheetOpen = Boolean(selectedNote || draft);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.mapStyle) as MapStyleId;
      if (saved === "streets" || saved === "dark" || saved === "satellite") {
        setStyleId(saved);
      }
    } catch {}
  }, []);

  function changeStyle(id: MapStyleId) {
    setStyleId(id);
    try {
      localStorage.setItem(STORAGE_KEYS.mapStyle, id);
    } catch {}
  }

  const startDraftAt = useCallback((point: LatLng, address: string | null) => {
    setSelectedId(null);
    setDraft({ lat: point.lat, lng: point.lng, address });
    if (address === null) {
      void reverseGeocode(point).then((resolved) => {
        if (!resolved) return;
        setDraft((current) =>
          current && current.lat === point.lat && current.lng === point.lng
            ? { ...current, address: resolved }
            : current,
        );
      });
    }
  }, []);

  const handleMapClick = useCallback(
    (point: LatLng) => {
      if (sheetOpen) {
        // A tap on the map while a sheet is open just dismisses it.
        setSelectedId(null);
        setDraft(null);
        return;
      }
      startDraftAt(point, null);
    },
    [sheetOpen, startDraftAt],
  );

  const handleMarkerClick = useCallback((note: Note) => {
    setDraft(null);
    setSelectedId(note.id);
  }, []);

  const handleSearchSelect = useCallback(
    (place: PlaceResult) => {
      mapRef.current?.flyTo({ lat: place.lat, lng: place.lng }, 16);
      startDraftAt(
        { lat: place.lat, lng: place.lng },
        [place.label, place.detail].filter(Boolean).join(", "),
      );
    },
    [startDraftAt],
  );

  const handleLocate = useCallback(() => {
    if (geo.position) {
      mapRef.current?.flyTo(geo.position, 15);
    } else {
      pendingLocateRef.current = true;
      geo.start();
    }
  }, [geo]);

  useEffect(() => {
    if (geo.position && pendingLocateRef.current) {
      pendingLocateRef.current = false;
      mapRef.current?.flyTo(geo.position, 15);
    }
  }, [geo.position]);

  const openNote = useCallback((note: Note) => {
    setListOpen(false);
    setDraft(null);
    setSelectedId(note.id);
    mapRef.current?.flyTo({ lat: note.lat, lng: note.lng }, 16);
  }, []);

  useNearbyNudges(notes, geo.position, openNote);

  const handleCreate = useCallback(
    async (fields: NewNote) => {
      const note = await createNote(fields);
      if (note) {
        setDraft(null);
        setSelectedId(note.id);
      }
      return note;
    },
    [createNote],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      const ok = await deleteNote(id);
      if (ok) setSelectedId(null);
      return ok;
    },
    [deleteNote],
  );

  const closeSheet = useCallback(() => {
    setSelectedId(null);
    setDraft(null);
  }, []);

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-background">
      <MapView
        ref={mapRef}
        notes={notes}
        selectedId={selectedId}
        draft={draft}
        position={geo.position}
        styleId={styleId}
        onMapClick={handleMapClick}
        onMarkerClick={handleMarkerClick}
        onDraftMove={(point) => startDraftAt(point, null)}
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 p-3 pt-[max(env(safe-area-inset-top),0.75rem)]">
        <div className="pointer-events-auto mx-auto max-w-lg pr-14">
          <SearchBar near={geo.position} onSelect={handleSearchSelect} />
        </div>
      </div>

      <MapControls
        styleId={styleId}
        geoActive={geo.active}
        onStyleChange={changeStyle}
        onLocate={handleLocate}
      />

      <button
        type="button"
        onClick={() => setListOpen(true)}
        className="absolute bottom-[max(env(safe-area-inset-bottom),1rem)] left-3 z-10 flex items-center gap-2 rounded-full border border-edge bg-surface/95 px-4 py-2.5 text-sm font-medium shadow-lg backdrop-blur transition hover:bg-surface-2 active:scale-95"
      >
        <List className="size-4" />
        Places
        <span className="rounded-full bg-accent/15 px-1.5 text-xs font-semibold text-accent">
          {notes.length}
        </span>
      </button>

      <NoteList
        open={listOpen}
        notes={notes}
        position={geo.position}
        onClose={() => setListOpen(false)}
        onSelect={openNote}
      />

      {sheetOpen && (
        <NoteSheet
          key={selectedNote?.id ?? "draft"}
          userId={userId}
          note={selectedNote}
          draft={draft}
          onClose={closeSheet}
          onCreate={handleCreate}
          onUpdate={updateNote}
          onDelete={handleDelete}
        />
      )}
    </main>
  );
}
