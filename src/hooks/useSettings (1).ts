import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

const SETTINGS_COLS =
  "user_id,theme,allow_anonymous,allow_follows,allow_replies,push_notifications,email_notifications,show_last_seen,show_online,hide_from_search,allow_images,auto_block_offensive,social_visibility,language,notification_sound,notification_volume,vibration_enabled,notification_preview,in_app_sound_enabled";

export const useSettings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["user-settings", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // الخطوة 1: نجيب الـ settings الموجودة
      const { data, error } = await supabase
        .from("user_settings")
        .select(SETTINGS_COLS)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("[useSettings] خطأ في جلب الإعدادات:", error.message);
        return null;
      }

      // موجودة — نرجعها
      if (data) return data;

      // ✅ مش موجودة — لكن نتأكد إن الـ profile موجود الأول
      // سبب الـ foreign key error: التطبيق بيحاول يعمل user_settings
      // قبل ما تريجر handle_new_user يخلص ويعمل الـ profiles row
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      // لو الـ profile مش موجود لسه، نرجع null بهدوء ونخلي الـ retry يشتغل
      if (!profile) {
        console.warn("[useSettings] profile مش موجود لسه، هنحاول تاني...");
        // نرجع error عشان react-query يعمل retry
        throw new Error("profile_not_ready");
      }

      // الـ profile موجود — نعمل settings
      const { data: created, error: insertErr } = await supabase
        .from("user_settings")
        .insert({ user_id: user.id })
        .select(SETTINGS_COLS)
        .single();

      if (insertErr) {
        // 23505 = duplicate key — اتعملت من component تاني في نفس الوقت
        if (insertErr.code === "23505" || insertErr.message?.includes("duplicate") || insertErr.message?.includes("conflict")) {
          // نجيبها بـ select عادي
          const { data: existing } = await supabase
            .from("user_settings")
            .select(SETTINGS_COLS)
            .eq("user_id", user.id)
            .maybeSingle();
          return existing ?? null;
        }
        console.error("[useSettings] خطأ في إنشاء الإعدادات:", insertErr.message);
        return null;
      }

      return created;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    // ✅ retry مع delay — لو الـ profile مش جاهز بعد، ننتظر شوية
    retry: (failureCount, error: any) => {
      if (error?.message === "profile_not_ready") return failureCount < 5;
      return false;
    },
    retryDelay: 1500,
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      if (!user?.id) throw new Error("Not auth");
      const { error } = await supabase
        .from("user_settings")
        .update(updates)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: ["user-settings", user?.id] });
      const prev = queryClient.getQueryData(["user-settings", user?.id]);
      queryClient.setQueryData(["user-settings", user?.id], (old: any) => ({ ...old, ...updates }));
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      queryClient.setQueryData(["user-settings", user?.id], ctx?.prev);
      toast.error("حصل مشكلة");
    },
    onSuccess: () => {
      toast.success("✅");
    },
  });

  return { settings, isLoading, updateSettings };
};
