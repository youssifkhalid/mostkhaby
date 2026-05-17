import { motion } from "framer-motion";
import { forwardRef } from "react";

interface OnlineIndicatorProps {
  isOnline: boolean;
  size?: "sm" | "md";
}

const OnlineIndicator = forwardRef<HTMLDivElement, OnlineIndicatorProps>(({ isOnline, size = "sm" }, ref) => {
  const s = size === "sm" ? "w-2.5 h-2.5" : "w-3.5 h-3.5";
  if (!isOnline) return null;
  return (
    <motion.div
      ref={ref}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className={`${s} rounded-full bg-green-500 border-2 border-background`}
    >
      <motion.div
        className="w-full h-full rounded-full bg-green-500"
        animate={{ scale: [1, 1.5, 1], opacity: [1, 0.4, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
    </motion.div>
  );
});

OnlineIndicator.displayName = "OnlineIndicator";

export default OnlineIndicator;
