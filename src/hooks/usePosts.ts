import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface PostMedia { id: string; url: string; type: "image" | "video"; position: number; width?: number; height?: number }
export interface PostAuthor { id: string; username: string | null; full_name: string | null; avatar_url: string | null }
export interface Post {
  id: string;
  author_id: string;
  caption: string | null;
  media_type: "none" | "image" | "carousel" | "video";
  privacy: "public" | "followers" | "private";
  hashtags: string[];
  likes_count: number;
  comments_count: number;
  saves_count: number;
  is_edited: boolean;
  created_at: string;
  author?: PostAuthor;
  media?: PostMedia[];
  liked_by_me?: boolean;
  saved_by_me?: boolean;
}

const PAGE_SIZE = 10;

async function hydratePosts(rows: any[], userId?: string): Promise<Post[]> {
  if (!rows.length) return [];
  const ids = rows.map(r => r.id);
  const authorIds = Array.from(new Set(rows.map(r => r.author_id)));
  const [{ data: media }, { data: authors }, { data: myLikes }, { data: mySaves }] = await Promise.all([
    supabase.from("post_media").select("id,post_id,url,type,position,width,height").in("post_id", ids).order("position"),
    supabase.from("profiles").select("id,username,full_name,avatar_url").in("id", authorIds),
    userId ? supabase.from("post_likes").select("post_id").eq("user_id", userId).in("post_id", ids) : Promise.resolve({ data: [] as any[] }),
    userId ? supabase.from("saved_posts").select("post_id").eq("user_id", userId).in("post_id", ids) : Promise.resolve({ data: [] as any[] }),
  ]);
  const likedSet = new Set((myLikes || []).map((l: any) => l.post_id));
  const savedSet = new Set((mySaves || []).map((s: any) => s.post_id));
  const authorMap = new Map((authors || []).map((a: any) => [a.id, a]));
  const mediaByPost = new Map<string, PostMedia[]>();
  (media || []).forEach((m: any) => {
    const arr = mediaByPost.get(m.post_id) || [];
    arr.push(m);
    mediaByPost.set(m.post_id, arr);
  });
  return rows.map(r => ({
    ...r,
    author: authorMap.get(r.author_id),
    media: mediaByPost.get(r.id) || [],
    liked_by_me: likedSet.has(r.id),
    saved_by_me: savedSet.has(r.id),
  })) as Post[];
}

export const useFeedPosts = () => {
  const { user } = useAuth();
  return useInfiniteQuery({
    queryKey: ["feed-posts", user?.id],
    enabled: !!user?.id,
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) => {
      const from = (pageParam as number) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false })
        .range(from, to);
      if (error) throw error;
      const hydrated = await hydratePosts(data || [], user?.id);
      return { items: hydrated, nextPage: (data?.length || 0) === PAGE_SIZE ? (pageParam as number) + 1 : null };
    },
    getNextPageParam: (last) => last.nextPage,
    staleTime: 1000 * 60 * 2,
  });
};

export const useUserPosts = (userId?: string) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["user-posts", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("author_id", userId!)
        .order("created_at", { ascending: false })
        .limit(60);
      if (error) throw error;
      return hydratePosts(data || [], user?.id);
    },
  });
};

export const usePost = (postId?: string) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["post", postId],
    enabled: !!postId,
    queryFn: async () => {
      const { data, error } = await supabase.from("posts").select("*").eq("id", postId!).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const [hydrated] = await hydratePosts([data], user?.id);
      return hydrated;
    },
  });
};

export const useCreatePost = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      caption?: string;
      privacy: "public" | "followers" | "private";
      hashtags?: string[];
      media: { url: string; type: "image" | "video"; width?: number; height?: number }[];
    }) => {
      if (!user?.id) throw new Error("not authenticated");
      const mediaType: Post["media_type"] =
        input.media.length === 0 ? "none" :
        input.media.length > 1 ? "carousel" :
        input.media[0].type === "video" ? "video" : "image";
      const { data: post, error } = await supabase.from("posts").insert({
        author_id: user.id,
        caption: input.caption?.trim() || null,
        privacy: input.privacy,
        hashtags: input.hashtags || [],
        media_type: mediaType,
      }).select().single();
      if (error) throw error;
      if (input.media.length) {
        const rows = input.media.map((m, i) => ({
          post_id: post.id,
          url: m.url,
          type: m.type,
          position: i,
          width: m.width,
          height: m.height,
        }));
        const { error: mErr } = await supabase.from("post_media").insert(rows);
        if (mErr) throw mErr;
      }
      return post;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feed-posts"] });
      qc.invalidateQueries({ queryKey: ["user-posts"] });
      toast.success("تم نشر منشورك! ✨");
    },
    onError: (e: any) => toast.error(e?.message || "تعذّر نشر المنشور"),
  });
};

export const useTogglePostLike = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ postId, liked }: { postId: string; liked: boolean }) => {
      if (!user?.id) throw new Error("not authenticated");
      if (liked) {
        const { error } = await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("post_likes").insert({ post_id: postId, user_id: user.id });
        if (error) throw error;
      }
    },
    onMutate: async ({ postId, liked }) => {
      const updater = (p: Post) => p.id === postId ? { ...p, liked_by_me: !liked, likes_count: p.likes_count + (liked ? -1 : 1) } : p;
      qc.setQueriesData<any>({ queryKey: ["feed-posts"] }, (old: any) => old ? { ...old, pages: old.pages.map((pg: any) => ({ ...pg, items: pg.items.map(updater) })) } : old);
      qc.setQueriesData<Post[]>({ queryKey: ["user-posts"] }, (old) => old?.map(updater));
      qc.setQueryData<Post>(["post", postId], (old) => old ? updater(old) : old);
    },
    onError: () => {
      qc.invalidateQueries({ queryKey: ["feed-posts"] });
      qc.invalidateQueries({ queryKey: ["user-posts"] });
    },
  });
};

export const useTogglePostSave = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ postId, saved }: { postId: string; saved: boolean }) => {
      if (!user?.id) throw new Error("not authenticated");
      if (saved) {
        const { error } = await supabase.from("saved_posts").delete().eq("post_id", postId).eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("saved_posts").insert({ post_id: postId, user_id: user.id });
        if (error) throw error;
      }
    },
    onMutate: async ({ postId, saved }) => {
      const updater = (p: Post) => p.id === postId ? { ...p, saved_by_me: !saved, saves_count: p.saves_count + (saved ? -1 : 1) } : p;
      qc.setQueriesData<any>({ queryKey: ["feed-posts"] }, (old: any) => old ? { ...old, pages: old.pages.map((pg: any) => ({ ...pg, items: pg.items.map(updater) })) } : old);
      qc.setQueriesData<Post[]>({ queryKey: ["user-posts"] }, (old) => old?.map(updater));
      qc.setQueryData<Post>(["post", postId], (old) => old ? updater(old) : old);
    },
    onError: () => qc.invalidateQueries({ queryKey: ["feed-posts"] }),
  });
};

export const useDeletePost = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase.from("posts").delete().eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feed-posts"] });
      qc.invalidateQueries({ queryKey: ["user-posts"] });
      toast.success("تم حذف المنشور");
    },
  });
};

export const useUpdatePost = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ postId, caption, privacy }: { postId: string; caption?: string; privacy?: Post["privacy"] }) => {
      const { error } = await supabase.from("posts").update({
        ...(caption !== undefined ? { caption: caption.trim() || null } : {}),
        ...(privacy ? { privacy } : {}),
        is_edited: true,
      }).eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feed-posts"] });
      qc.invalidateQueries({ queryKey: ["user-posts"] });
      toast.success("تم التحديث");
    },
  });
};

export const useReportPost = () => {
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ postId, reason }: { postId: string; reason: string }) => {
      if (!user?.id) throw new Error("not authenticated");
      const { error } = await supabase.from("post_reports").insert({ post_id: postId, reporter_id: user.id, reason });
      if (error) throw error;
    },
    onSuccess: () => toast.success("تم إرسال البلاغ، شكراً"),
    onError: (e: any) => toast.error(e?.message || "تعذّر الإرسال"),
  });
};

// Comments
export interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  is_edited: boolean;
  author?: PostAuthor;
}

export const usePostComments = (postId?: string) => {
  return useQuery({
    queryKey: ["post-comments", postId],
    enabled: !!postId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("post_comments")
        .select("*")
        .eq("post_id", postId!)
        .order("created_at", { ascending: true })
        .limit(200);
      if (error) throw error;
      const userIds = Array.from(new Set((data || []).map((c: any) => c.user_id)));
      const { data: authors } = await supabase.from("profiles").select("id,username,full_name,avatar_url").in("id", userIds);
      const map = new Map((authors || []).map((a: any) => [a.id, a]));
      return (data || []).map((c: any) => ({ ...c, author: map.get(c.user_id) })) as PostComment[];
    },
  });
};

export const useAddComment = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ postId, content, parentId }: { postId: string; content: string; parentId?: string }) => {
      if (!user?.id) throw new Error("not authenticated");
      const { error } = await supabase.from("post_comments").insert({
        post_id: postId, user_id: user.id, parent_id: parentId || null, content: content.trim(),
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["post-comments", vars.postId] }),
  });
};

export const useDeleteComment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ commentId, postId: _ }: { commentId: string; postId: string }) => {
      const { error } = await supabase.from("post_comments").delete().eq("id", commentId);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["post-comments", vars.postId] }),
  });
};

export const useSavedPosts = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["saved-posts", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_posts")
        .select("post_id, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(60);
      if (error) throw error;
      const ids = (data || []).map((d: any) => d.post_id);
      if (!ids.length) return [];
      const { data: posts } = await supabase.from("posts").select("*").in("id", ids);
      return hydratePosts(posts || [], user?.id);
    },
  });
};
