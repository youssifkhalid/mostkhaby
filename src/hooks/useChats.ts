import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useEffect, useState, useRef, useCallback } from "react";

const CHAT_SELECT = "id,user1_id,user2_id,last_message_at,last_message_content,deleted_by,cleared_before,user1:profiles!chats_user1_id_fkey(id,username,full_name,avatar_url,is_online,last_seen),user2:profiles!chats_user2_id_fkey(id,username,full_name,avatar_url,is_online,last_seen)";
const MSG_SELECT = "id,content,created_at,sender_id,status,reply_to_id,is_deleted,is_edited,media_url,media_type,audio_duration,waveform,sender:profiles!chat_messages_sender_id_fkey(username,full_name,avatar_url)";

export const useChats = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: chats = [], isLoading } = useQuery({
    queryKey: ["chats", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("chats")
        .select(CHAT_SELECT)
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order("last_message_at", { ascending: false });
      if (error) throw error;
      return (data || []).filter((c: any) => !(c.deleted_by || []).includes(user.id));
    },
    enabled: !!user?.id,
    staleTime: 0,
    gcTime: 1000 * 60 * 15,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!user?.id) return;
    const ch = supabase
      .channel(`chats-rt-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chats" }, async (payload) => {
        const newChat = payload.new;
        if (newChat.user1_id === user.id || newChat.user2_id === user.id) {
          const { data } = await supabase.from("chats").select(CHAT_SELECT).eq("id", newChat.id).single();
          if (data) {
            qc.setQueryData(["chats", user.id], (old: any[]) => {
              if (!old) return [data];
              if (old.some((c: any) => c.id === data.id)) return old;
              return [data, ...old];
            });
          }
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chats" }, (payload) => {
        qc.setQueryData(["chats", user.id], (old: any[]) => {
          if (!old) return old;
          return old.map((c: any) => c.id === payload.new.id ? { ...c, ...payload.new } : c)
            .filter((c: any) => !(c.deleted_by || []).includes(user.id))
            .sort((a: any, b: any) => new Date(b.last_message_at || 0).getTime() - new Date(a.last_message_at || 0).getTime());
        });
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "chats" }, (payload) => {
        qc.setQueryData(["chats", user.id], (old: any[]) => old?.filter((c: any) => c.id !== payload.old.id) || []);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id, qc]);

  const createChat = useMutation({
    mutationFn: async (otherUserId: string) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { data: existing } = await supabase
        .from("chats")
        .select("id")
        .or(`and(user1_id.eq.${user.id},user2_id.eq.${otherUserId}),and(user1_id.eq.${otherUserId},user2_id.eq.${user.id})`)
        .maybeSingle();
      if (existing) return existing.id;
      const { data, error } = await supabase
        .from("chats")
        .insert({ user1_id: user.id, user2_id: otherUserId })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
  });

  const deleteChat = useMutation({
    mutationFn: async (chatId: string) => {
      if (!user?.id) throw new Error("Not auth");
      const chat = chats.find((c: any) => c.id === chatId);
      const currentDeletedBy = chat?.deleted_by || [];
      const { error } = await supabase
        .from("chats")
        .update({ deleted_by: [...currentDeletedBy, user.id] })
        .eq("id", chatId);
      if (error) throw error;
    },
    onMutate: async (chatId) => {
      qc.setQueryData(["chats", user?.id], (old: any[]) => old?.filter((c: any) => c.id !== chatId) || []);
    },
  });

  return { chats, isLoading, createChat, deleteChat };
};

export const useChatMessages = (chatId: string | undefined) => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["chat-messages", chatId, user?.id],
    queryFn: async () => {
      if (!chatId) return [];
      // Fetch chat for cleared_before
      const { data: chat } = await supabase.from("chats").select("cleared_before").eq("id", chatId).single();
      const cleared = (chat?.cleared_before as any) || {};
      const clearedAt = user?.id ? cleared[user.id] : null;

      let q = supabase
        .from("chat_messages")
        .select(MSG_SELECT)
        .eq("chat_id", chatId);
      if (clearedAt) q = q.gt("created_at", clearedAt);
      const { data, error } = await q.order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return (data || []).reverse();
    },
    enabled: !!chatId,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!chatId) return;
    const ch = supabase
      .channel(`chat-${chatId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `chat_id=eq.${chatId}` }, async (payload) => {
        const { data: fullMessage } = await supabase
          .from("chat_messages")
          .select(MSG_SELECT)
          .eq("id", payload.new.id)
          .maybeSingle();

        const incoming = fullMessage || payload.new;

        qc.setQueryData(["chat-messages", chatId, user?.id], (old: any[]) => {
          if (!old) return [incoming];
          if (old.some((m: any) => m.id === incoming.id)) return old;
          const filtered = old.filter((m: any) => !String(m.id).startsWith("temp-") || m.sender_id !== incoming.sender_id);
          return [...filtered, incoming];
        });

        // Also update chats list
        qc.setQueryData(["chats", user?.id], (old: any[]) => {
          if (!old) return old;
          return old.map((c: any) => c.id === chatId ? { ...c, last_message_at: incoming.created_at, last_message_content: incoming.content } : c)
            .sort((a: any, b: any) => new Date(b.last_message_at || 0).getTime() - new Date(a.last_message_at || 0).getTime());
        });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chat_messages", filter: `chat_id=eq.${chatId}` }, (payload) => {
        qc.setQueryData(["chat-messages", chatId, user?.id], (old: any[]) =>
          old?.map((m: any) => m.id === payload.new.id ? { ...m, ...payload.new } : m)
        );
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [chatId, user?.id, qc]);

  const sendChatMessage = useMutation({
    mutationFn: async ({ content, replyToId, mediaUrl, mediaType, audioDuration, waveform }: {
      content: string; replyToId?: string;
      mediaUrl?: string; mediaType?: "image" | "audio";
      audioDuration?: number; waveform?: number[];
    }) => {
      if (!user?.id || !chatId) throw new Error("Missing data");
      const { error } = await supabase.from("chat_messages").insert({
        chat_id: chatId,
        sender_id: user.id,
        content: content || (mediaType === "image" ? "📷 صورة" : mediaType === "audio" ? "🎤 رسالة صوتية" : ""),
        reply_to_id: replyToId || null,
        media_url: mediaUrl || null,
        media_type: mediaType || null,
        audio_duration: audioDuration || null,
        waveform: waveform ? (waveform as any) : null,
      });
      if (error) throw error;
    },
    onMutate: async ({ content, replyToId, mediaUrl, mediaType, audioDuration, waveform }) => {
      const optimistic = {
        id: `temp-${Date.now()}`,
        chat_id: chatId,
        sender_id: user?.id,
        content: content || (mediaType === "image" ? "📷 صورة" : mediaType === "audio" ? "🎤 رسالة صوتية" : ""),
        reply_to_id: replyToId || null,
        status: "sending",
        created_at: new Date().toISOString(),
        media_url: mediaUrl || null,
        media_type: mediaType || null,
        audio_duration: audioDuration || null,
        waveform: waveform || null,
        sender: null,
      };
      qc.setQueryData(["chat-messages", chatId, user?.id], (old: any[]) => [...(old || []), optimistic]);
    },
  });

  const bulkDeleteMessages = useMutation({
    mutationFn: async (ids: string[]) => {
      if (!ids.length) return;
      const { error } = await supabase
        .from("chat_messages")
        .update({ is_deleted: true, content: "" })
        .in("id", ids);
      if (error) throw error;
    },
    onMutate: async (ids) => {
      qc.setQueryData(["chat-messages", chatId, user?.id], (old: any[]) =>
        old?.map((m) => ids.includes(m.id) ? { ...m, is_deleted: true, content: "" } : m)
      );
    },
  });

  const clearAllMessages = useMutation({
    mutationFn: async () => {
      if (!user?.id || !chatId) return;
      const { data: chat } = await supabase.from("chats").select("cleared_before").eq("id", chatId).single();
      const cleared = (chat?.cleared_before as any) || {};
      cleared[user.id] = new Date().toISOString();
      const { error } = await supabase.from("chats").update({ cleared_before: cleared }).eq("id", chatId);
      if (error) throw error;
    },
    onMutate: async () => {
      qc.setQueryData(["chat-messages", chatId, user?.id], () => []);
    },
  });

  const markChatMessagesRead = useMutation({
    mutationFn: async () => {
      if (!user?.id || !chatId) return;
      await supabase
        .from("chat_messages")
        .update({ status: "read" })
        .eq("chat_id", chatId)
        .neq("sender_id", user.id)
        .neq("status", "read");
    },
    onMutate: () => {
      qc.setQueryData(["chat-messages", chatId, user?.id], (old: any[]) =>
        old?.map((m: any) => m.sender_id !== user?.id ? { ...m, status: "read" } : m)
      );
    },
  });

  return { messages, isLoading, sendChatMessage, markChatMessagesRead, bulkDeleteMessages, clearAllMessages };
};

export const useTypingIndicator = (chatId: string | undefined) => {
  const { user } = useAuth();
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const channelRef = useRef<any>(null);
  const typingTimeoutRef = useRef<any>(null);
  const lastSentRef = useRef(0);

  useEffect(() => {
    if (!chatId || !user?.id) return;

    const channel = supabase.channel(`typing-${chatId}`);
    channelRef.current = channel;

    channel
      .on("broadcast", { event: "typing" }, (payload) => {
        if (payload.payload?.user_id !== user.id) {
          setIsOtherTyping(true);
          clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setIsOtherTyping(false), 2000);
        }
      })
      .subscribe();

    return () => {
      clearTimeout(typingTimeoutRef.current);
      supabase.removeChannel(channel);
    };
  }, [chatId, user?.id]);

  const sendTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastSentRef.current < 1500) return;
    lastSentRef.current = now;
    channelRef.current?.send({
      type: "broadcast",
      event: "typing",
      payload: { user_id: user?.id },
    });
  }, [user?.id]);

  return { isOtherTyping, sendTyping };
};
