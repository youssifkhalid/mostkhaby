import { memo, useRef } from "react";
import { motion } from "framer-motion";
import { Check, CheckCheck, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import VoicePlayer from "./VoicePlayer";
import ImageMessage from "./ImageMessage";

interface Reaction { emoji: string; count: number; mine?: boolean }

interface ChatBubbleProps {
  content: string;
  isMine: boolean;
  status: "sending" | "sent" | "delivered" | "read";
  created_at: string;
  is_deleted?: boolean;
  is_edited?: boolean;
  replyContent?: string;
  reactions?: Reaction[];
  media_url?: string | null;
  media_type?: string | null;
  audio_duration?: number | null;
  waveform?: number[] | null;
  selected?: boolean;
  selectionMode?: boolean;
  onLongPress?: () => void;
  onReactionClick?: (emoji: string) => void;
  onClick?: () => void;
}

const ChatBubble = ({
  content, isMine, status, created_at,
  is_deleted, is_edited, replyContent, reactions,
  media_url, media_type, audio_duration, waveform,
  selected, selectionMode,
  onLongPress, onReactionClick, onClick,
}: ChatBubbleProps) => {
  const time = format(new Date(created_at), "h:mm a", { locale: ar });
  const pressTimer = useRef<any>(null);

  const handlePressStart = () => {
    pressTimer.current = setTimeout(() => {
      if (navigator.vibrate) navigator.vibrate(15);
      onLongPress?.();
    }, 450);
  };
  const handlePressEnd = () => clearTimeout(pressTimer.current);

  const renderStatus = () => {
    if (!isMine) return null;
    if (status === "sending") return <Loader2 size={12} className="animate-spin text-muted-foreground/50" />;
    if (status === "read") return <CheckCheck size={14} className="text-blue-400" />;
    if (status === "delivered") return <CheckCheck size={14} className="text-muted-foreground" />;
    return <Check size={14} className="text-muted-foreground" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className={`flex items-center gap-2 ${isMine ? "justify-start flex-row-reverse" : "justify-end"} mb-1.5 ${selected ? "bg-primary/15 -mx-4 px-4 py-1 rounded-lg" : ""}`}
      onClick={onClick}
    >
      {selectionMode && (
        <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${selected ? "bg-primary border-primary" : "border-muted-foreground/40"}`}>
          {selected && <Check size={12} className="text-primary-foreground" />}
        </span>
      )}
      <div
        onMouseDown={handlePressStart}
        onMouseUp={handlePressEnd}
        onMouseLeave={handlePressEnd}
        onTouchStart={handlePressStart}
        onTouchEnd={handlePressEnd}
        onTouchCancel={handlePressEnd}
        onContextMenu={(e) => { e.preventDefault(); onLongPress?.(); }}
        className={`max-w-[78%] rounded-2xl px-3.5 py-2 relative cursor-pointer select-none ${
          isMine
            ? "bg-gradient-to-br from-primary/25 to-primary/10 border border-primary/30 rounded-bl-sm shadow-[0_2px_8px_hsl(var(--primary)/0.12)]"
            : "bg-gradient-to-br from-secondary/70 to-secondary/40 border border-border/25 rounded-br-sm"
        } ${status === "sending" ? "opacity-70" : ""} active:scale-[0.98] transition-transform`}
      >
        {replyContent && (
          <div className="text-[11px] text-muted-foreground border-r-2 border-primary/50 pr-2 mb-1.5 line-clamp-2 bg-background/30 rounded-md py-1 px-2">
            {replyContent}
          </div>
        )}
        {is_deleted ? (
          <p className="text-sm text-muted-foreground italic font-cairo">🚫 تم حذف الرسالة</p>
        ) : media_type === "image" && media_url ? (
          <ImageMessage url={media_url} />
        ) : media_type === "audio" && media_url ? (
          <VoicePlayer url={media_url} duration={audio_duration || 0} waveform={waveform || []} isMine={isMine} />
        ) : (
          <p className="text-sm text-foreground leading-relaxed font-cairo whitespace-pre-wrap break-words">{content}</p>
        )}
        <div className={`flex items-center gap-1 mt-0.5 ${isMine ? "justify-start" : "justify-end"}`}>
          {is_edited && !is_deleted && <span className="text-[9px] text-muted-foreground/60 italic">معدّلة</span>}
          <span className="text-[10px] text-muted-foreground/60">{time}</span>
          {renderStatus()}
        </div>
        {reactions && reactions.length > 0 && (
          <div className={`flex gap-1 mt-1 flex-wrap ${isMine ? "justify-start" : "justify-end"}`}>
            {reactions.map((r, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); onReactionClick?.(r.emoji); }}
                className={`text-xs rounded-full px-1.5 py-0.5 border ${
                  r.mine ? "bg-primary/20 border-primary/40" : "bg-background/60 border-border/30"
                }`}
              >
                {r.emoji} {r.count > 1 && <span className="text-[9px]">{r.count}</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default memo(ChatBubble);
