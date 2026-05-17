import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export const useNicknames = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: nicknames = {} } = useQuery({
    queryKey: ["contact-nicknames", user?.id],
    queryFn: async () => {
      if (!user?.id) return {};
      const { data, error } = await supabase
        .from("contact_nicknames")
        .select("contact_id,nickname")
        .eq("owner_id", user.id);
      if (error) throw error;
      const map: Record<string, string> = {};
      (data || []).forEach((r: any) => { map[r.contact_id] = r.nickname; });
      return map;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  });

  const setNickname = useMutation({
    mutationFn: async ({ contactId, nickname }: { contactId: string; nickname: string }) => {
      if (!user?.id) throw new Error("Not auth");
      if (!nickname.trim()) {
        const { error } = await supabase
          .from("contact_nicknames")
          .delete()
          .eq("owner_id", user.id)
          .eq("contact_id", contactId);
        if (error) throw error;
        return null;
      }
      const { error } = await supabase
        .from("contact_nicknames")
        .upsert({ owner_id: user.id, contact_id: contactId, nickname: nickname.trim() }, { onConflict: "owner_id,contact_id" });
      if (error) throw error;
      return nickname.trim();
    },
    onMutate: async ({ contactId, nickname }) => {
      await qc.cancelQueries({ queryKey: ["contact-nicknames", user?.id] });
      const prev = qc.getQueryData(["contact-nicknames", user?.id]);
      qc.setQueryData(["contact-nicknames", user?.id], (old: any) => {
        const next = { ...(old || {}) };
        if (!nickname.trim()) delete next[contactId]; else next[contactId] = nickname.trim();
        return next;
      });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      qc.setQueryData(["contact-nicknames", user?.id], ctx?.prev);
      toast.error("مش قادر يحفظ الاسم");
    },
    onSuccess: (val) => {
      toast.success(val ? "اتغير الاسم ✏️" : "اترجع للاسم الأصلي");
    },
  });

  const getDisplayName = (contactId: string, fallback: string) => nicknames[contactId] || fallback;

  return { nicknames, setNickname, getDisplayName };
};
