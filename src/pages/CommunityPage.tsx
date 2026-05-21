import { motion } from "framer-motion";
import TopBar from "@/components/TopBar";
import InstallBanner from "@/components/InstallBanner";
import { Search, Loader2, Users } from "lucide-react";
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import type { Tables } from "@/integrations/supabase/types";
import UserAvatar from "@/components/UserAvatar";
import SuggestedPeople from "@/components/SuggestedPeople";

let debounceTimer: ReturnType<typeof setTimeout>;

const CommunityPage = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Tables<"profiles">[]>([]);
  const [searching, setSearching] = useState(false);
  const navigate = useNavigate();

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); setSearching(false); return; }
    setSearching(true);
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .or(`username.ilike.%${q}%,full_name.ilike.%${q}%`)
      .limit(15);
    setResults(data || []);
    setSearching(false);
  }, []);

  const handleSearch = (q: string) => {
    setQuery(q);
    clearTimeout(debounceTimer);
    if (q.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    debounceTimer = setTimeout(() => doSearch(q), 300);
  };

  return (
    <div className="min-h-screen pb-24">
      <TopBar />
      <InstallBanner />
      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        <div className="relative">
          <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="دوّر على حد وابعتله رسالة..."
            className="w-full bg-secondary/30 rounded-xl py-3 pr-10 pl-4 text-sm text-foreground placeholder:text-muted-foreground font-cairo border border-border/20 focus:border-primary/50 focus:outline-none transition-colors"
          />
        </div>

        {/* Suggestions */}
        {!query && <SuggestedPeople />}

        {searching && (
          <div className="flex justify-center py-8">
            <Loader2 size={24} className="animate-spin text-primary" />
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-2">
            {results.map((u, i) => (
              <motion.button
                key={u.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(`/${u.username}`)}
                className="w-full glass-card p-4 flex items-center gap-3 hover:border-primary/20 transition-all"
              >
                <UserAvatar
                  url={u.avatar_url}
                  name={u.full_name || u.username}
                  size="md"
                  isOnline={u.is_online || false}
                />
                <div className="flex-1 text-right">
                  <p className="font-cairo font-semibold text-foreground">{u.full_name || u.username}</p>
                  <p className="text-xs text-muted-foreground">@{u.username}</p>
                </div>
              </motion.button>
            ))}
          </div>
        )}

        {!query && results.length === 0 && !searching && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-10 space-y-4">
            <div className="w-24 h-24 mx-auto bg-primary/10 rounded-3xl flex items-center justify-center">
              <Users size={48} className="text-primary" />
            </div>
            <h3 className="font-cairo font-bold text-xl text-foreground">دوّر على صحابك!</h3>
            <p className="text-sm text-muted-foreground">اكتب اسم المستخدم عشان تبعتله رسالة مجهولة 🤫</p>
          </motion.div>
        )}

        {query.length >= 2 && !searching && results.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground font-cairo">مفيش نتايج لـ "{query}" 😕</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommunityPage;
