// src/components/GlobalMessageListener.tsx

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
  const qcRef = useRef(qc);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    qcRef.current = qc;
  }, [qc]);

  // ═════════════════════════════════════
  // 1. CHAT MESSAGES
  // ═════════════════════════════════════
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`chat-msgs-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
        },
        async (payload: any) => {
          const msg = payload.new;

          if (!msg) return;

          // ignore my own messages
          if (msg.sender_id === user.id) return;

          const onChat = isOnSameChat(msg.chat_id);
          const s: any = settingsRef.current;

          // 🔊 only outside same chat
          if (!onChat) {
            if (s?.in_app_sound_enabled !== false) {
              playNotificationSound(
                s?.notification_sound || "default",
                s?.notification_volume ?? 80
              );
            }

            if (s?.vibration_enabled !== false) {
              vibrate([60, 40, 60]);
            }
          }

          // update chats list
          qcRef.current.setQueryData(
            ["chats", user.id],
            (old: any[] = []) => {
              let exists = false;

              const updated = old.map((c) => {
                if (c.id === msg.chat_id) {
                  exists = true;

                  return {
                    ...c,
                    last_message_at: msg.created_at,
                    last_message_content: msg.content,
                    last_message_sender_id: msg.sender_id,
                  };
                }

                return c;
              });

              return updated.sort(
                (a, b) =>
                  new Date(b.last_message_at || 0).getTime() -
                  new Date(a.last_message_at || 0).getTime()
              );
            }
          );

          // unread / read logic
          if (onChat) {
            try {
              await supabase.rpc("mark_chat_read", {
                p_chat_id: msg.chat_id,
                p_user_id: user.id,
              });

              // update blue ticks instantly
              qcRef.current.setQueryData(
                ["chat-messages", msg.chat_id, user.id],
                (old: any[] = []) =>
                  old.map((m) =>
                    m.sender_id !== user.id
                      ? {
                          ...m,
                          status: "read",
                          is_read: true,
                        }
                      : m
                  )
              );
            } catch (err) {
              console.error("mark_chat_read failed", err);
            }
          } else {
            qcRef.current.invalidateQueries({
              queryKey: ["unread-counts", user.id],
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // ═════════════════════════════════════
  // 2. NEW NOTIFICATIONS
  // ═════════════════════════════════════
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
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
            (old: any[] = []) => {
              if (old.some((n) => n.id === payload.new.id)) {
                return old;
              }

              return [payload.new, ...old];
            }
          );

          const s: any = settingsRef.current;

          if (s?.in_app_sound_enabled !== false) {
            playNotificationSound(
              s?.notification_sound || "default",
              s?.notification_volume ?? 80
            );
          }

          if (s?.vibration_enabled !== false) {
            vibrate([60, 40, 60]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // ═════════════════════════════════════
  // 3. NOTIFICATION UPDATE
  // ═════════════════════════════════════
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
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
            (old: any[] = []) =>
              old.map((n) =>
                n.id === payload.new.id
                  ? { ...n, ...payload.new }
                  : n
              )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // ═════════════════════════════════════
  // 4. READ RECEIPTS
  // ═════════════════════════════════════
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
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
          qcRef.current.invalidateQueries({
            queryKey: ["unread-counts", user.id],
          });

          qcRef.current.invalidateQueries({
            queryKey: ["chats", user.id],
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return null;
};

export default GlobalMessageListener;
