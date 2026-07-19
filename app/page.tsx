import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MapApp } from "@/components/map-app";
import type { Note } from "@/lib/types";

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: notes } = await supabase
    .from("notes")
    .select("*")
    .order("created_at", { ascending: false });

  return <MapApp initialNotes={(notes as Note[]) ?? []} userId={user.id} />;
}
