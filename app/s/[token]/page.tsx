import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SharedNoteCard } from "@/components/shared-note-card";
import { NOTE_PHOTOS_BUCKET, type SharedNote } from "@/lib/types";

interface SharedNotePageProps {
  params: Promise<{ token: string }>;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// cache() dedupes the RPC between generateMetadata and the page render.
const fetchSharedNote = cache(
  async (token: string): Promise<SharedNote | null> => {
    if (!UUID_RE.test(token)) return null;
    const supabase = await createClient();
    const { data } = await supabase.rpc("get_shared_note", { token });
    return (data as SharedNote | null) ?? null;
  },
);

export async function generateMetadata({
  params,
}: SharedNotePageProps): Promise<Metadata> {
  const { token } = await params;
  const note = await fetchSharedNote(token);
  return {
    title: note
      ? `${note.emoji} ${note.title || "A place"} — Been`
      : "Shared place — Been",
    description: note?.body || note?.address || "A place shared on Been.",
  };
}

export default async function SharedNotePage({ params }: SharedNotePageProps) {
  const { token } = await params;
  const note = await fetchSharedNote(token);
  if (!note) notFound();

  // The bucket is private; the shared-note storage policy lets this
  // anon-context server client sign URLs only while the note is shared.
  let photoUrls: string[] = [];
  if (note.photos.length > 0) {
    const supabase = await createClient();
    const { data: signed } = await supabase.storage
      .from(NOTE_PHOTOS_BUCKET)
      .createSignedUrls(note.photos, 3600);
    photoUrls = (signed ?? [])
      .map((s) => s.signedUrl)
      .filter((url): url is string => Boolean(url));
  }

  return <SharedNoteCard note={note} photoUrls={photoUrls} />;
}
