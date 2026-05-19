// src/components/GlobalMessageListener.tsx
/**
 * ═══════════════════════════════════════════════════════════════
 * GlobalMessageListener — المصدر الوحيد لكل الـ Realtime في التطبيق
 * ═══════════════════════════════════════════════════════════════
 *
 * FIXED:
 * ──────
 * 1. Unread badge: invalidates DB-driven get_unread_counts() instead
 *    of manually patching a local array
 * 2. Channel names include user.id to prevent cross-user collisions
 * 3. All channels built as .on().on().subscribe() — NEVER add .on() after subscribe()
 * 4. Full cleanup on unmount
 * 5. No duplicate sound: only fires when user is NOT on that chat
 *
 * CHANNELS (4 total — one useEffect each):
 * 1. chat-msgs-{id}   → INSERT on chat_messages
 * 2. notif-ins-{id}   → INSERT on notifications
 * 3. notif-upd-{id}   → UPDATE on notifications
 * 4. receipts-{id}    → INSERT/UPDATE on chat_read_receipts (other device sync)
 */

import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSettings } from "@/hooks/useSettings";
import { playNotificationSound, vibrate } from "@/lib/notificationSounds";
import { useQueryClient } from "@tanstack/react-query";

const CHAT_SELECT =
  "id,user1_id,user2_id,last_message_at,last_message_content,last_message_sender_id,deleted_by,cleared_before," +
  "user1:profiles!chats_user1_id_fkey(id,username,full_name,avatar_url,is_online,last_seen)," +
  "user2:profiles!chats_user2_id_fkey(id,username,full_name,avatar_url,is_online,last_seen)";

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

  const settingsRef = useRef(settings);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  const qcRef = useRef(qc);
  useEffect(() => { qcRef.current = qc; }, [qc]);

  // ══════════════════════════════════════════════════════════
  // CHANNEL 1: New chat messages
  // ══════════════════════════════════════════════════════════
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

          // My own message → skip (optimistic update handles it)
          if (msg.sender_id === user.id) return;

          const onSameChat = isOnSameChat(msg.chat_id);
          const s: any = settingsRef.current;

          // Sound + vibration only if not on this chat
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

          // Update chats list with new last_message
          const currentChats: any[] =
            qcRef.current.getQueryData(["chats", user.id]) || [];
          const chatInList = currentChats.some((c: any) => c.id === msg.chat_id);

          if (!chatInList) {
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
            } catch { /* ignore */ }
          } else {
            qcRef.current.setQueryData(["chats", user.id], (old: any[]) => {
              if (!old) return old;
              return old
                .map((c: any) =>
                  c.id === msg.chat_id
                    ? {
                        ...c,
                        last_message_at: msg.created_at,
                        last_message_content: msg.content,
                        last_message_sender_id: msg.sender_id,
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

          // ✅ DB-driven unread: invalidate the count query
          // If user is on the same chat, mark as read immediately instead
          if (onSameChat) {
            // User is already viewing — mark read in background
            supabase.rpc("mark_chat_read", {
              p_chat_id: msg.chat_id,
              p_user_id: user.id,
            }).catch(() => {});
          } else {
            // Invalidate to refetch unread counts from DB
            qcRef.current.invalidateQueries({
              queryKey: ["unread-counts", user.id],
            });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  // ══════════════════════════════════════════════════════════
  // CHANNEL 2: New notifications
  // ══════════════════════════════════════════════════════════
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
          qcRef.current.setQueryData(
            ["notifications", user.id],
            (old: any[]) => {
              if (!old) return [payload.new];
              if (old.some((n: any) => n.id === payload.new.id)) return old;
              return [payload.new, ...old];
            }
          );

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

  // ══════════════════════════════════════════════════════════
  // CHANNEL 3: Notification updates (is_read)
  // ══════════════════════════════════════════════════════════
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

  // ══════════════════════════════════════════════════════════
  // CHANNEL 4: Read receipt changes (multi-device sync)
  //   When the user marks a chat as read on another device,
  //   this invalidates the unread count here too.
  // ══════════════════════════════════════════════════════════
  useEffect(() => {
    if (!user?.id) return;

    const ch = supabase
      .channel(`receipts-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_read_receipts",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Any change to our receipts means unread counts changed
          qcRef.current.invalidateQueries({
            queryKey: ["unread-counts", user.id],
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  return null;
};

export default GlobalMessageListener;
