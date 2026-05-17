import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { X, Edit3, Save, Trash2 } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  contactId: string;
  realName: string;
  currentNickname?: string;
  onSave: (nickname: string) => void;
}

const NicknameDialog = ({ open, onClose, realName, currentNickname, onSave }: Props) => {
  const [val, setVal] = useState(currentNickname || "");

  useEffect(() => { if (open) setVal(currentNickname || ""); }, [open, currentNickname]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-md flex items-end sm:items-center justify-center p-4"
      >
        <motion.div
          initial={{ y: 30, scale: 0.95 }}
          animate={{ y: 0, scale: 1 }}
          exit={{ y: 30, scale: 0.95 }}
          transition={{ type: "spring", damping: 22 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-sm glass-card p-5 space-y-4 shadow-2xl"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-cairo font-bold text-lg flex items-center gap-2">
              <Edit3 size={18} className="text-primary" /> اسم مخصص
            </h3>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary/50">
              <X size={18} />
            </button>
          </div>

          <p className="text-xs text-muted-foreground font-cairo">
            هتغير اسم <span className="text-foreground font-bold">{realName}</span> ليظهرلك إنت بس. مش هيشوفه أي حد تاني.
          </p>

          <input
            value={val}
            onChange={(e) => setVal(e.target.value)}
            maxLength={50}
            autoFocus
            placeholder="اكتب الاسم اللي يعجبك..."
            className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border/30 focus:border-primary focus:outline-none font-cairo text-foreground"
          />

          <div className="flex gap-2">
            {currentNickname && (
              <button
                onClick={() => { onSave(""); onClose(); }}
                className="flex-1 py-2.5 rounded-xl border border-destructive/40 text-destructive font-cairo font-semibold text-sm flex items-center justify-center gap-1.5 hover:bg-destructive/10"
              >
                <Trash2 size={14} /> رجّع للأصلي
              </button>
            )}
            <button
              onClick={() => { onSave(val); onClose(); }}
              disabled={!val.trim() || val.trim() === currentNickname}
              className="flex-1 py-2.5 rounded-xl gradient-primary text-primary-foreground font-cairo font-bold text-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Save size={14} /> حفظ
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default NicknameDialog;
