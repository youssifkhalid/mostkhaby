import { Bell, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MstkhbiLogo from "./MstkhbiLogo";
import { useNotifications } from "@/hooks/useNotifications";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { motion } from "framer-motion";

const TopBar = () => {
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();
  const { canInstall, install } = usePWAInstall();

  return (
    <header className="sticky top-0 z-40 bg-background/60 backdrop-blur-2xl border-b border-border/15">
      <div className="flex items-center justify-between px-3 py-2.5 max-w-lg mx-auto gap-2">
        {/* Left cluster: quick page actions */}
        <div className="flex items-center gap-1">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate("/notifications")}
            className="relative p-2 rounded-xl hover:bg-secondary/50 transition-colors"
            aria-label="الإشعارات"
            title="الإشعارات"
          >
            <Bell size={18} className="text-foreground" />
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-0.5 right-0.5 min-w-[16px] h-[16px] px-1 rounded-full gradient-primary flex items-center justify-center text-[9px] font-bold text-primary-foreground"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </motion.span>
            )}
          </motion.button>
          {canInstall && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={install}
              className="p-2 rounded-xl hover:bg-secondary/50 transition-colors"
              aria-label="تثبيت التطبيق"
              title="تثبيت التطبيق"
            >
              <Download size={18} className="text-accent" />
            </motion.button>
          )}
        </div>

        {/* Right cluster: logo */}
        <div className="flex items-center gap-2">
          <MstkhbiLogo size="sm" />
        </div>
      </div>
    </header>
  );
};

export default TopBar;
