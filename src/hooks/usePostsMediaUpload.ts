import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import imageCompression from "browser-image-compression";

export const usePostsMediaUpload = () => {
  const { user } = useAuth();

  const uploadPostImage = useCallback(async (file: File): Promise<{ url: string; width?: number; height?: number } | null> => {
    if (!user?.id) return null;
    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 2,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      });
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("posts-media").upload(path, compressed, {
        contentType: compressed.type,
        upsert: false,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("posts-media").getPublicUrl(path);
      // Try read dimensions
      const dims = await new Promise<{ width: number; height: number } | null>((res) => {
        const img = new Image();
        img.onload = () => res({ width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = () => res(null);
        img.src = URL.createObjectURL(compressed);
      });
      return { url: data.publicUrl, ...(dims || {}) };
    } catch (e) {
      console.error("uploadPostImage failed", e);
      return null;
    }
  }, [user?.id]);

  return { uploadPostImage };
};
