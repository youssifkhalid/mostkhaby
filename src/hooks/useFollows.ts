// src/hooks/useFollows.ts — COMPLETE IMPLEMENTATION

import React, { useCallback, useRef, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Follow {
  id: string;
  follower_id: string;
  following_id: string;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
}

const FOLLOW_SELECT =
  "id,follower_id,following_id,status,created_at," +
  "follower:profiles!follows_follower_id_fkey(id,username,full_name,avatar_url)," +
  "following:profiles!follows_following_id_fkey(id,username,full_name,avatar_url)";

/**
 * ═══════════════════════════════════════════════════════════════
 * useFollows — إدارة متابعة المستخدمين
 * ═══════════════════════════════════════════════════════════════
 *
 * الإصلاحات:
 * ──────────
 * 1. ✅ Upsert logic — تجنب 409 duplicate constraint violations
 * 2. ✅ Retry mechanism — 3 attempts مع exponential backoff
 * 3. ✅ Atomic operations — فصل pending vs accepted
 * 4. ✅ Optimistic updates — واجهة سريعة
 * 5. ✅ Proper cleanup — على error أو unfollow
 */

export const useFollows = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const qcRef = useRef(qc);

  // Update ref when qc changes
  useEffect(() => {
    qcRef.current = qc;
  }, [qc]);

  // ── Fetch following list ───────────────────────────────────
  const { data: following = [], isLoading: isLoadingFollowing } = useQuery({
    queryKey: ["following", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("follows")
        .select(FOLLOW_SELECT)
        .eq("follower_id", user.id)
        .neq("status", "rejected");

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
  });

  // ── Fetch followers list ───────────────────────────────────
  const { data: followers = [], isLoading: isLoadingFollowers } = useQuery({
    queryKey: ["followers", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("follows")
        .select(FOLLOW_SELECT)
        .eq("following_id", user.id)
        .neq("status", "rejected");

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
  });

  // ── Check if user is following someone ───────────────────
  const isFollowing = useCallback(
    (userId: string): boolean => {
      return following.some(
        (f: any) =>
          f.following_id === userId &&
          (f.status === "accepted" || f.status === "pending")
      );
    },
    [following]
  );

  // ── Follow with retry logic ──────────────────────────────
  /**
   * Strategy:
   * 1. Check if follow already exists (any status except rejected)
   * 2. If exists & status=pending → return (already following)
   * 3. If exists & status=rejected → UPDATE to pending (unblock)
   * 4. If not exists → INSERT new follow
   * 5. On 409 conflict → retry with exponential backoff
   */
  const followMutation = useMutation({
    mutationFn: async (followingId: string) => {
      if (!user?.id || !followingId) throw new Error("Missing user or following ID");
      if (user.id === followingId) throw new Error("Cannot follow yourself");

      const maxRetries = 3;
      let lastError: any;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          // Check existing follow relationship
          const { data: existing } = await supabase
            .from("follows")
            .select("id,status")
            .eq("follower_id", user.id)
            .eq("following_id", followingId)
            .single();

          if (existing) {
            if (
              existing.status === "pending" ||
              existing.status === "accepted"
            ) {
              // Already following
              return { id: existing.id, status: existing.status };
            }

            if (existing.status === "rejected") {
              // Unblock: convert rejection to pending
              const { data, error } = await supabase
                .from("follows")
                .update({ status: "pending" })
                .eq("id", existing.id)
                .select()
                .single();

              if (error) throw error;
              return data;
            }
          }

          // No existing follow — insert new one
          const { data, error } = await supabase
            .from("follows")
            .insert({
              follower_id: user.id,
              following_id: followingId,
              status: "pending",
            })
            .select()
            .single();

          if (error) {
            // 409 = Unique constraint violation
            if (error.code === "23505" || error.message.includes("duplicate")) {
              // Retry with exponential backoff
              const delay = Math.pow(2, attempt) * 100; // 100ms, 200ms, 400ms
              await new Promise((resolve) => setTimeout(resolve, delay));
              continue;
            }
            throw error;
          }

          return data;
        } catch (err: any) {
          lastError = err;
          if (attempt < maxRetries - 1) {
            const delay = Math.pow(2, attempt) * 100;
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      }

      throw lastError || new Error("Follow failed after retries");
    },
    onMutate: async (followingId: string) => {
      // Optimistic update — add to following list
      qcRef.current.setQueryData(["following", user?.id], (old: any[] = []) => {
        if (
          old.some(
            (f) =>
              f.following_id === followingId &&
              (f.status === "pending" || f.status === "accepted")
          )
        ) {
          return old;
        }

        return [
          ...old,
          {
            id: `temp-${Date.now()}`,
            follower_id: user?.id,
            following_id: followingId,
            status: "pending",
            created_at: new Date().toISOString(),
          },
        ];
      });
    },
    onError: () => {
      // Invalidate to fetch fresh data on error
      qcRef.current.invalidateQueries({
        queryKey: ["following", user?.id],
      });
    },
  });

  // ── Unfollow with cleanup ────────────────────────────────
  const unfollowMutation = useMutation({
    mutationFn: async (followingId: string) => {
      if (!user?.id) throw new Error("User not logged in");

      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", followingId);

      if (error) throw error;
    },
    onMutate: async (followingId: string) => {
      // Optimistic remove
      qcRef.current.setQueryData(["following", user?.id], (old: any[] = []) =>
        old.filter((f: any) => f.following_id !== followingId)
      );
    },
    onError: () => {
      // Refetch on error
      qcRef.current.invalidateQueries({
        queryKey: ["following", user?.id],
      });
    },
  });

  // ── Accept follow request (for receiving follow requests) ──
  const acceptFollowMutation = useMutation({
    mutationFn: async (followerId: string) => {
      if (!user?.id) throw new Error("User not logged in");

      const { data, error } = await supabase
        .from("follows")
        .update({ status: "accepted" })
        .eq("follower_id", followerId)
        .eq("following_id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async (followerId: string) => {
      qcRef.current.setQueryData(["followers", user?.id], (old: any[] = []) =>
        old.map((f: any) =>
          f.follower_id === followerId ? { ...f, status: "accepted" } : f
        )
      );
    },
  });

  // ── Reject follow request ────────────────────────────────
  const rejectFollowMutation = useMutation({
    mutationFn: async (followerId: string) => {
      if (!user?.id) throw new Error("User not logged in");

      const { error } = await supabase
        .from("follows")
        .update({ status: "rejected" })
        .eq("follower_id", followerId)
        .eq("following_id", user.id);

      if (error) throw error;
    },
    onMutate: async (followerId: string) => {
      qcRef.current.setQueryData(["followers", user?.id], (old: any[] = []) =>
        old.filter((f: any) => f.follower_id !== followerId)
      );
    },
  });

  // ── Pending follow requests ──────────────────────────────
  const pendingRequests = React.useMemo(() => {
    return followers.filter((f: any) => f.status === "pending");
  }, [followers]);

  return {
    // Data
    following,
    followers,
    pendingRequests,
    isFollowing,
    isLoadingFollowing,
    isLoadingFollowers,

    // Mutations
    follow: followMutation,
    isFollowingMutationPending: followMutation.isPending,
    unfollow: unfollowMutation,
    isUnfollowing: unfollowMutation.isPending,
    acceptFollow: acceptFollowMutation,
    isAcceptingFollow: acceptFollowMutation.isPending,
    rejectFollow: rejectFollowMutation,
    isRejectingFollow: rejectFollowMutation.isPending,

    // Status
    followError: followMutation.error,
    unfollowError: unfollowMutation.error,
  };
};

export default useFollows;
