import { useEffect, useState } from "react";
import { useFeedPosts } from "@/hooks/usePosts";
import EmptyState from "@/components/EmptyState";
import PostCard from "@/components/posts/PostCard";
import CreatePostDialog from "@/components/posts/CreatePostDialog";
import PostCommentsDialog from "@/components/posts/PostCommentsDialog";
import { Loader2, PenSquare, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

const FeedPage = () => {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useFeedPosts();
  const [commentsPost, setCommentsPost] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      if (!hasNextPage || isFetchingNextPage) return;
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 600) {
        fetchNextPage();
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const posts = data?.pages.flatMap(p => p.items) || [];

  return (
    <div className="min-h-screen pb-24 pt-4 px-3 max-w-xl mx-auto" dir="rtl">
      <header className="flex items-center justify-between mb-4 px-1">
        <h1 className="text-2xl font-black gradient-text-primary font-cairo">الرئيسية</h1>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-2xl gradient-primary text-primary-foreground font-cairo font-bold text-sm shadow-lg"
        >
          <PenSquare size={16} /> منشور
        </motion.button>
      </header>


      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" size={28} /></div>
      ) : posts.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="لسه ماحدش نشر حاجة"
          description="ابدأ أنت! انشر أول منشور وشارك لحظتك."
          action={
            <button onClick={() => setCreateOpen(true)} className="btn-primary font-cairo flex items-center gap-2">
              <PenSquare size={16} /> أنشئ منشور
            </button>
          }
        />
      ) : (
        <>
          {posts.map((p) => (
            <PostCard key={p.id} post={p} onComments={() => setCommentsPost(p.id)} />
          ))}
          {isFetchingNextPage && (
            <div className="flex justify-center py-6"><Loader2 className="animate-spin text-primary" /></div>
          )}
          {!hasNextPage && posts.length > 3 && (
            <p className="text-center text-xs text-muted-foreground py-6 font-cairo">وصلت للنهاية ✨</p>
          )}
        </>
      )}

      <CreatePostDialog open={createOpen} onOpenChange={setCreateOpen} />
      {commentsPost && (
        <PostCommentsDialog postId={commentsPost} open={!!commentsPost} onOpenChange={(open) => !open && setCommentsPost(null)} />
      )}
    </div>
  );
};

export default FeedPage;
