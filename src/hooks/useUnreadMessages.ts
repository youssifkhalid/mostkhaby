// src/hooks/useUnreadMessages.ts
/**
 * ═══════════════════════════════════════════════════════════════
 * useUnreadMessages — نظام الـ badge الاحترافي
 * ═══════════════════════════════════════════════════════════════
 *
 * المشكلة القديمة:
 * ────────────────
 * • clearChatUnread: ينتظر DB response قبل تحديث الـ cache
 *   → البادج يبقى ثانية أو أكثر بعد فتح الشات
 * • GlobalMessageListener يضيف رسائل للـ unread حتى لو المستخدم
 *   داخل نفس الشات → race condition
 *
 * الحل:
 * ─────
 * 1. clearChatUnread: optimistic update فوري → DB في الخلفية
 * 2. Realtime channel منفصل للـ UPDATE (في GlobalMessageListener)
 * 3. قراءة الـ unread مع batch query واحدة فقط
 */

import { useEffect, useMemo, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type UnreadRow = {
  id: string;
  chat_id: string;
  sender_id: string;
  status: string | null;
  is_deleted: boolean | null;
};

export const useUnreadMessages = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  // ✅ qc في ref — لا تدخل في deps
  const qcRef = useRef(qc);
  useEffect(() => { qcRef.current = qc; }, [qc]);

  // ── Initial fetch ──────────────────────────────────────────────
  const { data: unread = [] } = useQuery<UnreadRow[]>({
    queryKey: ["unread-messages", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // batch: نجيب chat IDs مع الرسائل في طلب واحد عبر join
      const { data, error } = await supabase
        .from("chat_messages")
        .select("id,chat_id,sender_id,status,is_deleted")
        .neq("sender_id", user.id)
        .neq("status", "read")
        .eq("is_deleted", false)
        .in(
          "chat_id",
          // subquery: محادثات المستخدم فقط
          (await supabase
            .from("chats")
            .select("id")
            .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
            .then(({ data: c }) => (c || []).map((x: any) => x.id))
          )
        );

      if (error) {
        console.warn("[useUnreadMessages] fetch error:", error.message);
        return [];
      }
      return (data || []) as UnreadRow[];
    },
    enabled: !!user?.id,
    staleTime: 0,
    gcTime: 1000 * 60 * 10,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    retry: 1,
  });

  // ── Memos ──────────────────────────────────────────────────────
  const unreadPerChat = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of unread) {
      if (m.is_deleted) continue;
      map.set(m.chat_id, (map.get(m.chat_id) || 0) + 1);
    }
    return map;
  }, [unread]);

  const totalUnread = useMemo(
    () => unread.filter((m) => !m.is_deleted).length,
    [unread]
  );

  // ── clearChatUnread ────────────────────────────────────────────
  /**
   * ✅ PRODUCTION FIX:
   * 1. Optimistic: badge يختفي فوراً بدون انتظار DB
   * 2. DB update في الخلفية (fire & forget)
   * 3. is_read = true + status = "read" معًا
   */
  const clearChatUnread = useCallback(
    async (chatId: string) => {
      if (!user?.id || !chatId) return;

      // ── STEP 1: Optimistic clear فوري ──
      qcRef.current.setQueryData(
        ["unread-messages", user.id],
        (old: UnreadRow[] = []) => old.filter((m) => m.chat_id !== chatId)
      );

      // ── STEP 2: Update local messages cache أيضًا ──
      qcRef.current.setQueryData(
        ["chat-messages", chatId, user.id],
        (old: any[]) =>
          old?.map((m: any) =>
            m.sender_id !== user.id && m.status !== "read"
              ? { ...m, status: "read", is_read: true }
              : m
          )
      );

      // ── STEP 3: DB update في الخلفية ──
      supabase
        .from("chat_messages")
        .update({ status: "read", is_read: true })
        .eq("chat_id", chatId)
        .neq("sender_id", user.id)
        .neq("status", "read")
        .eq("is_deleted", false)
        .then(({ error }) => {
          if (error) {
            console.warn("[clearChatUnread] DB update failed:", error.message);
            // rollback: أعد جلب البيانات الحقيقية
            qcRef.current.invalidateQueries({
              queryKey: ["unread-messages", user.id],
            });
          }
        });
    },
    [user?.id]
  );

  return { unread, totalUnread, unreadPerChat, clearChatUnread };
};

export default useUnreadMessages;
