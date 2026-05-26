// src/components/GlobalMessageListener.tsx
// Realtime listener — routes all chat messages through notificationRouter.

import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSettings } from "@/hooks/useSettings";
import { playNotificationSound, vibrate } from "@/lib/notificationSounds";
import { useQueryClient } from "@tanstack/react-query";
import { useActiveChat } from "@/contexts/ActiveChatContext";
import { notificationRouter } from "@/lib/notificationRouter";

const GlobalMessageListener = () => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const qc = useQueryClient();
  const { activeChatId, isAppActive } = useActiveChat();

  const settingsRef = useRef(settings);
  const qcRef = useRef(qc);

  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => { qcRef.current = qc; }, [qc]);

  // Keep the router state in sync with React state
  useEffect(() => {
    notificationRouter.setActive(activeChatId, isAppActive);
  }, [activeChatId, isAppActive]);
  useEffect(() => {
    const s: any = settings || {};
    notificationRouter.setSettings({
      soundEnabled: s.in_app_sound_enabled !== false,
      vibrationEnabled: s.vibration_enabled !== false,
      soundName: s.notification_sound || "default",
      soundVolume: s.notification_volume ?? 80,
    });
  }, [settings]);

  // Listen for SW → client commands (mark-read action, push-suppressed tick)
  useEffect(() => {
    if (!user?.id || typeof navigator === "undefined" || !navigator.serviceWorker) return;
    const handler = (evt: MessageEvent) => {
      const data = evt.data;
      if (!data) return;
      if (data.type === "MARK_CHAT_READ" && data.chatId) {
        void supabase.rpc("mark_chat_read", { p_chat_id: data.chatId, p_user_id: user.id });
        qcRef.current.invalidateQueries({ queryKey: ["unread-counts", user.id] });
      }
    };
    navigator.serviceWorker.addEventListener("message", handler);
    return () => navigator.serviceWorker.removeEventListener("message", handler);
  }, [user?.id]);

  // ═════════════════════════════════════════════════
  // CHAT MESSAGES (routed through notificationRouter)
  // ═════════════════════════════════════════════════
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`chat-msgs-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        async (payload: any) => {
          const msg = payload.new;
          if (!msg) return;
          if (msg.sender_id === user.id) return; // ignore own

          // Update chats list (last_message preview)
          qcRef.current.setQueryData(["chats", user.id], (old: any[] = []) => {
            const updated = old.map((c) =>
              c.id === msg.chat_id
                ? { ...c, last_message_at: msg.created_at, last_message_content: msg.content, last_message_sender_id: msg.sender_id }
                : c
            );
            return updated.sort(
              (a, b) => new Date(b.last_message_at || 0).getTime() - new Date(a.last_message_at || 0).getTime()
            );
          });

          // Hydrate sender profile (small lookup; cached by RQ)
          let senderName = "رسالة جديدة";
          let senderAvatar: string | null = null;
          try {
            const { data: prof } = await supabase
              .from("profiles")
              .select("full_name,username,avatar_url")
              .eq("id", msg.sender_id)
              .maybeSingle();
            senderName = prof?.full_name || prof?.username || senderName;
            senderAvatar = prof?.avatar_url ?? null;
          } catch {}

          // ── Route through the anti-spam brain ──
          const result = notificationRouter.ingest({
            id: msg.id,
            chat_id: msg.chat_id,
            sender_id: msg.sender_id,
            content: msg.content || "",
            created_at: msg.created_at,
            sender_name: senderName,
            sender_avatar: senderAvatar,
          });

          if (result === "silent") {
            // User is on this chat — mark read immediately, no sound
            try {
              await supabase.rpc("mark_chat_read", { p_chat_id: msg.chat_id, p_user_id: user.id });
              await supabase.from("chat_messages")
                .update({ status: "read" })
                .eq("chat_id", msg.chat_id)
                .neq("sender_id", user.id)
                .neq("status", "read");
              qcRef.current.setQueryData(
                ["chat-messages", msg.chat_id, user.id],
                (old: any[] = []) => old.map((m) => m.sender_id !== user.id ? { ...m, status: "read" } : m)
              );
            } catch (err) {
              console.warn("[silent mark_read]", (err as Error).message);
            }
          } else {
            // Not on this chat — mark as delivered, bump unread badge
            try {
              await supabase.from("chat_messages")
                .update({ status: "delivered" })
                .eq("id", msg.id)
                .eq("status", "sent");
            } catch {}
            qcRef.current.invalidateQueries({ queryKey: ["unread-counts", user.id] });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
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
          // ignore chat message notifications (handled by chat listener)
          if (payload.new.type === "message") return;

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
          // When receipts change, invalidate both unread counts and chats
          // This ensures the UI updates when read status changes
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
