import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface Props {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

const EmptyState = ({ icon: Icon, title, description, action }: Props) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ type: "spring", stiffness: 100, damping: 20 }}
    className="flex flex-col items-center justify-center text-center py-16 px-8 rounded-3xl glass-card border border-border/20 max-w-sm mx-auto my-8 relative overflow-hidden shadow-2xl"
  >
    {/* Animated Ambient Glow */}
    <motion.div
      animate={{
        scale: [1, 1.15, 1],
        opacity: [0.15, 0.25, 0.15],
      }}
      transition={{
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      className="absolute -top-12 -left-12 w-32 h-32 rounded-full blur-3xl bg-primary"
    />
    <motion.div
      animate={{
        scale: [1, 1.2, 1],
        opacity: [0.1, 0.2, 0.1],
      }}
      transition={{
        duration: 5,
        repeat: Infinity,
        ease: "easeInOut",
        delay: 1,
      }}
      className="absolute -bottom-12 -right-12 w-32 h-32 rounded-full blur-3xl bg-accent"
    />

    <div className="relative mb-6">
      {/* Outer Pulse rings */}
      <motion.div
        animate={{ scale: [1, 1.4, 1], opacity: [0.2, 0, 0.2] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeOut" }}
        className="absolute inset-0 rounded-full border border-primary/30"
      />
      <motion.div
        animate={{ scale: [1, 1.6, 1], opacity: [0.1, 0, 0.1] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
        className="absolute inset-0 rounded-full border border-accent/20"
      />

      <div className="absolute inset-0 rounded-full blur-xl bg-gradient-to-tr from-primary/30 to-accent/20 animate-pulse" />
      
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="relative w-24 h-24 rounded-[2rem] bg-gradient-to-tr from-card to-card/90 border border-primary/20 flex items-center justify-center shadow-xl"
      >
        <Icon size={38} className="text-primary drop-shadow-[0_0_15px_rgba(var(--primary),0.5)]" />
      </motion.div>
    </div>

    <motion.h3
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="text-xl font-black font-cairo mb-2 text-foreground tracking-wide"
    >
      {title}
    </motion.h3>

    {description && (
      <motion.p
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-sm text-muted-foreground font-cairo max-w-xs leading-relaxed px-2"
      >
        {description}
      </motion.p>
    )}

    {action && (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        className="mt-6 w-full flex justify-center"
      >
        {action}
      </motion.div>
    )}
  </motion.div>
);

export default EmptyState;

