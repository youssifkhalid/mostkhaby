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

      // الخطوة 1: نجرب نجيب الـ settings الموجودة
      const { data, error } = await supabase
        .from("user_settings")
        .select(SETTINGS_COLS)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("[useSettings] خطأ في جلب الإعدادات:", error.message);
        return null;
      }

      // لو موجودة — نرجعها مباشرة
      if (data) return data;

      // الخطوة 2: مش موجودة — نعملها بـ INSERT فقط (مش upsert)
      // ✅ الحل للـ 409: استخدام INSERT مع ignoreDuplicates
      // عشان لو أكتر من component بيحاول يعملها في نفس الوقت،
      // أول واحد ينجح والباقيين يتجاهلوا الـ conflict بدون خطأ
      const { data: created, error: insertErr } = await supabase
        .from("user_settings")
        .insert({ user_id: user.id })
        .select(SETTINGS_COLS)
        .single();

      if (insertErr) {
        // كود 23505 = unique violation — يعني row اتعملت بالفعل من حاجة تانية
        // نرجع نجيبها بدل ما نرمي error
        if (insertErr.code === "23505" || insertErr.message?.includes("duplicate") || insertErr.message?.includes("conflict")) {
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
    // ✅ retry: false عشان ما يكررش المحاولة ويسبب conflict تاني
    retry: false,
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
    // Optimistic update — الـ UI يتحدث فورًا
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: ["user-settings", user?.id] });
      const prev = queryClient.getQueryData(["user-settings", user?.id]);
      queryClient.setQueryData(["user-settings", user?.id], (old: any) => ({
        ...old,
        ...updates,
      }));
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
