"use client";

import { noteColorHex } from "@/lib/types";

interface NotePinProps {
  emoji: string;
  color: string;
  selected?: boolean;
  draft?: boolean;
  label?: string;
  onClick?: () => void;
}

/** The teardrop pin — single source of truth for marker markup, used by the
 *  main map and the public share-page map. */
export function NotePin({
  emoji,
  color,
  selected = false,
  draft = false,
  label,
  onClick,
}: NotePinProps) {
  const className = `note-pin${selected ? " is-selected" : ""}${draft ? " is-draft" : ""}`;
  const background = noteColorHex(color);

  if (!onClick) {
    return (
      <div className={className} style={{ background }}>
        <span>{emoji}</span>
      </div>
    );
  }
  return (
    <button
      type="button"
      aria-label={label || "Saved place"}
      className={className}
      style={{ background }}
      onClick={onClick}
    >
      <span>{emoji}</span>
    </button>
  );
}
