import { Heart, Trash2, Share2, Reply, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import React from "react";

interface MessageCardProps {
  id: string;
  content: string;
  created_at: string;
  is_favorite: boolean;
  is_read: boolean;
  is_public?: boolean;
  onToggleFavorite: (id: string, current: boolean) => void;
  onDelete: (id: string) => void;
  onReply?: (id: string) => void;
  onTogglePublic?: (id: string, current: boolean) => void;
  showReply?: boolean;
  showPublicToggle?: boolean;
  personName?: string;
  personUsername?: string;
  personAvatarUrl?: string | null;
  personLabel?: string;
  onOpenProfile?: () => void;
}

const MessageCard = React.forwardRef<HTMLDivElement, MessageCardProps>(
  ({ id, content, created_at, is_favorite, is_read, is_public, onToggleFavorite, onDelete, onReply, onTogglePublic, showReply = true, showPublicToggle = false, personName, personUsername, personAvatarUrl, personLabel, onOpenProfile }, ref) => {
    const date = new Date(created_at);
    const timeAgo = formatDistanceToNow(date, { addSuffix: true, locale: ar });
    const fullDate = format(date, "d MMM yyyy · h:mm a", { locale: ar });
    const displayName = personName || "مجهول";
    const initial = (personName || personUsername || "?").charAt(0).toUpperCase();

    const handleShare = async () => {
      if (navigator.vibrate) navigator.vibrate(5);
      try {
        await navigator.clipboard.writeText(content);
        toast.success("تم نسخ الرسالة! 📋");
      } catch {
        toast.error("مقدرش أنسخ");
      }
    };

    return (
      <motion.div
        ref={ref}
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -100 }}
        className={`glass-card-hover p-4 ${!is_read ? "border-primary/30 glow-border" : ""}`}
      >
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={onOpenProfile}
            disabled={!onOpenProfile}
            className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${onOpenProfile ? "cursor-pointer" : "cursor-default"}`}
          >
            {personAvatarUrl ? (
              <img src={personAvatarUrl} alt={displayName} className="w-10 h-10 rounded-xl object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">{personName ? initial : "؟"}</span>
              </div>
            )}
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <button
                type="button"
                onClick={onOpenProfile}
                disabled={!onOpenProfile}
                className={`font-cairo font-semibold text-sm text-foreground ${onOpenProfile ? "hover:text-primary transition-colors" : ""}`}
              >
                {personLabel ? `${personLabel} ${displayName}` : displayName}
              </button>
              <div className="text-left">
                <span className="text-[10px] text-muted-foreground block">{timeAgo}</span>
                <span className="text-[9px] text-muted-foreground/50 block">{fullDate}</span>
              </div>
            </div>
            {personUsername && (
              <p className="text-[11px] text-muted-foreground mb-1">@{personUsername}</p>
            )}
            <p className="text-sm text-secondary-foreground leading-relaxed">{content}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 mt-3 pt-3 border-t border-border/15 justify-end">
          {showReply && onReply && (
            <motion.button whileTap={{ scale: 0.8 }} onClick={() => onReply(id)} className="p-2 rounded-lg hover:bg-primary/10 transition-colors">
              <Reply size={17} className="text-muted-foreground hover:text-primary" />
            </motion.button>
          )}
          {showPublicToggle && onTogglePublic && (
            <motion.button whileTap={{ scale: 0.8 }} onClick={() => onTogglePublic(id, !!is_public)} className="p-2 rounded-lg hover:bg-accent/10 transition-colors">
              {is_public ? <Eye size={17} className="text-accent" /> : <EyeOff size={17} className="text-muted-foreground" />}
            </motion.button>
          )}
          <motion.button
            whileTap={{ scale: 0.8 }}
            onClick={() => { onToggleFavorite(id, is_favorite); if (navigator.vibrate) navigator.vibrate(5); }}
            className="p-2 rounded-lg hover:bg-primary/10 transition-colors"
          >
            <Heart size={17} className={is_favorite ? "text-accent fill-accent" : "text-muted-foreground"} />
          </motion.button>
          <motion.button whileTap={{ scale: 0.8 }} onClick={handleShare} className="p-2 rounded-lg hover:bg-secondary/50 transition-colors">
            <Share2 size={17} className="text-muted-foreground" />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.8 }}
            onClick={() => { onDelete(id); if (navigator.vibrate) navigator.vibrate(5); }}
            className="p-2 rounded-lg hover:bg-destructive/10 transition-colors"
          >
            <Trash2 size={17} className="text-muted-foreground hover:text-destructive" />
          </motion.button>
        </div>
      </motion.div>
    );
  }
);

MessageCard.displayName = "MessageCard";
export default MessageCard;
