import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useEffect, useRef, useMemo } from "react";
import { useSettings } from "./useSettings";
import { playNotificationSound, vibrate } from "@/lib/notificationSounds";

export const useNotifications = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { settings } = useSettings();

  // ✅ نحفظ settings في ref — عشان الـ channel ما يعيدش subscribe كل ما تتغير
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("notifications")
        .select("id,content,type,is_read,created_at")
        .eq("user_id", user.id)
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

  // ✅ channel واحد بس — بيتعمل مرة واحدة لما يتغير user?.id فقط
  // الـ .on("INSERT") و .on("UPDATE") على نفس الـ channel قبل .subscribe() — ده صح
  // المشكلة القديمة كانت إن الـ useEffect كان بيتشغل مرة تانية بسبب settings في الـ deps
  // فكان بيحاول يضيف .on() على channel اتـ subscribe بالفعل
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          queryClient.setQueryData(["notifications", user.id], (old: any[]) => {
            if (!old) return [payload.new];
            if (old.some((n: any) => n.id === payload.new.id)) return old;
            return [payload.new, ...old];
          });
          // نقرأ من الـ ref مش من الـ closure
          const s: any = settingsRef.current;
          if (!s || s.in_app_sound_enabled !== false)
            playNotificationSound(s?.notification_sound || "default", s?.notification_volume ?? 80);
          if (!s || s.vibration_enabled !== false)
            vibrate([60, 40, 60]);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          queryClient.setQueryData(["notifications", user.id], (old: any[]) =>
            old?.map((n: any) => n.id === payload.new.id ? { ...n, ...payload.new } : n)
          );
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]); // ✅ user?.id فقط — مش settings

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id);
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
        .from("notifications").update({ is_read: true })
        .eq("user_id", user.id).eq("is_read", false);
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
