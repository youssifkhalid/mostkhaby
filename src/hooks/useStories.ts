import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

// Realtime subscription: invalidate story queries when stories table changes
export const useStoriesRealtime = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  useEffect(() => {
    if (!user?.id) return;
    const ch = supabase
      .channel(`stories-rt-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "stories" }, () => {
        qc.invalidateQueries({ queryKey: ["stories-active"] });
        qc.invalidateQueries({ queryKey: ["stories-user"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id, qc]);
};

export interface StoryOverlay {
  id: string;
  type: "text" | "sticker";
  value: string;
  x: number; // 0..1
  y: number; // 0..1
  scale: number;
  rotation: number;
  color?: string;
  size?: number;
  bold?: boolean;
}

export interface StoryAuthor {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

export interface Story {
  id: string;
  author_id: string;
  media_url: string;
  media_type: "image" | "video";
  width: number | null;
  height: number | null;
  duration: number;
  caption: string | null;
  overlays: StoryOverlay[];
  privacy: "public" | "followers" | "close_friends";
  views_count: number;
  created_at: string;
  expires_at: string;
  audio_url?: string | null;
  audio_title?: string | null;
  audio_artist?: string | null;
  audio_cover?: string | null;
  audio_start?: number | null;
  author?: StoryAuthor;
  viewed_by_me?: boolean;
}

export interface StoryGroup {
  author: StoryAuthor;
  stories: Story[];
  hasUnseen: boolean;
  latestAt: string;
}

async function hydrateStories(rows: any[], userId?: string): Promise<Story[]> {
  if (!rows.length) return [];
  const authorIds = Array.from(new Set(rows.map(r => r.author_id)));
  const ids = rows.map(r => r.id);
  const [{ data: authors }, { data: myViews }] = await Promise.all([
    supabase.from("profiles").select("id,username,full_name,avatar_url").in("id", authorIds),
    userId
      ? supabase.from("story_views").select("story_id").eq("viewer_id", userId).in("story_id", ids)
      : Promise.resolve({ data: [] as any[] }),
  ]);
  const aMap = new Map((authors || []).map((a: any) => [a.id, a]));
  const seen = new Set((myViews || []).map((v: any) => v.story_id));
  return rows.map(r => ({
    ...r,
    overlays: Array.isArray(r.overlays) ? r.overlays : [],
    author: aMap.get(r.author_id),
    viewed_by_me: seen.has(r.id),
  })) as Story[];
}

export const useActiveStories = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["stories-active", user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async (): Promise<StoryGroup[]> => {
      const { data, error } = await supabase
        .from("stories")
        .select("*")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: true })
        .limit(500);
      if (error) throw error;
      const hydrated = await hydrateStories(data || [], user?.id);
      const map = new Map<string, Story[]>();
      hydrated.forEach(s => {
        const arr = map.get(s.author_id) || [];
        arr.push(s);
        map.set(s.author_id, arr);
      });
      const groups: StoryGroup[] = Array.from(map.entries()).map(([_aid, stories]) => ({
        author: stories[0].author!,
        stories,
        hasUnseen: stories.some(s => !s.viewed_by_me),
        latestAt: stories[stories.length - 1].created_at,
      })).filter(g => g.author);
      // Sort: my group first, then unseen, then most recent
      groups.sort((a, b) => {
        if (a.author.id === user!.id) return -1;
        if (b.author.id === user!.id) return 1;
        if (a.hasUnseen !== b.hasUnseen) return a.hasUnseen ? -1 : 1;
        return b.latestAt.localeCompare(a.latestAt);
      });
      return groups;
    },
  });
};

export const useUserStories = (userId?: string) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["stories-user", userId],
    enabled: !!userId,
    queryFn: async (): Promise<Story[]> => {
      const { data, error } = await supabase
        .from("stories")
        .select("*")
        .eq("author_id", userId!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return hydrateStories(data || [], user?.id);
    },
  });
};

export const useCreateStory = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      media_url: string;
      media_type: "image" | "video";
      width?: number;
      height?: number;
      duration: number;
      overlays: StoryOverlay[];
      caption?: string;
      privacy: Story["privacy"];
      audio_url?: string;
      audio_title?: string;
      audio_artist?: string;
      audio_cover?: string;
      audio_start?: number;
    }) => {
      if (!user?.id) throw new Error("not authenticated");
      const { data, error } = await supabase.from("stories").insert({
        author_id: user.id,
        media_url: input.media_url,
        media_type: input.media_type,
        width: input.width,
        height: input.height,
        duration: Math.min(Math.max(input.duration || 5, 3), 30),
        overlays: input.overlays as any,
        caption: input.caption?.trim() || null,
        privacy: input.privacy,
        audio_url: input.audio_url || null,
        audio_title: input.audio_title || null,
        audio_artist: input.audio_artist || null,
        audio_cover: input.audio_cover || null,
        audio_start: input.audio_start ?? 0,
      } as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stories-active"] });
      qc.invalidateQueries({ queryKey: ["stories-user"] });
      toast.success("تم نشر قصتك! ✨");
    },
    onError: (e: any) => toast.error(e?.message || "تعذّر نشر القصة"),
  });
};

export const useDeleteStory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (storyId: string) => {
      const { error } = await supabase.from("stories").delete().eq("id", storyId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stories-active"] });
      qc.invalidateQueries({ queryKey: ["stories-user"] });
      toast.success("تم حذف القصة");
    },
  });
};

export const useMarkStoryViewed = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (storyId: string) => {
      if (!user?.id) return;
      await supabase.from("story_views").insert({ story_id: storyId, viewer_id: user.id }).select().maybeSingle();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stories-active"] });
    },
  });
};

export const useStoryViewers = (storyId?: string, enabled = true) => {
  return useQuery({
    queryKey: ["story-viewers", storyId],
    enabled: !!storyId && enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("story_views")
        .select("viewer_id, created_at")
        .eq("story_id", storyId!)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      const ids = (data || []).map((v: any) => v.viewer_id);
      if (!ids.length) return [];
      const { data: profiles } = await supabase.from("profiles").select("id,username,full_name,avatar_url").in("id", ids);
      const map = new Map((profiles || []).map((p: any) => [p.id, p]));
      return (data || []).map((v: any) => ({ ...v, profile: map.get(v.viewer_id) }));
    },
  });
};

export const useReplyToStory = () => {
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ storyId, content, authorId }: { storyId: string; content: string; authorId: string }) => {
      if (!user?.id) throw new Error("not authenticated");
      const { error } = await supabase.from("story_replies").insert({
        story_id: storyId, replier_id: user.id, content: content.trim(),
      });
      if (error) throw error;
      // Best-effort: also push into chat between the two users
      try {
        const { data: existing } = await supabase
          .from("chats")
          .select("id")
          .or(`and(user1_id.eq.${user.id},user2_id.eq.${authorId}),and(user1_id.eq.${authorId},user2_id.eq.${user.id})`)
          .maybeSingle();
        let chatId = existing?.id;
        if (!chatId) {
          const { data: created } = await supabase.from("chats").insert({
            user1_id: user.id, user2_id: authorId,
          }).select().single();
          chatId = created?.id;
        }
        if (chatId) {
          await supabase.from("chat_messages").insert({
            chat_id: chatId, sender_id: user.id,
            content: `↪️ رد على قصة: ${content.trim()}`,
          });
        }
      } catch (e) { console.warn("forward reply to chat failed", e); }
    },
    onSuccess: () => toast.success("تم إرسال الرد"),
    onError: (e: any) => toast.error(e?.message || "تعذّر إرسال الرد"),
  });
};

// ===== Close friends =====
export const useCloseFriends = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["close-friends", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("close_friends").select("friend_id").eq("owner_id", user!.id);
      if (error) throw error;
      const ids = (data || []).map((r: any) => r.friend_id);
      if (!ids.length) return [] as { friend_id: string; profile?: StoryAuthor }[];
      const { data: profiles } = await supabase.from("profiles").select("id,username,full_name,avatar_url").in("id", ids);
      const map = new Map((profiles || []).map((p: any) => [p.id, p]));
      return ids.map(id => ({ friend_id: id, profile: map.get(id) }));
    },
  });
};

export const useToggleCloseFriend = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ friendId, included }: { friendId: string; included: boolean }) => {
      if (!user?.id) throw new Error("not authenticated");
      if (included) {
        await supabase.from("close_friends").delete().eq("owner_id", user.id).eq("friend_id", friendId);
      } else {
        await supabase.from("close_friends").insert({ owner_id: user.id, friend_id: friendId });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["close-friends"] }),
  });
};

// ===== Highlights =====
export interface Highlight {
  id: string;
  owner_id: string;
  title: string;
  cover_url: string | null;
  position: number;
  created_at: string;
  story_count?: number;
  first_story_url?: string;
}

export const useHighlights = (userId?: string) => {
  return useQuery({
    queryKey: ["highlights", userId],
    enabled: !!userId,
    queryFn: async (): Promise<Highlight[]> => {
      const { data, error } = await supabase
        .from("story_highlights")
        .select("*")
        .eq("owner_id", userId!)
        .order("position", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      const hs = data || [];
      if (!hs.length) return [];
      const { data: links } = await supabase
        .from("highlight_stories")
        .select("highlight_id, story_id")
        .in("highlight_id", hs.map((h: any) => h.id));
      const storyIds = Array.from(new Set((links || []).map((l: any) => l.story_id)));
      const { data: stories } = storyIds.length
        ? await supabase.from("stories").select("id, media_url, media_type").in("id", storyIds)
        : { data: [] as any[] };
      const sMap = new Map((stories || []).map((s: any) => [s.id, s]));
      const linksByH = new Map<string, string[]>();
      (links || []).forEach((l: any) => {
        const arr = linksByH.get(l.highlight_id) || [];
        arr.push(l.story_id);
        linksByH.set(l.highlight_id, arr);
      });
      return hs.map((h: any) => {
        const sids = linksByH.get(h.id) || [];
        const first = sids.length ? sMap.get(sids[0]) : null;
        return {
          ...h,
          story_count: sids.length,
          first_story_url: h.cover_url || first?.media_url,
        };
      });
    },
  });
};

export const useHighlightStories = (highlightId?: string) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["highlight-stories", highlightId],
    enabled: !!highlightId,
    queryFn: async (): Promise<Story[]> => {
      const { data: links } = await supabase
        .from("highlight_stories")
        .select("story_id, position")
        .eq("highlight_id", highlightId!)
        .order("position", { ascending: true });
      const ids = (links || []).map((l: any) => l.story_id);
      if (!ids.length) return [];
      const { data: stories } = await supabase.from("stories").select("*").in("id", ids);
      return hydrateStories(stories || [], user?.id);
    },
  });
};

export const useCreateHighlight = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ title, cover_url, storyIds }: { title: string; cover_url?: string; storyIds?: string[] }) => {
      if (!user?.id) throw new Error("not authenticated");
      const { data: h, error } = await supabase.from("story_highlights").insert({
        owner_id: user.id, title: title.trim() || "بدون عنوان", cover_url: cover_url || null,
      }).select().single();
      if (error) throw error;
      if (storyIds?.length) {
        await supabase.from("highlight_stories").insert(
          storyIds.map((sid, i) => ({ highlight_id: h.id, story_id: sid, position: i }))
        );
      }
      return h;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["highlights"] });
      toast.success("تم إنشاء الـ Highlight");
    },
    onError: (e: any) => toast.error(e?.message || "تعذّر الإنشاء"),
  });
};

export const useAddStoryToHighlight = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ highlightId, storyId }: { highlightId: string; storyId: string }) => {
      const { error } = await supabase.from("highlight_stories").insert({
        highlight_id: highlightId, story_id: storyId, position: 0,
      });
      if (error && !String(error.message).includes("duplicate")) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["highlights"] });
      toast.success("تمت الإضافة للـ Highlights");
    },
  });
};

export const useDeleteHighlight = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("story_highlights").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["highlights"] });
      toast.success("تم الحذف");
    },
  });
};
