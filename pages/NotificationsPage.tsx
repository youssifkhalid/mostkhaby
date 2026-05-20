import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Bell, Loader2, CheckCheck, UserPlus, MessageSquare, Heart, Users, Trash2, Volume2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "@/hooks/useNotifications";
import { format, formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { useSettings } from "@/hooks/useSettings";
import { playNotificationSound } from "@/lib/notificationSounds";

const notifIcons: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  message: { icon: MessageSquare, color: "text-primary", bg: "bg-primary/15", label: "رسائل" },
  follow: { icon: UserPlus, color: "text-accent", bg: "bg-accent/15", label: "متابعات" },
  reply: { icon: Heart, color: "text-pink-500", bg: "bg-pink-500/15", label: "ردود" },
  friend: { icon: Users, color: "text-green-500", bg: "bg-green-500/15", label: "أصدقاء" },
};

const tabs = [
  { id: "all", label: "الكل" },
  { id: "message", label: "رسائل" },
  { id: "reply", label: "ردود" },
  { id: "follow", label: "متابعات" },
];

const NotificationsPage = () => {
  const navigate = useNavigate();
  const { notifications, isLoading, markAsRead } = useNotifications();
  const { user } = useAuth();
  const { settings } = useSettings();
  const qc = useQueryClient();
  const [filter, setFilter] = useState("all");

  const filtered = useMemo(() => {
    if (filter === "all") return notifications;
    return notifications.filter((n: any) => n.type === filter);
  }, [notifications, filter]);

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    qc.setQueryData(["notifications", user.id], (old: any[]) => old?.map((n: any) => ({ ...n, is_read: true })) || []);
    toast.success("تم قراءة الكل ✅");
  };

  const clearAll = async () => {
    if (!user) return;
    if (!confirm("متأكد إنك عايز تمسح كل الإشعارات؟")) return;
    // notifications table has no DELETE policy — fall back to mark read
    await markAllRead();
  };

  const testSound = () => {
    playNotificationSound((settings as any)?.notification_sound || "default", (settings as any)?.notification_volume ?? 80);
    toast.success("🎵 تجربة الصوت");
  };

  const unreadCount = notifications.filter((n: any) => !n.is_read).length;

  const handleClick = (n: any) => {
    if (!n.is_read) markAsRead.mutate(n.id);
    if (n.type === "message") navigate("/chats");
    else if (n.type === "follow") navigate("/notifications");
  };

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-40 bg-background/70 backdrop-blur-2xl border-b border-border/20">
        <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
          <div className="flex items-center gap-1">
            <button onClick={testSound} className="p-2 rounded-xl hover:bg-secondary/50 transition-colors" title="تجربة الصوت">
              <Volume2 size={18} className="text-muted-foreground" />
            </button>
            {unreadCount > 0 && (
              <motion.button whileTap={{ scale: 0.95 }} onClick={markAllRead} className="flex items-center gap-1 text-xs text-primary font-cairo font-semibold px-2">
                <CheckCheck size={14} /> قراءة الكل
              </motion.button>
            )}
          </div>
          <h1 className="font-cairo font-bold text-lg text-foreground flex items-center gap-2">
            الإشعارات
            {unreadCount > 0 && (
              <span className="text-[10px] bg-primary text-primary-foreground rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 font-bold">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </h1>
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-secondary/50 transition-colors">
            <ArrowRight size={22} className="text-foreground" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-4 pb-2 max-w-lg mx-auto">
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
            {tabs.map((t) => {
              const count = t.id === "all" ? notifications.length : notifications.filter((n: any) => n.type === t.id).length;
              const active = filter === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setFilter(t.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-cairo font-semibold whitespace-nowrap transition-all ${
                    active ? "bg-primary text-primary-foreground shadow-md" : "bg-secondary/40 text-muted-foreground hover:bg-secondary/70"
                  }`}
                >
                  {t.label} {count > 0 && <span className="opacity-70">({count})</span>}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-2">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={28} className="animate-spin text-primary" />
          </div>
        ) : filtered.length > 0 ? (
          <AnimatePresence mode="popLayout">
            {filtered.map((notif: any, i: number) => {
              const date = new Date(notif.created_at);
              const iconInfo = notifIcons[notif.type] || notifIcons.message;
              const IconComp = iconInfo.icon;
              return (
                <motion.div
                  key={notif.id}
                  layout
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: Math.min(i * 0.02, 0.3) }}
                  onClick={() => handleClick(notif)}
                  className={`glass-card p-4 flex items-start gap-3 cursor-pointer transition-all hover:bg-secondary/20 ${!notif.is_read ? "border-primary/30 bg-primary/5 shadow-[0_2px_12px_hsl(var(--primary)/0.1)]" : ""}`}
                >
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${!notif.is_read ? iconInfo.bg : "bg-secondary"}`}>
                    <IconComp size={18} className={!notif.is_read ? iconInfo.color : "text-muted-foreground"} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-cairo break-words ${!notif.is_read ? "text-foreground font-semibold" : "text-foreground/80"}`}>
                      {notif.content}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] text-muted-foreground">
                        {formatDistanceToNow(date, { addSuffix: true, locale: ar })}
                      </span>
                      <span className="text-[10px] text-muted-foreground/50">
                        · {format(date, "h:mm a", { locale: ar })}
                      </span>
                    </div>
                  </div>
                  {!notif.is_read && (
                    <div className="w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0 mt-2 shadow-[0_0_8px_hsl(var(--primary))]" />
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        ) : (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-20 space-y-4">
            <div className="w-24 h-24 mx-auto bg-primary/10 rounded-3xl flex items-center justify-center">
              <Bell size={48} className="text-primary" />
            </div>
            <h3 className="font-cairo font-bold text-xl text-foreground">مفيش إشعارات هنا</h3>
            <p className="text-sm text-muted-foreground">جرب تبويب تاني أو استنى لما يجيلك إشعار جديد 🔔</p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
