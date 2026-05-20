import { useLocation, useNavigate } from "react-router-dom";
import { User, Home, Settings, MessageCircle, Bell } from "lucide-react";
import { motion } from "framer-motion";
import { useNotifications } from "@/hooks/useNotifications";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { forwardRef } from "react";

const tabs = [
  { path: "/settings", icon: Settings, label: "الإعدادات" },
  { path: "/chats", icon: MessageCircle, label: "الشات" },
  { path: "/", icon: Home, label: "الرئيسية" },
  { path: "/notifications", icon: Bell, label: "الإشعارات" },
  { path: "/profile", icon: User, label: "حسابي" },
];

const hiddenPaths = ["/auth"];

const BottomNav = forwardRef<HTMLElement>((_, ref) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { notifications } = useNotifications();
  const { totalUnread } = useUnreadMessages();

  const unreadNotifCount = notifications.filter((n: any) => !n.is_read).length;

  if (hiddenPaths.includes(location.pathname)) return null;
  if (location.pathname.startsWith("/chat/")) return null;
  if (location.pathname.startsWith("/send/")) return null;
  const knownPaths = ["/", "/profile", "/settings", "/notifications", "/chats", "/about", "/community"];
  if (!knownPaths.includes(location.pathname) && !location.pathname.startsWith("/chat/")) return null;

  return (
    <nav
      ref={ref}
      className="fixed bottom-0 left-0 right-0 z-50 glass-card border-t border-border/20 pb-safe"
    >
      <div className="flex items-center justify-around py-2 px-1 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;

          // Notifications badge
          const showNotifBadge = tab.path === "/notifications" && unreadNotifCount > 0;
          const badgeCount = showNotifBadge ? unreadNotifCount : 0;

          // Chat unread badge
          const showChatBadge = tab.path === "/chats" && totalUnread > 0;
          const chatBadgeCount = totalUnread;

          return (
            <motion.button
              key={tab.path}
              whileTap={{ scale: 0.85 }} whileHover={{ scale: 1.05 }}
              onClick={() => {
                if (navigator.vibrate) navigator.vibrate(8);
                navigate(tab.path);
              }}
              className={`bottom-nav-item relative px-3 py-1.5 rounded-xl ${isActive ? "active" : ""}`}
            >
              {isActive && (
                <motion.div
                  layoutId="nav-pill"
                  className="absolute inset-0 bg-primary/10 rounded-xl border border-primary/20"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}

              <div className="relative">
                <tab.icon size={20} className={isActive ? "text-primary" : ""} />

                {/* Notifications badge */}
                {showNotifBadge && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center"
                  >
                    {badgeCount > 99 ? "99+" : badgeCount}
                  </motion.span>
                )}

                {/* Chat unread badge */}
                {showChatBadge && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.4, times: [0, 0.5, 1] }}
                    className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] px-1 rounded-full bg-rose-500 text-white text-[9px] font-extrabold flex items-center justify-center shadow-[0_0_8px_rgba(239,68,68,0.7)]"
                  >
                    {chatBadgeCount > 99 ? "99+" : chatBadgeCount}
                  </motion.span>
                )}
              </div>

              <span className="font-cairo font-semibold text-[10px]">{tab.label}</span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
});

BottomNav.displayName = "BottomNav";

export default BottomNav;
