import { useState } from "react";
import { Loader2, Send, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAddComment, useDeleteComment, usePostComments } from "@/hooks/usePosts";
import { useAuth } from "@/hooks/useAuth";

type PostCommentsDialogProps = {
  postId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const PostCommentsDialog = ({ postId, open, onOpenChange }: PostCommentsDialogProps) => {
  const { user } = useAuth();
  const { data: comments = [], isLoading } = usePostComments(postId);
  const addComment = useAddComment();
  const deleteComment = useDeleteComment();
  const [content, setContent] = useState("");

  const handleSend = async () => {
    if (!content.trim()) return;
    await addComment.mutateAsync({ postId, content });
    setContent("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl border-border/30 bg-background/95 p-0 text-right shadow-2xl backdrop-blur-xl" dir="rtl">
        <DialogHeader className="border-b border-border/20 px-5 pb-4 pt-5 text-right">
          <DialogTitle className="font-cairo text-lg font-bold">التعليقات</DialogTitle>
          <DialogDescription className="font-cairo text-xs text-muted-foreground">
            اقرأ التعليقات أو اكتب تعليق جديد.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[52vh] overflow-y-auto px-4 py-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="animate-spin text-primary" size={24} />
            </div>
          ) : comments.length === 0 ? (
            <p className="py-10 text-center font-cairo text-sm text-muted-foreground">لسه مفيش تعليقات</p>
          ) : (
            <div className="space-y-3">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3 rounded-2xl bg-secondary/25 p-3">
                  {comment.author?.avatar_url ? (
                    <img src={comment.author.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                  ) : (
                    <div className="gradient-primary flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-primary-foreground">
                      {(comment.author?.username || "؟").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1 text-right">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-cairo text-xs font-bold text-foreground">
                        {comment.author?.full_name || comment.author?.username || "مستخدم"}
                      </p>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ar })}
                      </span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap font-cairo text-sm leading-6 text-foreground">{comment.content}</p>
                  </div>
                  {comment.user_id === user?.id && (
                    <button
                      onClick={() => deleteComment.mutate({ commentId: comment.id, postId })}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label="حذف التعليق"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-border/20 p-3">
          <button
            onClick={handleSend}
            disabled={!content.trim() || addComment.isPending}
            className="gradient-primary flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl text-primary-foreground disabled:opacity-50"
          >
            {addComment.isPending ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
          </button>
          <input
            value={content}
            onChange={(event) => setContent(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && handleSend()}
            placeholder="اكتب تعليق..."
            maxLength={300}
            className="min-w-0 flex-1 rounded-2xl border border-border/25 bg-secondary/30 px-4 py-3 font-cairo text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PostCommentsDialog;
