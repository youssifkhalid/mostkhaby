import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useCallback } from "react";

export const useProfileVisits = () => {
  const { user } = useAuth();

  const { data: visitCount = 0 } = useQuery({
    queryKey: ["profile-visits", user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const { count } = await supabase
        .from("profile_visits")
        .select("id", { count: "exact", head: true })
        .eq("profile_id", user.id);
      return count || 0;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
  });

  const recordVisit = useCallback(async (profileId: string) => {
    await supabase.from("profile_visits").insert({ profile_id: profileId });
  }, []);

  return { visitCount, recordVisit };
};
