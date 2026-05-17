import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import imageCompression from "browser-image-compression";

export interface UploadedStoryMedia {
  url: string;
  type: "image" | "video";
  width?: number;
  height?: number;
  duration?: number;
}

export const useStoriesMediaUpload = () => {
  const { user } = useAuth();

  const uploadStoryMedia = useCallback(async (file: File): Promise<UploadedStoryMedia | null> => {
    if (!user?.id) return null;
    try {
      const isVideo = file.type.startsWith("video/");
      let blob: Blob = file;
      let dims: { width?: number; height?: number; duration?: number } = {};

      if (isVideo) {
        if (file.size > 25 * 1024 * 1024) throw new Error("الفيديو كبير جداً (الحد 25MB)");
        dims = await new Promise((res) => {
          const v = document.createElement("video");
          v.preload = "metadata";
          v.onloadedmetadata = () => res({
            width: v.videoWidth,
            height: v.videoHeight,
            duration: Math.min(Math.round(v.duration) || 5, 30),
          });
          v.onerror = () => res({});
          v.src = URL.createObjectURL(file);
        });
      } else {
        blob = await imageCompression(file, {
          maxSizeMB: 1.5,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        });
        dims = await new Promise((res) => {
          const img = new Image();
          img.onload = () => res({ width: img.naturalWidth, height: img.naturalHeight });
          img.onerror = () => res({});
          img.src = URL.createObjectURL(blob);
        });
      }

      const ext = (file.name.split(".").pop() || (isVideo ? "mp4" : "jpg")).toLowerCase();
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("stories-media").upload(path, blob, {
        contentType: blob.type || (isVideo ? "video/mp4" : "image/jpeg"),
        upsert: false,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("stories-media").getPublicUrl(path);
      return { url: data.publicUrl, type: isVideo ? "video" : "image", ...dims };
    } catch (e: any) {
      console.error("uploadStoryMedia failed", e);
      throw e;
    }
  }, [user?.id]);

  return { uploadStoryMedia };
};
