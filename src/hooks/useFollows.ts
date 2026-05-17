import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useMemo, useCallback, useEffect } from "react";

export const useFollows = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: followers = [] } = useQuery({
    queryKey: ["followers", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from("follows")
        .select("id,follower_id,following_id,status,follower:profiles!follows_follower_id_fkey(id,username,full_name,avatar_url)")
        .eq("following_id", user.id);
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
  });

  const { data: following = [] } = useQuery({
    queryKey: ["following", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from("follows")
        .select("id,follower_id,following_id,status,following:profiles!follows_following_id_fkey(id,username,full_name,avatar_url)")
        .eq("follower_id", user.id);
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
  });

  // Realtime: instant updates for follows
  useEffect(() => {
    if (!user?.id) return;
    const ch = supabase
      .channel("follows-rt")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "follows", filter: `following_id=eq.${user.id}` }, async (payload) => {
        // Fetch profile data for the new follower, then inject into cache
        const { data: profile } = await supabase.from("profiles").select("id,username,full_name,avatar_url").eq("id", payload.new.follower_id).single();
        const newFollow = { ...payload.new, follower: profile };
        qc.setQueryData(["followers", user.id], (old: any[]) => old ? [...old, newFollow] : [newFollow]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "follows", filter: `following_id=eq.${user.id}` }, (payload) => {
        qc.setQueryData(["followers", user.id], (old: any[]) =>
          old?.map((f: any) => f.id === payload.new.id ? { ...f, ...payload.new } : f)
        );
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "follows", filter: `following_id=eq.${user.id}` }, (payload) => {
        qc.setQueryData(["followers", user.id], (old: any[]) => old?.filter((f: any) => f.id !== payload.old.id) || []);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "follows", filter: `follower_id=eq.${user.id}` }, async (payload) => {
        const { data: profile } = await supabase.from("profiles").select("id,username,full_name,avatar_url").eq("id", payload.new.following_id).single();
        const newFollow = { ...payload.new, following: profile };
        qc.setQueryData(["following", user.id], (old: any[]) => old ? [...old, newFollow] : [newFollow]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "follows", filter: `follower_id=eq.${user.id}` }, (payload) => {
        qc.setQueryData(["following", user.id], (old: any[]) =>
          old?.map((f: any) => f.id === payload.new.id ? { ...f, ...payload.new } : f)
        );
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "follows", filter: `follower_id=eq.${user.id}` }, (payload) => {
        qc.setQueryData(["following", user.id], (old: any[]) => old?.filter((f: any) => f.id !== payload.old.id) || []);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id, qc]);

  const follow = useMutation({
    mutationFn: async (targetId: string) => {
      const { error } = await supabase.from("follows").insert({ follower_id: user!.id, following_id: targetId });
      if (error) throw error;
    },
  });

  const acceptFollow = useMutation({
    mutationFn: async (followId: string) => {
      const { error } = await supabase.from("follows").update({ status: "accepted" }).eq("id", followId);
      if (error) throw error;
    },
    onMutate: async (followId) => {
      qc.setQueryData(["followers", user?.id], (old: any[]) =>
        old?.map((f) => f.id === followId ? { ...f, status: "accepted" } : f)
      );
    },
  });

  const unfollow = useMutation({
    mutationFn: async (targetId: string) => {
      const { error } = await supabase.from("follows").delete().eq("follower_id", user!.id).eq("following_id", targetId);
      if (error) throw error;
    },
    onMutate: async (targetId) => {
      qc.setQueryData(["following", user?.id], (old: any[]) =>
        old?.filter((f) => f.following_id !== targetId)
      );
    },
  });

  const pendingRequests = useMemo(() => followers.filter((f: any) => f.status === "pending"), [followers]);
  const isFollowing = useCallback((targetId: string) => following.some((f: any) => f.following_id === targetId), [following]);
  const getFollowStatus = useCallback((targetId: string) => following.find((f: any) => f.following_id === targetId)?.status, [following]);

  return { followers, following, follow, acceptFollow, unfollow, pendingRequests, isFollowing, getFollowStatus };
};
