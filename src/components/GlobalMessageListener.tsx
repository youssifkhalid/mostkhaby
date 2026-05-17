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

/**
 * ✅ المكان الوحيد في التطبيق اللي فيه Realtime channels.
 *
 * عندنا 3 channels منفصلة — كل useEffect بـ [user?.id] فقط:
 *   chat-msgs-{id}    → INSERT على chat_messages
 *   notif-ins-{id}    → INSERT على notifications
 *   notif-upd-{id}    → UPDATE على notifications
 *
 * ليه منفصلين ومش .on().on().subscribe() على واحد؟
 * ────────────────────────────────────────────────
 * لو عملنا useEffect واحد بـ .on(INSERT).on(UPDATE).subscribe()
 * وكان settings أو أي حاجة تانية في الـ deps،
 * الـ effect بيشتغل تاني → cleanup → channel جديد بنفس الاسم →
 * Supabase بيشوف الـ channel القديم لسه في الـ registry →
 * بيحاول يضيف .on() عليه بعد subscribe → CRASH.
 *
 * الحل: كل channel في useEffect منفصل بـ [user?.id] فقط.
 * settings محفوظة في useRef — بنقرأ settingsRef.current
 * جوه الـ callback بدل ما نحطها في الـ deps.
 */
const GlobalMessageListener = () => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const qc = useQueryClient();

  // settings في ref عشان ما نحتاجش نحطها في deps
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // ── Channel 1: رسائل شات جديدة ──────────────────────────────
  useEffect(() => {
    if (!user?.id) return;

    const ch = supabase
      .channel(`chat-msgs-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        async (payload: any) => {
          const msg = payload.new;
          if (!msg || msg.sender_id === user.id) return;

          const onSameChat = window.location.pathname === `/chat/${msg.chat_id}`;

          if (!onSameChat) {
            const s: any = settingsRef.current;
            if (!s || s.in_app_sound_enabled !== false)
              playNotificationSound(s?.notification_sound || "default", s?.notification_volume ?? 80);
            if (!s || s.vibration_enabled !== false)
              vibrate([60, 40, 60]);
          }

          const currentChats: any[] = qc.getQueryData(["chats", user.id]) || [];
          const chatInList = currentChats.some((c: any) => c.id === msg.chat_id);

          if (!chatInList) {
            try {
              const { data: newChat } = await supabase
                .from("chats")
                .select(CHAT_SELECT)
                .eq("id", msg.chat_id)
                .single();
              if (newChat && !(newChat.deleted_by || []).includes(user.id)) {
                qc.setQueryData(["chats", user.id], (old: any[]) => {
                  const list = old || [];
                  if (list.some((c: any) => c.id === newChat.id)) return list;
                  return [newChat, ...list];
                });
              }
            } catch {}
          } else {
            qc.setQueryData(["chats", user.id], (old: any[]) => {
              if (!old) return old;
              return old
                .map((c: any) =>
                  c.id === msg.chat_id
                    ? { ...c, last_message_at: msg.created_at, last_message_content: msg.content }
                    : c
                )
                .sort(
                  (a: any, b: any) =>
                    new Date(b.last_message_at || 0).getTime() -
                    new Date(a.last_message_at || 0).getTime()
                );
            });
          }

          if (!onSameChat) {
            qc.setQueryData(["unread-messages", user.id], (old: any[]) => {
              const list = old || [];
              if (list.some((m: any) => m.id === msg.id)) return list;
              return [...list, {
                id: msg.id,
                chat_id: msg.chat_id,
                sender_id: msg.sender_id,
                status: msg.status || "sent",
                is_deleted: false,
              }];
            });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [user?.id]); // ✅ user?.id فقط

  // ── Channel 2: إشعارات جديدة ─────────────────────────────────
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
          qc.setQueryData(["notifications", user.id], (old: any[]) => {
            if (!old) return [payload.new];
            if (old.some((n: any) => n.id === payload.new.id)) return old;
            return [payload.new, ...old];
          });
          const s: any = settingsRef.current;
          if (!s || s.in_app_sound_enabled !== false)
            playNotificationSound(s?.notification_sound || "default", s?.notification_volume ?? 80);
          if (!s || s.vibration_enabled !== false)
            vibrate([60, 40, 60]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [user?.id]); // ✅ user?.id فقط

  // ── Channel 3: تحديث إشعار موجود ────────────────────────────
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
          qc.setQueryData(["notifications", user.id], (old: any[]) =>
            old?.map((n: any) =>
              n.id === payload.new.id ? { ...n, ...payload.new } : n
            )
          );
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [user?.id]); // ✅ user?.id فقط

  return null;
};

export default GlobalMessageListener;
