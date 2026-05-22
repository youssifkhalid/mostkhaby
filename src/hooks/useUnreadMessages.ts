// src/hooks/useUnreadMessages.ts
/**
 * ═══════════════════════════════════════════════════════════════
 * useUnreadMessages — نظام unread مبني على قاعدة البيانات بالكامل
 * ═══════════════════════════════════════════════════════════════
 *
 * Architecture:
 * ─────────────
 * • يستخدم جدول chat_read_receipts (last_read_at per user per chat)
 * • يستدعي DB function: get_unread_counts(user_id)
 * • clearChatUnread: يستدعي mark_chat_read() — optimistic + DB
 * • دقيق عبر أي جهاز / refresh / login-logout
 *
 * NO more scanning chat_messages for status — the DB function handles it.
 */

import { useEffect, useMemo, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type UnreadCountRow = {
  chat_id: string;
  unread_count: number;
};

export const useUnreadMessages = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const qcRef = useRef(qc);
  useEffect(() => { qcRef.current = qc; }, [qc]);

  // ── Fetch unread counts from DB function ──────────────────
  const { data: unreadCounts = [] } = useQuery<UnreadCountRow[]>({
    queryKey: ["unread-counts", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase.rpc("get_unread_counts", {
        p_user_id: user.id,
      });

      if (error) {
        console.warn("[useUnreadMessages] fetch error:", error.message);
        return [];
      }
      return (data || []).map((r: any) => ({
        chat_id: r.chat_id,
        unread_count: Number(r.unread_count),
      }));
    },
    enabled: !!user?.id,
    staleTime: 0,
    gcTime: 1000 * 60 * 10,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    retry: 1,
  });

  // ── Memos ──────────────────────────────────────────────────
  const unreadPerChat = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of unreadCounts) {
      if (row.unread_count > 0) map.set(row.chat_id, row.unread_count);
    }
    return map;
  }, [unreadCounts]);

  const totalUnread = useMemo(
    () => unreadCounts.reduce((sum, r) => sum + r.unread_count, 0),
    [unreadCounts]
  );

  // ── Sync PWA app badge + document title ───────────────────
  useEffect(() => {
    // App badge (PWA, supported in Chrome/Edge/Safari iOS 16.4+)
    try {
      const nav: any = navigator;
      if (typeof nav.setAppBadge === "function") {
        if (totalUnread > 0) nav.setAppBadge(totalUnread).catch(() => {});
        else nav.clearAppBadge?.().catch(() => {});
      }
    } catch {}
    // Document title
    if (typeof document !== "undefined") {
      const base = "مستخبي";
      document.title = totalUnread > 0 ? `(${totalUnread}) ${base}` : base;
    }
  }, [totalUnread]);


  // ── clearChatUnread — optimistic + DB ─────────────────────
  /**
   * 1. Optimistic: badge disappears instantly
   * 2. DB: upsert chat_read_receipts via mark_chat_read()
   * 3. Rollback on error
   */
  const clearChatUnread = useCallback(
    async (chatId: string) => {
      if (!user?.id || !chatId) return;

      // ── STEP 1: Optimistic clear ──
      qcRef.current.setQueryData(
        ["unread-counts", user.id],
        (old: UnreadCountRow[] = []) =>
          old.filter((r) => r.chat_id !== chatId)
      );

      // ── STEP 2: DB upsert (SECURITY DEFINER function, no RLS issues) ──
      const { error } = await supabase.rpc("mark_chat_read", {
        p_chat_id: chatId,
        p_user_id: user.id,
      });

      if (error) {
        console.warn("[clearChatUnread] DB failed:", error.message);
        // Rollback by refetching
        qcRef.current.invalidateQueries({
          queryKey: ["unread-counts", user.id],
        });
      }
    },
    [user?.id]
  );

  // ── Realtime: update unread counts on new messages ────────
  // This is handled in GlobalMessageListener via invalidateQueries.
  // We expose an invalidate helper for it to call.
  const invalidateUnread = useCallback(() => {
    if (!user?.id) return;
    qcRef.current.invalidateQueries({
      queryKey: ["unread-counts", user.id],
    });
  }, [user?.id]);

  return {
    totalUnread,
    unreadPerChat,
    clearChatUnread,
    invalidateUnread,
    // Legacy compat: unread array (empty — logic is now in unreadPerChat)
    unread: [],
  };
};

export default useUnreadMessages;
