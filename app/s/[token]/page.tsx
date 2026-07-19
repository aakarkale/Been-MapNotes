import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SharedNoteCard } from "@/components/shared-note-card";
import type { SharedNote } from "@/lib/types";

interface SharedNotePageProps {
  params: Promise<{ token: string }>;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function fetchSharedNote(token: string): Promise<SharedNote | null> {
  if (!UUID_RE.test(token)) return null;
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_shared_note", { token });
  return (data as SharedNote | null) ?? null;
}

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

  const photoUrls = note.photos.map(
    (path) =>
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/note-photos/${path}`,
  );

  return <SharedNoteCard note={note} photoUrls={photoUrls} />;
}
