import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSettings } from "@/hooks/useSettings";
import { playNotificationSound, vibrate } from "@/lib/notificationSounds";
import { useQueryClient } from "@tanstack/react-query";

// ✅ CHAT_SELECT محتفظ بـ is_online — آمن بعد ما شغّلت السكريبت SQL
const CHAT_SELECT =
  "id,user1_id,user2_id,last_message_at,last_message_content,deleted_by,cleared_before," +
  "user1:profiles!chats_user1_id_fkey(id,username,full_name,avatar_url,is_online,last_seen)," +
  "user2:profiles!chats_user2_id_fkey(id,username,full_name,avatar_url,is_online,last_seen)";

/**
 * Listener عالمي لرسائل الشات الجديدة.
 * - يشغّل صوت + اهتزاز
 * - يضيف chats جديدة للـ cache فورًا (تظهر في ChatsPage على طول)
 * - يحدّث unread-messages cache عشان الـ badges تبقى دقيقة
 */
const GlobalMessageListener = () => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const qc = useQueryClient();

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`global-chat-msgs-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        async (payload: any) => {
          const msg = payload.new;
          if (!msg || msg.sender_id === user.id) return;

          const onSameChat =
            window.location.pathname === `/chat/${msg.chat_id}`;

          // ── 1. صوت + اهتزاز ──────────────────────────────────────
          if (!onSameChat) {
            const s: any = settings;
            if (!s || s.in_app_sound_enabled !== false) {
              playNotificationSound(
                s?.notification_sound || "default",
                s?.notification_volume ?? 80
              );
            }
            if (!s || s.vibration_enabled !== false) vibrate([60, 40, 60]);
          }

          // ── 2. ضمان وجود الـ chat في الـ cache ───────────────────
          // لو أول رسالة من صاحب جديد، ممكن الـ chat مش موجود في القائمة
          const currentChats: any[] =
            qc.getQueryData(["chats", user.id]) || [];
          const chatAlreadyInList = currentChats.some(
            (c: any) => c.id === msg.chat_id
          );

          if (!chatAlreadyInList) {
            // ✅ try/catch: لو جدول chats مش موجود لأي سبب، ما يكرشش
            try {
              const { data: newChat, error } = await supabase
                .from("chats")
                .select(CHAT_SELECT)
                .eq("id", msg.chat_id)
                .single();

              if (error) {
                console.warn("[GlobalMessageListener] تعذّر جلب الشات:", error.message);
              } else if (
                newChat &&
                !(newChat.deleted_by || []).includes(user.id)
              ) {
                qc.setQueryData(["chats", user.id], (old: any[]) => {
                  const list = old || [];
                  if (list.some((c: any) => c.id === newChat.id)) return list;
                  return [newChat, ...list];
                });
              }
            } catch (err) {
              console.warn("[GlobalMessageListener] خطأ غير متوقع:", err);
            }
          } else {
            // الـ chat موجود — فقط حدّث آخر رسالة في الـ cache
            qc.setQueryData(["chats", user.id], (old: any[]) => {
              if (!old) return old;
              return old
                .map((c: any) =>
                  c.id === msg.chat_id
                    ? {
                        ...c,
                        last_message_at: msg.created_at,
                        last_message_content: msg.content,
                      }
                    : c
                )
                .sort(
                  (a: any, b: any) =>
                    new Date(b.last_message_at || 0).getTime() -
                    new Date(a.last_message_at || 0).getTime()
                );
            });
          }

          // ── 3. تحديث unread-messages cache ────────────────────────
          if (!onSameChat) {
            qc.setQueryData(["unread-messages", user.id], (old: any[]) => {
              const list = old || [];
              if (list.some((m: any) => m.id === msg.id)) return list;
              return [
                ...list,
                {
                  id: msg.id,
                  chat_id: msg.chat_id,
                  sender_id: msg.sender_id,
                  status: msg.status || "sent",
                  is_deleted: false,
                },
              ];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, settings, qc]);

  return null;
};

export default GlobalMessageListener;
