export const NOTE_COLORS = [
  "coral",
  "amber",
  "mint",
  "sky",
  "violet",
  "rose",
] as const;

export type NoteColor = (typeof NOTE_COLORS)[number];

export const NOTE_COLOR_HEX: Record<NoteColor, string> = {
  coral: "#ff6b5e",
  amber: "#f5a623",
  mint: "#2fbf94",
  sky: "#38a8e8",
  violet: "#8b6cf0",
  rose: "#f06292",
};

export const NOTE_EMOJIS = [
  "📍",
  "❤️",
  "⭐",
  "🍜",
  "☕",
  "🍺",
  "🏞️",
  "🏠",
  "🛍️",
  "🎁",
  "📦",
  "💡",
] as const;

export interface Note {
  id: string;
  user_id: string;
  title: string;
  body: string;
  emoji: string;
  color: NoteColor;
  lat: number;
  lng: number;
  address: string | null;
  remind_enabled: boolean;
  remind_radius_m: number;
  share_token: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotePhoto {
  id: string;
  note_id: string;
  user_id: string;
  storage_path: string;
  created_at: string;
}

export interface SharedNote {
  id: string;
  title: string;
  body: string;
  emoji: string;
  color: NoteColor;
  lat: number;
  lng: number;
  address: string | null;
  created_at: string;
  photos: string[];
}

export interface LatLng {
  lat: number;
  lng: number;
}
