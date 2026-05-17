import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

interface AppHeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  right?: ReactNode;
  left?: ReactNode;
  showLogo?: boolean;
  subtitle?: string;
}

export default function AppHeader({
  title,
  showBack,
  onBack,
  right,
  left,
  showLogo,
  subtitle,
}: AppHeaderProps) {
  const navigate = useNavigate();

  return (
    <header
      className="sticky top-0 z-40 pt-safe"
      style={{
        background: "rgba(10,8,18,0.8)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        borderBottom: "1px solid var(--border-soft)",
      }}
    >
      <div className="h-14 flex items-center justify-between gap-2 px-3 max-w-2xl mx-auto">
        <div className="flex items-center gap-2 min-w-0">
          {showBack && (
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={() => (onBack ? onBack() : navigate(-1))}
              className="w-9 h-9 rounded-full flex items-center justify-center text-foreground/80 hover:bg-white/5"
              aria-label="رجوع"
            >
              {/* In RTL, ChevronRight visually points back */}
              <ChevronRight size={22} />
            </motion.button>
          )}
          {left}
          {showLogo && (
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-black"
                style={{ background: "var(--cta-gradient)", boxShadow: "var(--shadow-glow)" }}
              >
                م
              </div>
              <span className="font-cairo font-extrabold text-lg gradient-text-mesh">مستخبي</span>
            </div>
          )}
          {title && !showLogo && (
            <div className="min-w-0">
              <h1 className="font-cairo font-bold text-[17px] truncate">{title}</h1>
              {subtitle && <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">{right}</div>
      </div>
    </header>
  );
}
