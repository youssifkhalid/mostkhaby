import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useEffect } from "react";
import { sanitizeTextForDatabase } from "@/lib/sanitizeText";

export const useChatReactions = (chatId: string | undefined, messageIds: string[]) => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: reactions = [] } = useQuery({
    queryKey: ["chat-reactions", chatId],
    queryFn: async () => {
      if (!chatId || messageIds.length === 0) return [];
      const realIds = messageIds.filter((id) => !id.startsWith("temp-"));
      if (realIds.length === 0) return [];
      const { data, error } = await supabase
        .from("chat_reactions")
        .select("id,emoji,user_id,message_id")
        .in("message_id", realIds);
      if (error) throw error;
      return data || [];
    },
    enabled: !!chatId && messageIds.length > 0,
    staleTime: 1000 * 30,
  });

  useEffect(() => {
    if (!chatId) return;
    const ch = supabase
      .channel(`reactions-${chatId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_reactions" }, () => {
        qc.invalidateQueries({ queryKey: ["chat-reactions", chatId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [chatId, qc]);

  const toggleReaction = useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      if (!user?.id) return;
      const existing = reactions.find(
        (r: any) => r.message_id === messageId && r.user_id === user.id && r.emoji === emoji
      );
      if (existing) {
        const { error } = await supabase.from("chat_reactions").delete().eq("id", existing.id);
        if (error) throw error;
      } else {
        // remove any prior reaction by this user on this message (one reaction per user per msg)
        const prior = reactions.find((r: any) => r.message_id === messageId && r.user_id === user.id);
        if (prior) {
          const { error } = await supabase.from("chat_reactions").delete().eq("id", prior.id);
          if (error) throw error;
        }
        const { error } = await supabase.from("chat_reactions").insert({
          message_id: messageId, user_id: user.id, emoji,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chat-reactions", chatId] }),
  });

  // Group by message
  const byMessage = new Map<string, { emoji: string; count: number; mine: boolean }[]>();
  for (const r of reactions as any[]) {
    const list = byMessage.get(r.message_id) || [];
    const found = list.find((x) => x.emoji === r.emoji);
    if (found) {
      found.count++;
      if (r.user_id === user?.id) found.mine = true;
    } else {
      list.push({ emoji: r.emoji, count: 1, mine: r.user_id === user?.id });
    }
    byMessage.set(r.message_id, list);
  }

  return { byMessage, toggleReaction };
};

export const useChatMessageActions = (chatId: string | undefined) => {
  const qc = useQueryClient();

  const editMessage = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const safeContent = sanitizeTextForDatabase(content);
      if (!safeContent) throw new Error("empty_message");
      const { error } = await supabase
        .from("chat_messages")
        .update({ content: safeContent, is_edited: true, edited_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, content }) => {
      const safeContent = sanitizeTextForDatabase(content);
      qc.setQueryData(["chat-messages", chatId], (old: any[]) =>
        old?.map((m) => m.id === id ? { ...m, content: safeContent, is_edited: true } : m)
      );
    },
  });

  const deleteMessage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("chat_messages")
        .update({ is_deleted: true, content: "" })
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      qc.setQueryData(["chat-messages", chatId], (old: any[]) =>
        old?.map((m) => m.id === id ? { ...m, is_deleted: true, content: "" } : m)
      );
    },
  });

  return { editMessage, deleteMessage };
};
