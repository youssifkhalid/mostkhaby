import { X, Image as ImageIcon, Mic } from "lucide-react";
import type { ReplyTo } from "@/types/chat";

interface Props {
  reply: ReplyTo;
  onClose?: () => void;
  compact?: boolean; // when shown inside bubble
}

export function ReplyPreview({ reply, onClose, compact }: Props) {
  const icon =
    reply.type === "image" ? <ImageIcon className="h-3.5 w-3.5" /> :
    reply.type === "voice" ? <Mic className="h-3.5 w-3.5" /> : null;

  return (
    <div
      className={`flex items-start gap-2 rounded-lg border-l-2 border-primary bg-primary/5 px-2.5 py-1.5 ${
        compact ? "mb-1 text-xs" : "text-sm"
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium text-primary">{reply.author_name}</div>
        <div className="flex items-center gap-1 truncate text-muted-foreground">
          {icon}
          <span className="truncate">{reply.preview || (reply.type === "image" ? "Photo" : reply.type === "voice" ? "Voice message" : "")}</span>
        </div>
      </div>
      {reply.media_url && (
        <img src={reply.media_url} alt="" className="h-10 w-10 rounded object-cover" />
      )}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-1 text-muted-foreground hover:bg-muted"
          aria-label="Cancel reply"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
