import { useLocation, useNavigate } from "react-router-dom";
import { User, Home, Settings, MessageCircle, Bell } from "lucide-react";
import { motion } from "framer-motion";
import { useNotifications } from "@/hooks/useNotifications";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { forwardRef, useMemo, useCallback } from "react";

const tabs = [
  { path: "/profile", icon: User, label: "حسابي" },
  { path: "/notifications", icon: Bell, label: "الإشعارات" },
  { path: "/", icon: Home, label: "الرئيسية" },
  { path: "/chats", icon: MessageCircle, label: "الشات" },
  { path: "/settings", icon: Settings, label: "الإعدادات" },
];

const hiddenPaths = ["/auth"];

const BottomNav = forwardRef<HTMLElement>((_, ref) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { notifications } = useNotifications();
  const { totalUnread } = useUnreadMessages();

  const unreadNotifCount = useMemo(
    () => notifications.filter((n: any) => !n.is_read).length,
    [notifications]
  );

  const handleNavigate = useCallback(
    (path: string) => {
      if (navigator.vibrate) navigator.vibrate(8);
      navigate(path);
    },
    [navigate]
  );

  if (hiddenPaths.includes(location.pathname)) return null;
  if (location.pathname.startsWith("/chat/")) return null;
  if (location.pathname.startsWith("/send/")) return null;
  const knownPaths = ["/", "/profile", "/settings", "/notifications", "/chats", "/about", "/community"];
  if (!knownPaths.includes(location.pathname) && !location.pathname.startsWith("/chat/")) return null;

  return (
    <nav
      ref={ref}
      className="fixed bottom-0 left-0 right-0 z-50 pb-safe"
      style={{
        background: "hsl(var(--background) / 0.65)",
        backdropFilter: "blur(24px) saturate(1.5)",
        WebkitBackdropFilter: "blur(24px) saturate(1.5)",
        borderTop: "1px solid hsl(var(--border) / 0.12)",
        boxShadow: "0 -4px 24px -4px hsl(0 0% 0% / 0.15)",
      }}
    >
      <div className="flex items-center justify-around py-1.5 px-1 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          const showNotifBadge = tab.path === "/notifications" && unreadNotifCount > 0;
          const badgeCount = showNotifBadge ? unreadNotifCount : 0;
          const showChatBadge = tab.path === "/chats" && totalUnread > 0;

          return (
            <motion.button
              key={tab.path}
              whileTap={{ scale: 0.82 }}
              onClick={() => handleNavigate(tab.path)}
              className={`bottom-nav-item relative px-3 py-2 rounded-2xl`}
              aria-label={tab.label}
              aria-current={isActive ? "page" : undefined}
            >
              {isActive && (
                <motion.div
                  layoutId="nav-pill"
                  className="absolute inset-0 rounded-2xl"
                  style={{
                    background: "hsl(var(--primary) / 0.1)",
                    border: "1px solid hsl(var(--primary) / 0.18)",
                    boxShadow: "0 0 16px -4px hsl(var(--primary) / 0.2)",
                  }}
                  transition={{ type: "spring", stiffness: 500, damping: 32 }}
                />
              )}

              <div className="relative z-10">
                <motion.div
                  animate={isActive ? { y: -1 } : { y: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <tab.icon
                    size={20}
                    className={`transition-colors duration-200 ${
                      isActive ? "text-primary" : "text-muted-foreground"
                    }`}
                    strokeWidth={isActive ? 2.3 : 1.8}
                  />
                </motion.div>

                {/* Notifications badge */}
                {showNotifBadge && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 25 }}
                    className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] px-1 rounded-full flex items-center justify-center text-[9px] font-bold"
                    style={{
                      background: "var(--gradient-primary)",
                      color: "hsl(var(--primary-foreground))",
                      boxShadow: "0 0 10px -2px hsl(var(--primary) / 0.5)",
                    }}
                  >
                    {badgeCount > 99 ? "99+" : badgeCount}
                  </motion.span>
                )}

                {/* Chat unread badge */}
                {showChatBadge && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 25 }}
                    className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] px-1 rounded-full flex items-center justify-center text-[9px] font-extrabold"
                    style={{
                      background: "linear-gradient(135deg, hsl(350, 80%, 55%), hsl(340, 85%, 60%))",
                      color: "white",
                      boxShadow: "0 0 10px -2px hsl(350 80% 55% / 0.6)",
                    }}
                  >
                    {totalUnread > 99 ? "99+" : totalUnread}
                  </motion.span>
                )}
              </div>

              <span
                className={`font-cairo font-semibold text-[10px] relative z-10 transition-colors duration-200 ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {tab.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
});

BottomNav.displayName = "BottomNav";

export default BottomNav;
