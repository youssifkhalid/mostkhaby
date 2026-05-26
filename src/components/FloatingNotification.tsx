import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSettings } from "@/hooks/useSettings";
import { Bell, Heart, Users, MessageSquare, UserPlus, AlertCircle, CheckCircle2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Notification {
  id: string;
  type: "message" | "follow" | "reply" | "friend" | "system";
  content: string;
  createdAt: string;
  read: boolean;
  relatedId?: string;
}

interface FloatingNotifConfig {
  icon: React.ReactNode;
  bgColor: string;
  textColor: string;
  borderColor: string;
  label: string;
}

const getNotifConfig = (type: string): FloatingNotifConfig => {
  const configs: Record<string, FloatingNotifConfig> = {
    message: {
      icon: <MessageSquare size={20} />,
      bgColor: "from-blue-600 to-blue-700",
      textColor: "text-blue-900",
      borderColor: "border-blue-300",
      label: "رسالة جديدة",
    },
    follow: {
      icon: <UserPlus size={20} />,
      bgColor: "from-purple-600 to-purple-700",
      textColor: "text-purple-900",
      borderColor: "border-purple-300",
      label: "متابع جديد",
    },
    reply: {
      icon: <Heart size={20} />,
      bgColor: "from-pink-600 to-pink-700",
      textColor: "text-pink-900",
      borderColor: "border-pink-300",
      label: "رد جديد",
    },
    friend: {
      icon: <Users size={20} />,
      bgColor: "from-green-600 to-green-700",
      textColor: "text-green-900",
      borderColor: "border-green-300",
      label: "صديق جديد",
    },
    system: {
      icon: <AlertCircle size={20} />,
      bgColor: "from-amber-600 to-amber-700",
      textColor: "text-amber-900",
      borderColor: "border-amber-300",
      label: "تنبيه نظام",
    },
  };
  return configs[type] || configs.system;
};

const FloatingNotification = () => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const handleNotificationClick = useCallback(
    (notif: Notification) => {
      dismissNotification(notif.id);

      // Navigate based on notification type
      if (notif.type === "message") {
        navigate("/chats");
      } else if (notif.type === "follow" || notif.type === "reply") {
        navigate("/notifications");
      } else if (notif.type === "friend" && notif.relatedId) {
        navigate(`/${notif.relatedId}`);
      }
    },
    [navigate, dismissNotification]
  );

  // Listen for new notifications
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`floating-notif-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotif: Notification = {
            id: payload.new.id,
            type: payload.new.type,
            content: payload.new.content,
            createdAt: payload.new.created_at,
            read: payload.new.is_read,
            relatedId: payload.new.related_user_id,
          };

          // Don't show floating notification for message type (handled by toast)
          if (newNotif.type === "message") return;

          setNotifications((prev) => [newNotif, ...prev].slice(0, 3));

          // Auto-dismiss after 5 seconds
          const timer = setTimeout(
            () => dismissNotification(newNotif.id),
            5000
          );

          return () => clearTimeout(timer);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, dismissNotification]);

  return (
    <AnimatePresence mode="popLayout">
      <div className="fixed top-4 left-4 right-4 z-40 pointer-events-none">
        <div className="flex flex-col gap-2 max-w-sm mx-auto">
          {notifications.map((notif, idx) => {
            const config = getNotifConfig(notif.type);

            return (
              <motion.div
                key={notif.id}
                layout
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{
                  duration: 0.3,
                  delay: idx * 0.05,
                  ease: "easeOut",
                }}
                onClick={() => handleNotificationClick(notif)}
                className={`
                  glass-card pointer-events-auto cursor-pointer
                  bg-gradient-to-r ${config.bgColor}
                  border ${config.borderColor}
                  p-3.5 rounded-2xl
                  flex items-start gap-3
                  group hover:shadow-lg hover:shadow-current/20
                  transition-all duration-200
                  backdrop-blur-xl
                  active:scale-95
                `}
              >
                {/* Icon */}
                <div className="mt-0.5 flex-shrink-0 text-white/90">
                  {config.icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-cairo font-bold text-white/95 leading-tight">
                    {config.label}
                  </p>
                  <p className="text-xs text-white/75 mt-1 line-clamp-2 font-cairo">
                    {notif.content}
                  </p>
                </div>

                {/* Close button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    dismissNotification(notif.id);
                  }}
                  className="flex-shrink-0 ml-2 p-1.5 rounded-lg hover:bg-white/20 transition-colors text-white/70 hover:text-white"
                  aria-label="إغلاق"
                >
                  <X size={16} />
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>
    </AnimatePresence>
  );
};

export default FloatingNotification;
