import { useQuery } from "@tanstack/react-query";

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  cover: string;
  preview: string; // 30s mp3
  duration: number;
}

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/search-music`;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

export const useMusicSearch = (query: string) => {
  const q = query.trim();
  return useQuery({
    queryKey: ["music-search", q],
    staleTime: 10 * 60_000,
    queryFn: async (): Promise<MusicTrack[]> => {
      const url = `${FN_URL}?q=${encodeURIComponent(q)}&limit=30`;
      const r = await fetch(url, {
        headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
      });
      if (!r.ok) return [];
      const j = await r.json();
      return j.tracks || [];
    },
  });
};
