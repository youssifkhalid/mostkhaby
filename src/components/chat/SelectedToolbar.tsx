import { AnimatePresence, motion } from "framer-motion";
import { X, Reply, Copy, Forward, Trash2, Pin } from "lucide-react";

interface Props {
  count: number;
  onClear: () => void;
  onReply?: () => void;
  onCopy?: () => void;
  onForward?: () => void;
  onPin?: () => void;
  onDelete?: () => void;
}

export function SelectedToolbar({ count, onClear, onReply, onCopy, onForward, onPin, onDelete }: Props) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ y: -56, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -56, opacity: 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 35 }}
          className="absolute inset-x-0 top-0 z-20 flex h-14 items-center gap-1 border-b bg-background/95 px-2 backdrop-blur"
        >
          <button onClick={onClear} className="rounded-full p-2 hover:bg-muted" aria-label="Clear">
            <X className="h-5 w-5" />
          </button>
          <div className="mr-2 text-sm font-medium">{count} selected</div>
          <div className="ml-auto flex items-center gap-0.5">
            {count === 1 && onReply && <IconBtn label="Reply" onClick={onReply}><Reply className="h-5 w-5" /></IconBtn>}
            {onCopy && <IconBtn label="Copy" onClick={onCopy}><Copy className="h-5 w-5" /></IconBtn>}
            {onForward && <IconBtn label="Forward" onClick={onForward}><Forward className="h-5 w-5" /></IconBtn>}
            {onPin && <IconBtn label="Pin" onClick={onPin}><Pin className="h-5 w-5" /></IconBtn>}
            {onDelete && (
              <IconBtn label="Delete" onClick={onDelete} destructive>
                <Trash2 className="h-5 w-5" />
              </IconBtn>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function IconBtn({ children, onClick, label, destructive }: { children: React.ReactNode; onClick: () => void; label: string; destructive?: boolean }) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className={`rounded-full p-2 hover:bg-muted ${destructive ? "text-destructive" : ""}`}
    >
      {children}
    </button>
  );
}
