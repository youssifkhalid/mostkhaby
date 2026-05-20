import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useMemo } from "react";

/**
 * ✅ useNotifications — بيانات بس، صفر Realtime هنا
 *
 * المشكلة القديمة:
 *   الـ hook ده بيتنادى من 3 أماكن في نفس الوقت:
 *   BottomNav + TopBar + NotificationsPage
 *   كل واحد كان بيعمل channel بنفس الاسم.
 *   لما settings بتتجيب من الداتابيز، كانت في الـ deps
 *   فالـ useEffect بيشتغل تاني → بيحاول يضيف .on() على
 *   channel اتـ subscribe بالفعل → كراش.
 *
 * الحل:
 *   شيلنا الـ Realtime من هنا خالص.
 *   الـ Realtime موجود في GlobalMessageListener بس —
 *   مكان واحد، channel واحد، بيشتغل مرة واحدة.
 */
export const useNotifications = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("notifications")
        .select("id,content,type,is_read,created_at")
        .eq("user_id", user.id)
        .neq("type", "message")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 3,
    gcTime: 1000 * 60 * 15,
    refetchOnWindowFocus: false,
  });

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      queryClient.setQueryData(["notifications", user?.id], (old: any[]) =>
        old?.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
      if (error) throw error;
    },
    onMutate: () => {
      queryClient.setQueryData(["notifications", user?.id], (old: any[]) =>
        old?.map((n) => ({ ...n, is_read: true }))
      );
    },
  });

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  );

  return { notifications, isLoading, markAsRead, markAllAsRead, unreadCount };
};
