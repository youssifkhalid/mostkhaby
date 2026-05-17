import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import imageCompression from "browser-image-compression";

export const useMediaUpload = () => {
  const { user } = useAuth();

  const uploadImage = useCallback(async (file: File): Promise<string | null> => {
    if (!user?.id) return null;
    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 1.2,
        maxWidthOrHeight: 1600,
        useWebWorker: true,
      });
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("chat-media").upload(path, compressed, {
        contentType: compressed.type,
        upsert: false,
      });
      if (error) throw error;
      // signed URL valid 7 days for chat
      const { data: signed } = await supabase.storage.from("chat-media").createSignedUrl(path, 60 * 60 * 24 * 30);
      return signed?.signedUrl || null;
    } catch (e) {
      console.error("uploadImage failed", e);
      return null;
    }
  }, [user?.id]);

  const uploadAudio = useCallback(async (blob: Blob): Promise<string | null> => {
    if (!user?.id) return null;
    try {
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webm`;
      const { error } = await supabase.storage.from("chat-media").upload(path, blob, {
        contentType: "audio/webm",
        upsert: false,
      });
      if (error) throw error;
      const { data: signed } = await supabase.storage.from("chat-media").createSignedUrl(path, 60 * 60 * 24 * 30);
      return signed?.signedUrl || null;
    } catch (e) {
      console.error("uploadAudio failed", e);
      return null;
    }
  }, [user?.id]);

  return { uploadImage, uploadAudio };
};
