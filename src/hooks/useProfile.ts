import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { Tables, TablesUpdate } from "@/integrations/supabase/types";

export type Profile = Tables<"profiles">;

const PROFILE_COLS = "id,username,full_name,avatar_url,bio,gender,social_links,is_online,last_seen,phone_number";

export const useProfile = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select(PROFILE_COLS)
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;

      // Auto-bootstrap: if profile doesn't exist yet (trigger may not have fired)
      if (!data) {
        const newProfile = {
          id: user.id,
          username: user.user_metadata?.username || `user_${user.id.substring(0, 8)}`,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || "",
          avatar_url: user.user_metadata?.avatar_url || "",
        };
        const { data: created, error: createErr } = await supabase
          .from("profiles")
          .upsert(newProfile, { onConflict: "id" })
          .select(PROFILE_COLS)
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
    retry: 1,
  });

  const updateProfile = useMutation({
    mutationFn: async (updates: TablesUpdate<"profiles">) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id)
        .select(PROFILE_COLS)
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["profile", user?.id], data);
    },
  });

  return { profile, isLoading, updateProfile };
};

export const useProfileByUsername = (username: string | undefined) => {
  return useQuery({
    queryKey: ["profile", "username", username],
    queryFn: async () => {
      if (!username) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("id,username,full_name,avatar_url,bio,gender,social_links,is_online,last_seen")
        .eq("username", username)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!username,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
    retry: 1,
  });
};
