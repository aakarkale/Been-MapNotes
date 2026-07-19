"use client";

import { Bell, ChevronRight, MapPinned, X } from "lucide-react";
import { distanceMeters, formatDistance } from "@/lib/geo";
import { NOTE_COLOR_HEX, type LatLng, type Note } from "@/lib/types";

interface NoteListProps {
  open: boolean;
  notes: Note[];
  position: LatLng | null;
  onClose: () => void;
  onSelect: (note: Note) => void;
}

export function NoteList({
  open,
  notes,
  position,
  onClose,
  onSelect,
}: NoteListProps) {
  if (!open) return null;

  const sorted = [...notes].sort((a, b) => {
    if (position) {
      return (
        distanceMeters(position, a) - distanceMeters(position, b)
      );
    }
    return b.updated_at.localeCompare(a.updated_at);
  });

  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Close list"
        className="flex-1 bg-black/25"
        onClick={onClose}
      />
      <div className="max-h-[70dvh] rounded-t-3xl border-t border-edge bg-surface pb-[max(env(safe-area-inset-bottom),1rem)] shadow-2xl">
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h2 className="text-lg font-semibold">
            Your places{" "}
            <span className="text-sm font-normal text-muted">
              ({notes.length})
            </span>
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-full bg-surface-2"
          >
            <X className="size-4" />
          </button>
        </div>

        {sorted.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-10 text-center text-muted">
            <MapPinned className="size-8" />
            <p className="text-sm">
              No places yet — tap anywhere on the map to drop your first note.
            </p>
          </div>
        ) : (
          <ul className="overflow-y-auto px-2" style={{ maxHeight: "55dvh" }}>
            {sorted.map((note) => (
              <li key={note.id}>
                <button
                  type="button"
                  onClick={() => onSelect(note)}
                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-surface-2"
                >
                  <span
                    className="grid size-10 shrink-0 place-items-center rounded-full text-lg"
                    style={{
                      background: `${NOTE_COLOR_HEX[note.color] ?? NOTE_COLOR_HEX.coral}26`,
                    }}
                  >
                    {note.emoji}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 truncate text-sm font-medium">
                      {note.title || "Untitled place"}
                      {note.remind_enabled && (
                        <Bell className="size-3.5 shrink-0 text-accent" />
                      )}
                    </span>
                    <span className="block truncate text-xs text-muted">
                      {position
                        ? `${formatDistance(distanceMeters(position, note))} away`
                        : null}
                      {position && note.address ? " · " : ""}
                      {note.address ?? ""}
                    </span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
