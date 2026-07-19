"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { distanceMeters, formatDistance } from "@/lib/geo";
import { STORAGE_KEYS } from "@/lib/map-style";
import type { LatLng, Note } from "@/lib/types";

const NUDGE_COOLDOWN_MS = 30 * 60 * 1000;

// In-memory fallback so private browsing (localStorage throws) still gets a
// per-session cooldown instead of nudging on every position tick.
const sessionNudges = new Map<string, number>();

function shouldNudge(noteId: string): boolean {
  const now = Date.now();
  const inMemory = sessionNudges.get(noteId);
  if (inMemory && now - inMemory <= NUDGE_COOLDOWN_MS) return false;
  try {
    const last = localStorage.getItem(STORAGE_KEYS.nudgePrefix + noteId);
    return !last || now - Number(last) > NUDGE_COOLDOWN_MS;
  } catch {
    return true;
  }
}

function markNudged(noteId: string) {
  sessionNudges.set(noteId, Date.now());
  try {
    localStorage.setItem(STORAGE_KEYS.nudgePrefix + noteId, String(Date.now()));
  } catch {}
}

function systemNotify(title: string, body: string, tag: string) {
  if (
    typeof Notification === "undefined" ||
    Notification.permission !== "granted" ||
    document.visibilityState !== "hidden"
  ) {
    return;
  }
  try {
    // Page-context constructor throws on Android Chrome (service-worker only).
    new Notification(title, { body, tag });
  } catch {
    void navigator.serviceWorker?.ready
      .then((reg) => reg.showNotification(title, { body, tag }))
      .catch(() => {});
  }
}

/**
 * Watches the current position and gently nudges (toast + system
 * notification) when the user comes within a note's reminder radius.
 * Each note nudges at most once per cooldown window.
 */
export function useNearbyNudges(
  notes: Note[],
  position: LatLng | null,
  onOpenNote: (note: Note) => void,
) {
  useEffect(() => {
    if (!position) return;

    for (const note of notes) {
      if (!note.remind_enabled) continue;
      const d = distanceMeters(position, { lat: note.lat, lng: note.lng });
      if (d > note.remind_radius_m || !shouldNudge(note.id)) continue;

      markNudged(note.id);
      const title = note.title || "A saved place";
      toast(`${note.emoji} You're near ${title}`, {
        description: `${formatDistance(d)} away${note.body ? ` — ${note.body.slice(0, 80)}` : ""}`,
        duration: 12_000,
        action: { label: "Open", onClick: () => onOpenNote(note) },
      });
      systemNotify(
        `${note.emoji} You're near ${title}`,
        note.body || note.address || "Tap to open Been",
        `been-nudge-${note.id}`,
      );
    }
  }, [notes, position, onOpenNote]);
}
