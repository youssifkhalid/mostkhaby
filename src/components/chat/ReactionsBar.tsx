import { motion } from "framer-motion";

const QUICK = ["❤️", "😂", "😮", "😢", "👍", "🔥"];

interface Props {
  onPick: (emoji: string) => void;
  onMore?: () => void;
}

export function ReactionsBar({ onPick, onMore }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className="flex items-center gap-1 rounded-full border bg-popover px-2 py-1.5 shadow-lg"
    >
      {QUICK.map((e) => (
        <motion.button
          key={e}
          whileHover={{ scale: 1.25, y: -2 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => onPick(e)}
          className="text-xl leading-none"
        >
          {e}
        </motion.button>
      ))}
      {onMore && (
        <button
          onClick={onMore}
          className="ml-1 flex h-7 w-7 items-center justify-center rounded-full bg-muted text-sm text-muted-foreground hover:bg-muted/70"
          aria-label="More reactions"
        >
          +
        </button>
      )}
    </motion.div>
  );
}
