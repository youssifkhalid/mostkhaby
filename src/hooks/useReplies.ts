import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useEffect } from "react";

export const useReplies = (messageIds: string[]) => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: replies = [], isLoading } = useQuery({
    queryKey: ["message-replies", messageIds.sort().join(",")],
    queryFn: async () => {
      if (!messageIds.length) return [];
      const { data, error } = await supabase
        .from("message_replies")
        .select("id,content,created_at,message_id,replier_id")
        .in("message_id", messageIds)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: messageIds.length > 0,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  });

  // Realtime for new replies
  useEffect(() => {
    if (!user?.id) return;
    const instanceId = Math.random().toString(36).substring(7);
    const ch = supabase
      .channel(`replies-live-${user.id}-${instanceId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "message_replies" }, (payload) => {
        // Update all reply queries that might contain this message_id
        qc.setQueriesData({ queryKey: ["message-replies"] }, (old: any) => {
          if (!old || !Array.isArray(old)) return old;
          if (old.some((r: any) => r.id === payload.new.id)) return old;
          return [...old, payload.new];
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id, qc]);

  // Group replies by message_id
  const repliesByMessage: Record<string, any[]> = {};
  for (const r of replies) {
    if (!repliesByMessage[r.message_id]) repliesByMessage[r.message_id] = [];
    repliesByMessage[r.message_id].push(r);
  }

  return { replies, repliesByMessage, isLoading };
};
