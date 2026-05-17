import { Bookmark, Heart, MessageCircle, MoreHorizontal, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import type { Post } from "@/hooks/usePosts";
import { useDeletePost, useTogglePostLike, useTogglePostSave } from "@/hooks/usePosts";
import { useAuth } from "@/hooks/useAuth";

type PostCardProps = {
  post: Post;
  onComments: () => void;
};

const PostCard = ({ post, onComments }: PostCardProps) => {
  const { user } = useAuth();
  const likePost = useTogglePostLike();
  const savePost = useTogglePostSave();
  const deletePost = useDeletePost();
  const author = post.author;
  const media = post.media || [];

  const displayName = author?.full_name || author?.username || "مستخدم";
  const firstLetter = (author?.username || author?.full_name || "؟").charAt(0).toUpperCase();

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4 overflow-hidden rounded-3xl border border-border/25 bg-card/70 shadow-sm backdrop-blur"
    >
      <div className="flex items-center gap-3 p-4">
        {author?.avatar_url ? (
          <img src={author.avatar_url} alt="" className="h-11 w-11 rounded-full object-cover" />
        ) : (
          <div className="gradient-primary flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold text-primary-foreground">
            {firstLetter}
          </div>
        )}

        <div className="min-w-0 flex-1 text-right">
          <p className="truncate font-cairo text-sm font-bold text-foreground">{displayName}</p>
          <p className="truncate text-[11px] text-muted-foreground">
            {post.created_at ? formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ar }) : "الآن"}
          </p>
        </div>

        {post.author_id === user?.id ? (
          <button
            onClick={() => deletePost.mutate(post.id)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            aria-label="حذف المنشور"
          >
            <Trash2 size={17} />
          </button>
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground">
            <MoreHorizontal size={18} />
          </div>
        )}
      </div>

      {post.caption && (
        <p className="whitespace-pre-wrap px-4 pb-3 text-right font-cairo text-sm leading-7 text-foreground">
          {post.caption}
        </p>
      )}

      {media.length > 0 && (
        <div className={media.length === 1 ? "" : "grid grid-cols-2 gap-1 px-1"}>
          {media.slice(0, 4).map((item, index) => (
            <div key={item.id} className="relative overflow-hidden bg-secondary/40">
              {item.type === "video" ? (
                <video src={item.url} controls className="max-h-[520px] w-full bg-black object-contain" />
              ) : (
                <img
                  src={item.url}
                  alt="صورة منشور"
                  loading="lazy"
                  className={`${media.length === 1 ? "max-h-[520px]" : "h-52"} w-full object-cover`}
                />
              )}
              {index === 3 && media.length > 4 && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/60 text-xl font-bold text-foreground">
                  +{media.length - 4}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between border-t border-border/20 px-3 py-2">
        <button
          onClick={() => savePost.mutate({ postId: post.id, saved: !!post.saved_by_me })}
          className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-cairo font-bold transition-colors ${
            post.saved_by_me ? "text-primary" : "text-muted-foreground hover:bg-secondary/50"
          }`}
        >
          <Bookmark size={17} fill={post.saved_by_me ? "currentColor" : "none"} />
          {post.saves_count || 0}
        </button>

        <div className="flex items-center gap-1">
          <button
            onClick={onComments}
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-cairo font-bold text-muted-foreground transition-colors hover:bg-secondary/50"
          >
            <MessageCircle size={17} />
            {post.comments_count || 0}
          </button>
          <button
            onClick={() => likePost.mutate({ postId: post.id, liked: !!post.liked_by_me })}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-cairo font-bold transition-colors ${
              post.liked_by_me ? "text-destructive" : "text-muted-foreground hover:bg-secondary/50"
            }`}
          >
            <Heart size={17} fill={post.liked_by_me ? "currentColor" : "none"} />
            {post.likes_count || 0}
          </button>
        </div>
      </div>
    </motion.article>
  );
};

export default PostCard;
