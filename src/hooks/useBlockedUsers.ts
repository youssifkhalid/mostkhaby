import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useEffect, useCallback, useRef } from "react";

export const useBlockedUsers = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  // ✅ qc في ref عشان ما يكونش في deps الـ useEffect
  const qcRef = useRef(qc);
  useEffect(() => { qcRef.current = qc; }, [qc]);

  const { data: blockedUsers = [] } = useQuery({
    queryKey: ["blocked-users", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      // ✅ مش بنعمل join على profiles — ده كان بيسبب 404 لو الجدول أو العلاقة مش موجودة
      // بنجيب البيانات الأساسية بس
      const { data, error } = await supabase
        .from("blocked_users")
        .select("id,blocked_id,blocker_id,created_at")
        .eq("blocker_id", user.id);

      if (error) {
        // ✅ لو الجدول مش موجود، نرجع array فاضية بدل ما نكرش
        console.warn("[useBlockedUsers] جدول blocked_users مش موجود أو في خطأ:", error.message);
        return [];
      }
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
    // ✅ retry: false عشان لو الجدول مش موجود ما يظلش يحاول
    retry: false,
  });

  // ✅ channel اسمه unique بـ user.id والـ instance لتجنب الكراش عند الاستدعاء المتعدد
  useEffect(() => {
    if (!user?.id) return;
    const instanceId = Math.random().toString(36).substring(7);
    const ch = supabase
      .channel(`blocked-rt-${user.id}-${instanceId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "blocked_users", filter: `blocker_id=eq.${user.id}` },
        (payload) => {
          qcRef.current.setQueryData(["blocked-users", user.id], (old: any[]) =>
            old ? [...old, payload.new] : [payload.new]
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "blocked_users", filter: `blocker_id=eq.${user.id}` },
        (payload) => {
          qcRef.current.setQueryData(["blocked-users", user.id], (old: any[]) =>
            old?.filter((b: any) => b.id !== payload.old.id) || []
          );
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]); // ✅ user?.id فقط

  const blockUser = useMutation({
    mutationFn: async (blockedId: string) => {
      if (!user?.id) throw new Error("Not auth");
      const { error } = await supabase
        .from("blocked_users")
        .insert({ blocker_id: user.id, blocked_id: blockedId });
      if (error) throw error;
    },
    onMutate: async (blockedId) => {
      const optimistic = {
        id: `temp-${Date.now()}`,
        blocker_id: user?.id,
        blocked_id: blockedId,
        created_at: new Date().toISOString(),
      };
      qc.setQueryData(["blocked-users", user?.id], (old: any[]) => [
        ...(old || []),
        optimistic,
      ]);
    },
  });

  const unblockUser = useMutation({
    mutationFn: async (blockedId: string) => {
      if (!user?.id) throw new Error("Not auth");
      const { error } = await supabase
        .from("blocked_users")
        .delete()
        .eq("blocker_id", user.id)
        .eq("blocked_id", blockedId);
      if (error) throw error;
    },
    onMutate: async (blockedId) => {
      qc.setQueryData(["blocked-users", user?.id], (old: any[]) =>
        old?.filter((b: any) => b.blocked_id !== blockedId) || []
      );
    },
  });

  const isBlocked = useCallback(
    (userId: string) => blockedUsers.some((b: any) => b.blocked_id === userId),
    [blockedUsers]
  );

  return { blockedUsers, blockUser, unblockUser, isBlocked };
};
