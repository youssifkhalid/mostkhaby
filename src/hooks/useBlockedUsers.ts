import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useEffect, useCallback } from "react";

export const useBlockedUsers = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: blockedUsers = [] } = useQuery({
    queryKey: ["blocked-users", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from("blocked_users")
        .select("id,blocked_id,blocker_id,created_at")
        .eq("blocker_id", user.id);
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
  });

  // Realtime for blocked_users changes
  useEffect(() => {
    if (!user?.id) return;
    const ch = supabase
      .channel("blocked-rt")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "blocked_users", filter: `blocker_id=eq.${user.id}` }, (payload) => {
        qc.setQueryData(["blocked-users", user.id], (old: any[]) => old ? [...old, payload.new] : [payload.new]);
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "blocked_users", filter: `blocker_id=eq.${user.id}` }, (payload) => {
        qc.setQueryData(["blocked-users", user.id], (old: any[]) => old?.filter((b: any) => b.id !== payload.old.id) || []);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id, qc]);

  const blockUser = useMutation({
    mutationFn: async (blockedId: string) => {
      if (!user?.id) throw new Error("Not auth");
      const { error } = await supabase.from("blocked_users").insert({ blocker_id: user.id, blocked_id: blockedId });
      if (error) throw error;
    },
    onMutate: async (blockedId) => {
      const optimistic = { id: `temp-${Date.now()}`, blocker_id: user?.id, blocked_id: blockedId, created_at: new Date().toISOString() };
      qc.setQueryData(["blocked-users", user?.id], (old: any[]) => [...(old || []), optimistic]);
    },
  });

  const unblockUser = useMutation({
    mutationFn: async (blockedId: string) => {
      if (!user?.id) throw new Error("Not auth");
      const { error } = await supabase.from("blocked_users").delete().eq("blocker_id", user.id).eq("blocked_id", blockedId);
      if (error) throw error;
    },
    onMutate: async (blockedId) => {
      qc.setQueryData(["blocked-users", user?.id], (old: any[]) => old?.filter((b: any) => b.blocked_id !== blockedId) || []);
    },
  });

  const isBlocked = useCallback((userId: string) => blockedUsers.some((b: any) => b.blocked_id === userId), [blockedUsers]);

  return { blockedUsers, blockUser, unblockUser, isBlocked };
};
