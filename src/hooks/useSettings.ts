import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

const SETTINGS_COLS = "user_id,theme,allow_anonymous,allow_follows,allow_replies,push_notifications,email_notifications,show_last_seen,show_online,hide_from_search,allow_images,auto_block_offensive,social_visibility,language,notification_sound,notification_volume,vibration_enabled,notification_preview,in_app_sound_enabled";

export const useSettings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["user-settings", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("user_settings")
        .select(SETTINGS_COLS)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      // Auto-bootstrap settings if missing
      if (!data) {
        const { data: created, error: createErr } = await supabase
          .from("user_settings")
          .upsert({ user_id: user.id }, { onConflict: "user_id" })
          .select(SETTINGS_COLS)
          .single();
        if (createErr) throw createErr;
        return created;
      }
      return data;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: 1,
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      if (!user?.id) throw new Error("Not auth");
      const { error } = await supabase.from("user_settings").update(updates).eq("user_id", user.id);
      if (error) throw error;
    },
    // Optimistic update — instant UI
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
