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
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35 }}
    className="flex flex-col items-center justify-center text-center py-16 px-6"
  >
    <div className="relative mb-4">
      <div className="absolute inset-0 rounded-full blur-2xl bg-primary/20" />
      <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/15 to-accent/10 border border-primary/20 flex items-center justify-center">
        <Icon size={32} className="text-primary" />
      </div>
    </div>
    <h3 className="text-lg font-bold font-cairo mb-1.5">{title}</h3>
    {description && (
      <p className="text-sm text-muted-foreground font-cairo max-w-xs leading-relaxed">{description}</p>
    )}
    {action && <div className="mt-5">{action}</div>}
  </motion.div>
);

export default EmptyState;
