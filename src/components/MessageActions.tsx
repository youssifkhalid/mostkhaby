import { motion, AnimatePresence } from "framer-motion";
import { Reply, Edit2, Trash2, Smile } from "lucide-react";
import { useEffect } from "react";

const QUICK_EMOJIS = ["❤️", "😂", "😮", "😢", "👍", "🔥"];

interface Props {
  onClose: () => void;
  onReact: (emoji: string) => void;
  onReply: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

const MessageActions = ({ onClose, onReact, onReply, onEdit, onDelete, canEdit, canDelete }: Props) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end justify-center bg-background/70 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 320 }}
          className="w-full max-w-lg space-y-3 p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Emoji bar */}
          <div className="glass-card rounded-2xl p-2 flex items-center justify-around">
            {QUICK_EMOJIS.map((e) => (
              <motion.button
                key={e}
                whileTap={{ scale: 0.8 }}
                whileHover={{ scale: 1.2, y: -4 }}
                onClick={() => { onReact(e); onClose(); }}
                className="text-2xl p-1.5 rounded-full"
              >
                {e}
              </motion.button>
            ))}
          </div>

          {/* Action menu */}
          <div className="glass-card rounded-2xl overflow-hidden">
            <button
              onClick={() => { onReply(); onClose(); }}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-secondary/30 transition-colors text-right"
            >
              <Reply size={18} className="text-primary" />
              <span className="text-sm font-cairo font-semibold flex-1 text-right">رد</span>
            </button>
            {canEdit && onEdit && (
              <button
                onClick={() => { onEdit(); onClose(); }}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-secondary/30 transition-colors border-t border-border/15 text-right"
              >
                <Edit2 size={18} className="text-accent" />
                <span className="text-sm font-cairo font-semibold flex-1 text-right">تعديل</span>
              </button>
            )}
            {canDelete && onDelete && (
              <button
                onClick={() => { onDelete(); onClose(); }}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-destructive/10 transition-colors border-t border-border/15 text-right"
              >
                <Trash2 size={18} className="text-destructive" />
                <span className="text-sm font-cairo font-semibold text-destructive flex-1 text-right">حذف</span>
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="w-full glass-card rounded-2xl py-3 text-sm font-cairo font-semibold text-muted-foreground"
          >
            إلغاء
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default MessageActions;
