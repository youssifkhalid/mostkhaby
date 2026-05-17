import { memo } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { UserPlus } from "lucide-react";
import OnlineIndicator from "@/components/OnlineIndicator";

const SuggestedPeople = memo(() => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: suggestions = [], isLoading } = useQuery({
    queryKey: ["suggested-people", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data: follows } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);
      const followedIds = (follows || []).map(f => f.following_id);
      const excludeIds = [user.id, ...followedIds];

      const { data } = await supabase
        .from("profiles")
        .select("id,username,full_name,avatar_url,is_online")
        .not("id", "in", `(${excludeIds.join(",")})`)
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
  });

  if (isLoading || suggestions.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="font-cairo font-bold text-foreground text-right">اقتراحات أشخاص 🧑‍🤝‍🧑</h3>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {suggestions.map((person, i) => (
          <motion.button
            key={person.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate(`/${person.username}`)}
            className="glass-card p-4 min-w-[140px] flex flex-col items-center gap-2 hover:border-primary/20 transition-all flex-shrink-0"
          >
            <div className="relative">
              {person.avatar_url ? (
                <img src={person.avatar_url} alt="" className="w-14 h-14 rounded-xl object-cover" loading="lazy" />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center text-primary font-bold text-xl">
                  {person.full_name?.charAt(0) || person.username.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="absolute -bottom-0.5 -right-0.5">
                <OnlineIndicator isOnline={person.is_online || false} />
              </div>
            </div>
            <p className="font-cairo font-semibold text-sm text-foreground truncate max-w-[120px]">
              {person.full_name || person.username}
            </p>
            <p className="text-[10px] text-muted-foreground">@{person.username}</p>
            <div className="flex items-center gap-1 text-xs text-primary font-cairo">
              <UserPlus size={12} /> متابعة
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
});

SuggestedPeople.displayName = "SuggestedPeople";

export default SuggestedPeople;
