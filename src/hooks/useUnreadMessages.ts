import { useEffect, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type UnreadRow = {
  id: string;
  chat_id: string;
  sender_id: string;
  status: string | null;
  is_deleted: boolean | null;
};

/**
 * Loads unread messages for current user and exposes:
 *  - totalUnread: number
 *  - unreadPerChat: Map<chatId, count>
 *  - clearChatUnread(chatId): clears cache + marks DB as read
 *
 * Realtime additions are pushed into the same cache key
 * by GlobalMessageListener (["unread-messages", user.id]).
 */
export const useUnreadMessages = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: unread = [] } = useQuery<UnreadRow[]>({
    queryKey: ["unread-messages", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      // Find chats the user participates in
      const { data: chats } = await supabase
        .from("chats")
        .select("id")
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);
      const chatIds = (chats || []).map((c: any) => c.id);
      if (!chatIds.length) return [];

      const { data, error } = await supabase
        .from("chat_messages")
        .select("id,chat_id,sender_id,status,is_deleted")
        .in("chat_id", chatIds)
        .neq("sender_id", user.id)
        .neq("status", "read")
        .eq("is_deleted", false);
      if (error) throw error;
      return (data || []) as UnreadRow[];
    },
    enabled: !!user?.id,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  // Live refresh when messages change
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
          if (m.status === "read" || m.is_deleted) {
            qc.setQueryData(["unread-messages", user.id], (old: UnreadRow[] = []) =>
              old.filter((r) => r.id !== m.id)
            );
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user?.id, qc]);

  const unreadPerChat = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of unread) {
      map.set(m.chat_id, (map.get(m.chat_id) || 0) + 1);
    }
    return map;
  }, [unread]);

  const totalUnread = unread.length;

  const clearChatUnread = useCallback(
    async (chatId: string) => {
      if (!user?.id) return;
      // Optimistic
      qc.setQueryData(["unread-messages", user.id], (old: UnreadRow[] = []) =>
        old.filter((m) => m.chat_id !== chatId)
      );
      // DB
      await supabase
        .from("chat_messages")
        .update({ status: "read" })
        .eq("chat_id", chatId)
        .neq("sender_id", user.id)
        .neq("status", "read");
    },
    [user?.id, qc]
  );

  return { unread, totalUnread, unreadPerChat, clearChatUnread };
};

export default useUnreadMessages;
