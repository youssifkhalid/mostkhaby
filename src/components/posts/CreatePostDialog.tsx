import { ChangeEvent, useState } from "react";
import { ImagePlus, Loader2, Send, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useCreatePost } from "@/hooks/usePosts";
import { usePostsMediaUpload } from "@/hooks/usePostsMediaUpload";
import { toast } from "sonner";

type CreatePostDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type SelectedMedia = {
  file: File;
  preview: string;
  type: "image" | "video";
};

const CreatePostDialog = ({ open, onOpenChange }: CreatePostDialogProps) => {
  const [caption, setCaption] = useState("");
  const [privacy, setPrivacy] = useState<"public" | "followers" | "private">("public");
  const [media, setMedia] = useState<SelectedMedia[]>([]);
  const [uploading, setUploading] = useState(false);
  const createPost = useCreatePost();
  const { uploadPostImage } = usePostsMediaUpload();

  const reset = () => {
    setCaption("");
    setPrivacy("public");
    media.forEach((item) => URL.revokeObjectURL(item.preview));
    setMedia([]);
  };

  const handleFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []).slice(0, 6 - media.length);
    if (!files.length) return;
    const next = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      type: file.type.startsWith("video") ? "video" as const : "image" as const,
    }));
    setMedia((current) => [...current, ...next]);
    event.target.value = "";
  };

  const removeMedia = (index: number) => {
    setMedia((current) => {
      const item = current[index];
      if (item) URL.revokeObjectURL(item.preview);
      return current.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async () => {
    if (!caption.trim() && media.length === 0) {
      toast.error("اكتب حاجة أو ضيف صورة الأول");
      return;
    }

    setUploading(true);
    try {
      const uploaded = [] as { url: string; type: "image" | "video"; width?: number; height?: number }[];
      for (const item of media) {
        if (item.type === "video") {
          toast.error("رفع الفيديوهات غير متاح من النافذة دي حالياً");
          continue;
        }
        const result = await uploadPostImage(item.file);
        if (result) uploaded.push({ ...result, type: "image" });
      }

      await createPost.mutateAsync({ caption, privacy, media: uploaded });
      reset();
      onOpenChange(false);
    } finally {
      setUploading(false);
    }
  };

  const isBusy = uploading || createPost.isPending;

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!isBusy) onOpenChange(value); }}>
      <DialogContent className="max-w-md rounded-3xl border-border/30 bg-background/95 p-0 text-right shadow-2xl backdrop-blur-xl" dir="rtl">
        <DialogHeader className="border-b border-border/20 px-5 pb-4 pt-5 text-right">
          <DialogTitle className="font-cairo text-lg font-bold">منشور جديد</DialogTitle>
          <DialogDescription className="font-cairo text-xs text-muted-foreground">
            شارك لحظتك مع الناس اللي تختارهم.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-5 pb-5">
          <Textarea
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            placeholder="بتفكر في إيه؟"
            maxLength={600}
            className="min-h-32 resize-none rounded-2xl border-border/30 bg-secondary/25 font-cairo text-sm leading-7"
          />

          {media.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {media.map((item, index) => (
                <div key={item.preview} className="relative overflow-hidden rounded-2xl bg-secondary/50">
                  {item.type === "video" ? (
                    <video src={item.preview} className="h-24 w-full object-cover" />
                  ) : (
                    <img src={item.preview} alt="معاينة" className="h-24 w-full object-cover" />
                  )}
                  <button
                    onClick={() => removeMedia(index)}
                    className="absolute left-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-background/80 text-foreground"
                    aria-label="حذف الصورة"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <label className="flex cursor-pointer items-center gap-2 rounded-2xl bg-secondary/40 px-4 py-2.5 font-cairo text-xs font-bold text-foreground transition-colors hover:bg-secondary/70">
              <ImagePlus size={16} className="text-primary" />
              صور
              <input type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
            </label>

            <select
              value={privacy}
              onChange={(event) => setPrivacy(event.target.value as typeof privacy)}
              className="flex-1 rounded-2xl border border-border/25 bg-secondary/30 px-3 py-2.5 font-cairo text-xs font-bold text-foreground outline-none"
            >
              <option value="public">عام</option>
              <option value="followers">المتابعين</option>
              <option value="private">خاص</option>
            </select>
          </div>

          <button
            onClick={handleSubmit}
            disabled={isBusy || (!caption.trim() && media.length === 0)}
            className="gradient-primary flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 font-cairo text-sm font-bold text-primary-foreground shadow-lg disabled:opacity-50"
          >
            {isBusy ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            نشر
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePostDialog;
