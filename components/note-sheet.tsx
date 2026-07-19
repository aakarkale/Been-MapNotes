"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  Camera,
  Check,
  Copy,
  Link2,
  Link2Off,
  Loader2,
  Share2,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { NewNote } from "@/hooks/use-notes";
import {
  NOTE_COLORS,
  NOTE_COLOR_HEX,
  NOTE_EMOJIS,
  type Note,
  type NoteColor,
  type NotePhoto,
} from "@/lib/types";

export interface Draft {
  lat: number;
  lng: number;
  address: string | null;
}

interface NoteSheetProps {
  userId: string;
  note: Note | null;
  draft: Draft | null;
  onClose: () => void;
  onCreate: (fields: NewNote) => Promise<Note | null>;
  onUpdate: (id: string, patch: Partial<Note>) => Promise<Note | null>;
  onDelete: (id: string) => Promise<boolean>;
}

export function NoteSheet({
  userId,
  note,
  draft,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
}: NoteSheetProps) {
  const supabase = useMemo(() => createClient(), []);
  const [title, setTitle] = useState(note?.title ?? "");
  const [body, setBody] = useState(note?.body ?? "");
  const [emoji, setEmoji] = useState(note?.emoji ?? "📍");
  const [color, setColor] = useState<NoteColor>(note?.color ?? "coral");
  const [remindEnabled, setRemindEnabled] = useState(
    note?.remind_enabled ?? false,
  );
  const [remindRadius, setRemindRadius] = useState(note?.remind_radius_m ?? 250);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [photos, setPhotos] = useState<NotePhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const address = note?.address ?? draft?.address ?? null;
  const shareToken = note?.share_token ?? null;

  useEffect(() => {
    if (!note) return;
    let cancelled = false;
    supabase
      .from("note_photos")
      .select("*")
      .eq("note_id", note.id)
      .order("created_at")
      .then(({ data }) => {
        if (!cancelled && data) setPhotos(data as NotePhoto[]);
      });
    return () => {
      cancelled = true;
    };
  }, [note, supabase]);

  function publicUrl(path: string) {
    return supabase.storage.from("note-photos").getPublicUrl(path).data
      .publicUrl;
  }

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    try {
      if (note) {
        const updated = await onUpdate(note.id, {
          title,
          body,
          emoji,
          color,
          remind_enabled: remindEnabled,
          remind_radius_m: remindRadius,
        });
        if (updated) toast.success("Note updated");
      } else if (draft) {
        const created = await onCreate({
          title,
          body,
          emoji,
          color,
          lat: draft.lat,
          lng: draft.lng,
          address: draft.address,
          remind_enabled: remindEnabled,
          remind_radius_m: remindRadius,
        });
        if (created) toast.success("Place saved");
      }
    } finally {
      setSaving(false);
    }
  }

  function toggleReminder(next: boolean) {
    setRemindEnabled(next);
    if (next && typeof Notification !== "undefined" && Notification.permission === "default") {
      void Notification.requestPermission();
    }
  }

  async function handleShareToggle() {
    if (!note) return;
    if (shareToken) {
      await onUpdate(note.id, { share_token: null });
      toast.success("Link disabled");
    } else {
      const updated = await onUpdate(note.id, {
        share_token: crypto.randomUUID(),
      });
      if (updated?.share_token) {
        await copyShareLink(updated.share_token);
      }
    }
  }

  async function copyShareLink(token: string) {
    const url = `${location.origin}/s/${token}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: title || "A place on Been", url });
        return;
      } catch {
        // fall through to clipboard (user may have dismissed the sheet)
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.info(url, { duration: 15_000 });
    }
  }

  async function handleUpload(files: FileList | null) {
    if (!note || !files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${userId}/${note.id}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("note-photos")
          .upload(path, file, { contentType: file.type || undefined });
        if (uploadError) throw uploadError;
        const { data, error } = await supabase
          .from("note_photos")
          .insert({ note_id: note.id, storage_path: path })
          .select()
          .single();
        if (error) throw error;
        setPhotos((prev) => [...prev, data as NotePhoto]);
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? `Upload failed: ${err.message}` : "Upload failed",
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDeletePhoto(photo: NotePhoto) {
    await supabase.storage.from("note-photos").remove([photo.storage_path]);
    await supabase.from("note_photos").delete().eq("id", photo.id);
    setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
  }

  async function handleDelete() {
    if (!note) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    const ok = await onDelete(note.id);
    if (ok) {
      toast.success("Note deleted");
      onClose();
    }
  }

  return (
    <div className="absolute inset-x-0 bottom-0 z-30 mx-auto max-w-lg">
      <div className="max-h-[82dvh] overflow-y-auto rounded-t-3xl border border-edge bg-surface px-5 pt-3 pb-[max(env(safe-area-inset-bottom),1.25rem)] shadow-2xl">
        <div className="sticky top-0 z-10 -mx-5 flex items-center justify-between bg-surface px-5 pb-2 pt-1">
          <div className="mx-auto h-1.5 w-10 rounded-full bg-surface-2 absolute inset-x-0 top-1.5" />
          <span className="pt-2 text-xs font-medium tracking-wide text-muted uppercase">
            {note ? "Edit place" : "New place"}
          </span>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="mt-1 grid size-8 place-items-center rounded-full bg-surface-2"
          >
            <X className="size-4" />
          </button>
        </div>

        {address && (
          <p className="mb-3 text-xs text-muted">{address}</p>
        )}

        <div className="mb-3 flex flex-wrap gap-1.5">
          {NOTE_EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setEmoji(e)}
              className={`grid size-9 place-items-center rounded-xl text-lg transition ${
                emoji === e
                  ? "bg-accent/15 ring-2 ring-accent"
                  : "bg-surface-2 hover:bg-edge"
              }`}
            >
              {e}
            </button>
          ))}
        </div>

        <div className="mb-4 flex gap-2">
          {NOTE_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Color ${c}`}
              onClick={() => setColor(c)}
              className="grid size-7 place-items-center rounded-full transition active:scale-90"
              style={{ background: NOTE_COLOR_HEX[c] }}
            >
              {color === c && <Check className="size-4 text-white" />}
            </button>
          ))}
        </div>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Name this place"
          className="mb-2 w-full rounded-xl border border-edge bg-surface px-4 py-3 text-base font-medium outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/25"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Why does it matter? Add a note…"
          rows={3}
          className="mb-4 w-full resize-none rounded-xl border border-edge bg-surface px-4 py-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/25"
        />

        <div className="mb-4 rounded-2xl bg-surface-2 p-4">
          <label className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-sm font-medium">
              <Bell className="size-4 text-accent" />
              Nudge me when I&apos;m nearby
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={remindEnabled}
              onClick={() => toggleReminder(!remindEnabled)}
              className={`relative h-6 w-11 rounded-full transition ${
                remindEnabled ? "bg-accent" : "bg-edge"
              }`}
            >
              <span
                className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${
                  remindEnabled ? "left-[22px]" : "left-0.5"
                }`}
              />
            </button>
          </label>
          {remindEnabled && (
            <div className="mt-3">
              <div className="mb-1 flex justify-between text-xs text-muted">
                <span>Within</span>
                <span className="font-medium text-foreground">
                  {remindRadius >= 1000
                    ? `${(remindRadius / 1000).toFixed(1)} km`
                    : `${remindRadius} m`}
                </span>
              </div>
              <input
                type="range"
                min={50}
                max={2000}
                step={50}
                value={remindRadius}
                onChange={(e) => setRemindRadius(Number(e.target.value))}
                className="w-full accent-(--accent)"
              />
            </div>
          )}
        </div>

        {note && (
          <div className="mb-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-medium">
                <Camera className="size-4 text-accent" /> Photos
              </span>
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className="rounded-full bg-surface-2 px-3 py-1.5 text-xs font-medium transition hover:bg-edge disabled:opacity-60"
              >
                {uploading ? "Uploading…" : "Add"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => handleUpload(e.target.files)}
              />
            </div>
            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {photos.map((photo) => (
                  <div key={photo.id} className="group relative aspect-square">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={publicUrl(photo.storage_path)}
                      alt=""
                      className="size-full rounded-xl object-cover"
                    />
                    <button
                      type="button"
                      aria-label="Delete photo"
                      onClick={() => handleDeletePhoto(photo)}
                      className="absolute top-1 right-1 grid size-6 place-items-center rounded-full bg-black/55 text-white opacity-80 transition hover:opacity-100"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground transition hover:brightness-105 disabled:opacity-60"
        >
          {saving && <Loader2 className="size-4 animate-spin" />}
          {note ? "Save changes" : "Save place"}
        </button>

        {note && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleShareToggle}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-edge px-3 py-2.5 text-sm font-medium transition hover:bg-surface-2"
            >
              {shareToken ? (
                <>
                  <Link2Off className="size-4" /> Stop sharing
                </>
              ) : (
                <>
                  <Link2 className="size-4" /> Share link
                </>
              )}
            </button>
            {shareToken && (
              <button
                type="button"
                aria-label="Copy share link"
                onClick={() => copyShareLink(shareToken)}
                className="grid size-10 shrink-0 place-items-center rounded-xl border border-edge transition hover:bg-surface-2"
              >
                {typeof navigator !== "undefined" && "share" in navigator ? (
                  <Share2 className="size-4" />
                ) : (
                  <Copy className="size-4" />
                )}
              </button>
            )}
            <button
              type="button"
              onClick={handleDelete}
              className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                confirmDelete
                  ? "bg-red-500 text-white"
                  : "border border-edge text-red-500 hover:bg-surface-2"
              }`}
            >
              <Trash2 className="size-4" />
              {confirmDelete ? "Confirm" : ""}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
