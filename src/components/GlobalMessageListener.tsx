// src/components/GlobalMessageListener.tsx
/**
 * ═══════════════════════════════════════════════════════════════
 * GlobalMessageListener — المصدر الوحيد لكل الـ Realtime في التطبيق
 * ═══════════════════════════════════════════════════════════════
 *
 * الحل الهندسي:
 * ─────────────
 * • 4 channels منفصلة — كل useEffect بـ [user?.id] فقط
 * • settings في useRef — لا تدخل في deps أبدًا
 * • كل channel: .on(...).on(...).subscribe() بدون أي تعديل بعد subscribe()
 * • cleanup كامل عند unmount
 *
 * CHANNELS:
 * 1. chat-msgs-{id}   → INSERT على chat_messages
 * 2. unread-rt-{id}   → UPDATE على chat_messages (للـ badge)
 * 3. notif-ins-{id}   → INSERT على notifications
 * 4. notif-upd-{id}   → UPDATE على notifications
 *
 * INTELLIGENT NOTIFICATION LOGIC (مثل Messenger):
 * ─────────────────────────────────────────────────
 * • المستخدم داخل نفس الشات → لا صوت، لا badge، لا notification
 * • المستخدم خارج الشات → كل الإشعارات تعمل طبيعي
 */

import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSettings } from "@/hooks/useSettings";
import { playNotificationSound, vibrate } from "@/lib/notificationSounds";
import { useQueryClient } from "@tanstack/react-query";

const CHAT_SELECT =
  "id,user1_id,user2_id,last_message_at,last_message_content,deleted_by,cleared_before," +
  "user1:profiles!chats_user1_id_fkey(id,username,full_name,avatar_url,is_online,last_seen)," +
  "user2:profiles!chats_user2_id_fkey(id,username,full_name,avatar_url,is_online,last_seen)";

/** هل المستخدم حاليًا داخل المحادثة المحددة؟ */
function isOnSameChat(chatId: string): boolean {
  const path = window.location.pathname;
  return (
    path === `/chat/${chatId}` ||
    path === `/chats/${chatId}` ||
    path.startsWith(`/chat/${chatId}/`)
  );
}

const GlobalMessageListener = () => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const qc = useQueryClient();

  // ✅ settings في ref — لا تدخل في deps أبدًا
  const settingsRef = useRef(settings);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  // ✅ qc في ref كذلك
  const qcRef = useRef(qc);
  useEffect(() => { qcRef.current = qc; }, [qc]);

  // ══════════════════════════════════════════════════════════════
  // CHANNEL 1: رسائل شات جديدة
  // ══════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!user?.id) return;

    const ch = supabase
      .channel(`chat-msgs-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        async (payload: any) => {
          const msg = payload.new;
          if (!msg) return;

          // رسالتي أنا → تجاهل (optimistic update يكفي)
          if (msg.sender_id === user.id) return;

          const onSameChat = isOnSameChat(msg.chat_id);
          const s: any = settingsRef.current;

          // ✅ صوت + vibration فقط إذا خارج المحادثة
          if (!onSameChat) {
            if (!s || s.in_app_sound_enabled !== false) {
              playNotificationSound(
                s?.notification_sound || "default",
                s?.notification_volume ?? 80
              );
            }
            if (!s || s.vibration_enabled !== false) {
              vibrate([60, 40, 60]);
            }
          }

          // ✅ دائمًا حدّث قائمة المحادثات
          const currentChats: any[] =
            qcRef.current.getQueryData(["chats", user.id]) || [];
          const chatInList = currentChats.some((c: any) => c.id === msg.chat_id);

          if (!chatInList) {
            // محادثة جديدة — اجلبها كاملة مع بيانات المستخدمين
            try {
              const { data: newChat } = await supabase
                .from("chats")
                .select(CHAT_SELECT)
                .eq("id", msg.chat_id)
                .single();

              if (newChat && !(newChat.deleted_by || []).includes(user.id)) {
                qcRef.current.setQueryData(["chats", user.id], (old: any[]) => {
                  const list = old || [];
                  if (list.some((c: any) => c.id === newChat.id)) return list;
                  return [newChat, ...list];
                });
              }
            } catch { /* تجاهل أخطاء fetch */ }
          } else {
            // محادثة موجودة — حدّث last_message فقط
            qcRef.current.setQueryData(["chats", user.id], (old: any[]) => {
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

          // ✅ unread badge: فقط إذا خارج المحادثة
          if (!onSameChat) {
            qcRef.current.setQueryData(
              ["unread-messages", user.id],
              (old: any[]) => {
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
              }
            );
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [user?.id]); // ✅ user?.id فقط

  // ══════════════════════════════════════════════════════════════
  // CHANNEL 2: تحديث حالة الرسائل (للـ unread badge)
  // ══════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!user?.id) return;

    const ch = supabase
      .channel(`unread-rt-${user.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chat_messages" },
        (payload: any) => {
          const m = payload.new;
          if (!m) return;

          // رسالة أصبحت read أو محذوفة → أزلها من unread cache
          if (m.status === "read" || m.is_deleted) {
            qcRef.current.setQueryData(
              ["unread-messages", user.id],
              (old: any[] = []) => old.filter((r) => r.id !== m.id)
            );
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  // ══════════════════════════════════════════════════════════════
  // CHANNEL 3: إشعارات جديدة
  // ══════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!user?.id) return;

    const ch = supabase
      .channel(`notif-ins-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // أضف الإشعار للـ cache
          qcRef.current.setQueryData(
            ["notifications", user.id],
            (old: any[]) => {
              if (!old) return [payload.new];
              if (old.some((n: any) => n.id === payload.new.id)) return old;
              return [payload.new, ...old];
            }
          );

          // صوت الإشعار (غير مرتبط بالشات)
          const s: any = settingsRef.current;
          if (!s || s.in_app_sound_enabled !== false) {
            playNotificationSound(
              s?.notification_sound || "default",
              s?.notification_volume ?? 80
            );
          }
          if (!s || s.vibration_enabled !== false) {
            vibrate([60, 40, 60]);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  // ══════════════════════════════════════════════════════════════
  // CHANNEL 4: تحديث إشعار موجود (is_read)
  // ══════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!user?.id) return;

    const ch = supabase
      .channel(`notif-upd-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          qcRef.current.setQueryData(
            ["notifications", user.id],
            (old: any[]) =>
              old?.map((n: any) =>
                n.id === payload.new.id ? { ...n, ...payload.new } : n
              )
          );
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  return null;
};

export default GlobalMessageListener;
