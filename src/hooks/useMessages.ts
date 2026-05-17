import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useEffect } from "react";

const MSG_SELECT = "id,content,created_at,is_favorite,is_read,is_public,sender_id,receiver_id,sent_by,sender:profiles!messages_sender_id_fkey(id,username,full_name,avatar_url)";
const SENT_SELECT = "id,content,created_at,is_favorite,is_read,is_public,receiver_id,sender_id,sent_by,receiver:profiles!messages_receiver_id_fkey(id,username,full_name,avatar_url)";

export const useMessages = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["messages", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("messages")
        .select(MSG_SELECT)
        .eq("receiver_id", user.id)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
  });

  const { data: sentMessages = [] } = useQuery({
    queryKey: ["sent-messages", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("messages")
        .select(SENT_SELECT)
        .eq("sent_by", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
  });

  // Real-time subscription for received/sent messages
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`messages-realtime-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `receiver_id=eq.${user.id}` },
        async (payload) => {
          // Fetch full row with sender profile
          const { data: fullRow } = await supabase
            .from("messages")
            .select(MSG_SELECT)
            .eq("id", payload.new.id)
            .maybeSingle();

          const incoming = fullRow || payload.new;
          queryClient.setQueryData(["messages", user.id], (old: any[]) => {
            if (!old) return [incoming];
            if (old.some((m: any) => m.id === incoming.id)) return old;
            return [incoming, ...old];
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `sent_by=eq.${user.id}` },
        async (payload) => {
          const { data: fullRow } = await supabase
            .from("messages")
            .select(SENT_SELECT)
            .eq("id", payload.new.id)
            .maybeSingle();

          const incoming = fullRow || payload.new;

          queryClient.setQueryData(["sent-messages", user.id], (old: any[]) => {
            const current = old || [];
            if (current.some((m: any) => m.id === incoming.id)) return current;
            const withoutTemp = current.filter((m: any) => {
              const tempId = String(m.id || "");
              return !(tempId.startsWith("temp-") && m.receiver_id === incoming.receiver_id && m.content === incoming.content);
            });
            return [incoming, ...withoutTemp];
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `receiver_id=eq.${user.id}` },
        (payload) => {
          queryClient.setQueryData(["messages", user.id], (old: any[]) =>
            old?.map((m: any) => (m.id === payload.new.id ? { ...m, ...payload.new } : m)) || []
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `sent_by=eq.${user.id}` },
        (payload) => {
          queryClient.setQueryData(["sent-messages", user.id], (old: any[]) =>
            old?.map((m: any) => (m.id === payload.new.id ? { ...m, ...payload.new } : m)) || []
          );
        }
      )
      .subscribe();

    // Realtime for message_replies
    const repliesChannel = supabase
      .channel(`replies-rt-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "message_replies" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["message-replies"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(repliesChannel);
    };
  }, [user?.id, queryClient]);

  const toggleFavorite = useMutation({
    mutationFn: async ({ id, is_favorite }: { id: string; is_favorite: boolean }) => {
      const { error } = await supabase.from("messages").update({ is_favorite }).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, is_favorite }) => {
      await queryClient.cancelQueries({ queryKey: ["messages", user?.id] });
      const prev = queryClient.getQueryData(["messages", user?.id]);
      queryClient.setQueryData(["messages", user?.id], (old: any[]) =>
        old?.map((m) => (m.id === id ? { ...m, is_favorite } : m))
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      queryClient.setQueryData(["messages", user?.id], ctx?.prev);
    },
  });

  const togglePublic = useMutation({
    mutationFn: async ({ id, is_public }: { id: string; is_public: boolean }) => {
      const { error } = await supabase.from("messages").update({ is_public }).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, is_public }) => {
      await queryClient.cancelQueries({ queryKey: ["messages", user?.id] });
      const prev = queryClient.getQueryData(["messages", user?.id]);
      queryClient.setQueryData(["messages", user?.id], (old: any[]) =>
        old?.map((m) => (m.id === id ? { ...m, is_public } : m))
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      queryClient.setQueryData(["messages", user?.id], ctx?.prev);
    },
  });

  const deleteMessage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("messages").update({ is_deleted: true }).eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["messages", user?.id] });
      const prev = queryClient.getQueryData(["messages", user?.id]);
      queryClient.setQueryData(["messages", user?.id], (old: any[]) =>
        old?.filter((m) => m.id !== id)
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      queryClient.setQueryData(["messages", user?.id], ctx?.prev);
    },
  });

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("messages").update({ is_read: true }).eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      const prev = queryClient.getQueryData(["messages", user?.id]);
      queryClient.setQueryData(["messages", user?.id], (old: any[]) =>
        old?.map((m) => (m.id === id ? { ...m, is_read: true } : m))
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      queryClient.setQueryData(["messages", user?.id], ctx?.prev);
    },
  });

  const sendMessage = useMutation({
    mutationFn: async ({ receiver_id, content, sender_id }: { receiver_id: string; content: string; sender_id?: string; receiver?: { id: string; username: string; full_name: string | null; avatar_url: string | null } }) => {
      const sid = sender_id || null;
      const { data, error } = await supabase
        .from("messages")
        .insert({
          receiver_id,
          content,
          sender_id: sid,
          sent_by: user?.id || null,
        })
        .select(SENT_SELECT)
        .single();
      if (error) throw error;
      return data;
    },
    onMutate: async ({ receiver_id, content, sender_id, receiver }) => {
      if (!user?.id) return {};
      const tempId = `temp-${Date.now()}`;
      const sid = sender_id || null;
      const optimistic = {
        id: tempId,
        receiver_id,
        content,
        sender_id: sid,
        sent_by: user.id,
        created_at: new Date().toISOString(),
        is_favorite: false,
        is_read: false,
        is_public: false,
        is_deleted: false,
        receiver: receiver || null,
      };
      queryClient.setQueryData(["sent-messages", user.id], (old: any[]) => [optimistic, ...(old || [])]);
      return { tempId };
    },
    onSuccess: (data, _vars, ctx) => {
      if (!data || !user?.id) return;
      queryClient.setQueryData(["sent-messages", user.id], (old: any[]) => {
        const current = old || [];
        const withoutTemp = current.filter((m: any) => m.id !== ctx?.tempId);
        if (withoutTemp.some((m: any) => m.id === data.id)) return withoutTemp;
        return [data, ...withoutTemp];
      });
    },
    onError: (_err, _vars, ctx) => {
      if (!user?.id || !ctx?.tempId) return;
      queryClient.setQueryData(["sent-messages", user.id], (old: any[]) =>
        old?.filter((m: any) => m.id !== ctx.tempId) || []
      );
    },
  });

  return {
    messages,
    sentMessages,
    isLoading,
    toggleFavorite,
    togglePublic,
    deleteMessage,
    markAsRead,
    sendMessage,
  };
};
