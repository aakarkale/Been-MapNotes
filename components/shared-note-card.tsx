"use client";

import dynamic from "next/dynamic";
import { MapPin } from "lucide-react";
import { noteColorHex, type SharedNote } from "@/lib/types";

const SharedNoteMap = dynamic(
  () => import("@/components/shared-note-map").then((m) => m.SharedNoteMap),
  { ssr: false },
);

interface SharedNoteCardProps {
  note: SharedNote;
  photoUrls: string[];
}

export function SharedNoteCard({ note, photoUrls }: SharedNoteCardProps) {
  const color = noteColorHex(note.color);
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${note.lat},${note.lng}`;

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-4 px-4 py-6">
      <header className="flex items-center gap-2 text-sm text-muted">
        <span className="grid size-7 place-items-center rounded-lg bg-accent text-base">
          📍
        </span>
        <span>
          Shared with <span className="font-semibold text-foreground">Been</span>
        </span>
      </header>

      <div className="overflow-hidden rounded-3xl border border-edge bg-surface shadow-xl">
        <div className="h-56 w-full">
          <SharedNoteMap
            lat={note.lat}
            lng={note.lng}
            color={color}
            emoji={note.emoji}
          />
        </div>

        <div className="flex flex-col gap-3 p-5">
          <div className="flex items-start gap-3">
            <span
              className="grid size-11 shrink-0 place-items-center rounded-full text-xl"
              style={{ background: `${color}26` }}
            >
              {note.emoji}
            </span>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-tight">
                {note.title || "A place worth remembering"}
              </h1>
              {note.address && (
                <p className="mt-0.5 text-sm text-muted">{note.address}</p>
              )}
            </div>
          </div>

          {note.body && (
            <p className="text-[15px] leading-relaxed whitespace-pre-wrap">
              {note.body}
            </p>
          )}

          {photoUrls.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {photoUrls.map((url) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={url}
                  src={url}
                  alt=""
                  className="aspect-square w-full rounded-xl object-cover"
                />
              ))}
            </div>
          )}

          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground transition hover:brightness-105"
          >
            <MapPin className="size-4" /> Get directions
          </a>
        </div>
      </div>

      <p className="text-center text-xs text-muted">
        Been — save the places that matter.
      </p>
    </main>
  );
}
