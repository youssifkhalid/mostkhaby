import { motion } from "framer-motion";

interface Props {
  name?: string;
}

export function TypingIndicator({ name }: Props) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.92, y: 5 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: 5 }}
      className="flex items-center gap-2.5 px-5 py-2.5"
    >
      <div className="flex items-center gap-1.5 rounded-3xl rounded-bl-sm glass-card bg-card/70 backdrop-blur-md border border-border/20 px-4 py-3 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="block h-2 w-2 rounded-full bg-primary/70 shadow-[0_0_8px_rgba(139,92,246,0.3)]"
            animate={{ 
              y: [0, -5, 0], 
              scale: [1, 1.25, 1],
              backgroundColor: ["rgba(139,92,246,0.5)", "rgba(139,92,246,0.9)", "rgba(139,92,246,0.5)"]
            }}
            transition={{ 
              duration: 1.1, 
              repeat: Infinity, 
              ease: "easeInOut",
              delay: i * 0.18 
            }}
          />
        ))}
      </div>
      {name && (
        <span className="text-xs font-semibold font-cairo text-muted-foreground/80 tracking-wide animate-pulse">
          {name} يكتب الآن...
        </span>
      )}
    </motion.div>
  );
}
