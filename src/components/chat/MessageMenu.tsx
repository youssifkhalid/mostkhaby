import { motion } from "framer-motion";
import { Reply, Copy, Forward, Pin, Trash2, Pencil, CheckSquare } from "lucide-react";

export interface MessageMenuAction {
  key: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  destructive?: boolean;
}

interface Props {
  isOwn: boolean;
  canEdit?: boolean;
  onReply: () => void;
  onCopy?: () => void;
  onForward?: () => void;
  onPin?: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
  onSelect?: () => void;
}

export function MessageMenu(props: Props) {
  const items: MessageMenuAction[] = [
    { key: "reply", label: "Reply", icon: <Reply className="h-4 w-4" />, onClick: props.onReply },
    props.onCopy && { key: "copy", label: "Copy", icon: <Copy className="h-4 w-4" />, onClick: props.onCopy },
    props.onForward && { key: "forward", label: "Forward", icon: <Forward className="h-4 w-4" />, onClick: props.onForward },
    props.onPin && { key: "pin", label: "Pin", icon: <Pin className="h-4 w-4" />, onClick: props.onPin },
    props.onSelect && { key: "select", label: "Select", icon: <CheckSquare className="h-4 w-4" />, onClick: props.onSelect },
    props.isOwn && props.canEdit && props.onEdit && { key: "edit", label: "Edit", icon: <Pencil className="h-4 w-4" />, onClick: props.onEdit },
    props.isOwn && props.onDelete && { key: "delete", label: "Delete", icon: <Trash2 className="h-4 w-4" />, onClick: props.onDelete, destructive: true },
  ].filter(Boolean) as MessageMenuAction[];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className="min-w-44 overflow-hidden rounded-xl border bg-popover py-1 shadow-xl"
    >
      {items.map((it) => (
        <button
          key={it.key}
          onClick={it.onClick}
          className={`flex w-full items-center gap-3 px-3 py-2 text-sm transition-colors hover:bg-muted ${
            it.destructive ? "text-destructive" : "text-foreground"
          }`}
        >
          {it.icon}
          <span>{it.label}</span>
        </button>
      ))}
    </motion.div>
  );
}
