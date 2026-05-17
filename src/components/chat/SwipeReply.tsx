import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { Reply } from "lucide-react";
import { useRef } from "react";

interface Props {
  children: React.ReactNode;
  onReply: () => void;
  direction?: "left" | "right"; // own bubble swipes left, other swipes right
  threshold?: number;
}

/**
 * Drag a chat bubble horizontally to reveal a reply icon.
 * Release past threshold to trigger onReply (WhatsApp-style).
 */
export function SwipeReply({ children, onReply, direction = "right", threshold = 64 }: Props) {
  const x = useMotionValue(0);
  const triggered = useRef(false);

  const iconOpacity = useTransform(
    x,
    direction === "right" ? [0, threshold] : [0, -threshold],
    [0, 1],
  );
  const iconScale = useTransform(
    x,
    direction === "right" ? [0, threshold] : [0, -threshold],
    [0.6, 1],
  );

  return (
    <div className="relative">
      <motion.div
        style={{
          opacity: iconOpacity,
          scale: iconScale,
          [direction === "right" ? "left" : "right"]: 8,
        }}
        className="pointer-events-none absolute top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary"
      >
        <Reply className="h-4 w-4" />
      </motion.div>

      <motion.div
        style={{ x }}
        drag="x"
        dragConstraints={
          direction === "right" ? { left: 0, right: 100 } : { left: -100, right: 0 }
        }
        dragElastic={0.25}
        dragMomentum={false}
        onDrag={(_, info) => {
          const reached = direction === "right" ? info.offset.x > threshold : info.offset.x < -threshold;
          if (reached && !triggered.current) {
            triggered.current = true;
            if (navigator.vibrate) navigator.vibrate(12);
          }
        }}
        onDragEnd={(_, info) => {
          const reached = direction === "right" ? info.offset.x > threshold : info.offset.x < -threshold;
          if (reached) onReply();
          triggered.current = false;
          animate(x, 0, { type: "spring", stiffness: 500, damping: 40 });
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}
