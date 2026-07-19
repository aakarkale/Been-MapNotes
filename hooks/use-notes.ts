"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { Note } from "@/lib/types";

export type NewNote = Pick<
  Note,
  | "title"
  | "body"
  | "emoji"
  | "color"
  | "lat"
  | "lng"
  | "address"
  | "remind_enabled"
  | "remind_radius_m"
>;

export function useNotes(initialNotes: Note[]) {
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const supabase = useMemo(() => createClient(), []);

  const createNote = useCallback(
    async (fields: NewNote): Promise<Note | null> => {
      const { data, error } = await supabase
        .from("notes")
        .insert(fields)
        .select()
        .single();
      if (error) {
        toast.error(`Couldn't save note: ${error.message}`);
        return null;
      }
      const note = data as Note;
      setNotes((prev) => [note, ...prev]);
      return note;
    },
    [supabase],
  );

  const updateNote = useCallback(
    async (id: string, patch: Partial<Note>): Promise<Note | null> => {
      const { data, error } = await supabase
        .from("notes")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) {
        toast.error(`Couldn't update note: ${error.message}`);
        return null;
      }
      const note = data as Note;
      setNotes((prev) => prev.map((n) => (n.id === id ? note : n)));
      return note;
    },
    [supabase],
  );

  const deleteNote = useCallback(
    async (id: string): Promise<boolean> => {
      const { error } = await supabase.from("notes").delete().eq("id", id);
      if (error) {
        toast.error(`Couldn't delete note: ${error.message}`);
        return false;
      }
      setNotes((prev) => prev.filter((n) => n.id !== id));
      return true;
    },
    [supabase],
  );

  return { notes, createNote, updateNote, deleteNote };
}
