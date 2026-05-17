import { useMemo } from "react";
import { Loader2, Star, Users } from "lucide-react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useFollows } from "@/hooks/useFollows";
import { useCloseFriends, useToggleCloseFriend } from "@/hooks/useStories";

type CloseFriendsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type FriendProfile = {
  id: string;
  username?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
};

const CloseFriendsDialog = ({ open, onOpenChange }: CloseFriendsDialogProps) => {
  const { followers, following } = useFollows();
  const { data: closeFriends = [], isLoading } = useCloseFriends();
  const toggleCloseFriend = useToggleCloseFriend();

  const closeFriendIds = useMemo(
    () => new Set(closeFriends.map((item) => item.friend_id)),
    [closeFriends],
  );

  const candidates = useMemo(() => {
    const profiles = new Map<string, FriendProfile>();

    followers
      .filter((follow: any) => follow.status === "accepted" && follow.follower?.id)
      .forEach((follow: any) => profiles.set(follow.follower.id, follow.follower));

    following
      .filter((follow: any) => follow.following?.id)
      .forEach((follow: any) => profiles.set(follow.following.id, follow.following));

    return Array.from(profiles.values()).sort((a, b) =>
      (a.full_name || a.username || "").localeCompare(b.full_name || b.username || "", "ar"),
    );
  }, [followers, following]);

  const handleToggle = (friendId: string) => {
    toggleCloseFriend.mutate({ friendId, included: closeFriendIds.has(friendId) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl border-border/30 bg-background/95 p-0 text-right shadow-2xl backdrop-blur-xl" dir="rtl">
        <DialogHeader className="border-b border-border/20 px-5 pb-4 pt-5 text-right">
          <DialogTitle className="flex items-center justify-start gap-2 font-cairo text-lg font-bold">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Star size={18} />
            </span>
            الأصدقاء المقرّبون
          </DialogTitle>
          <DialogDescription className="font-cairo text-xs leading-6 text-muted-foreground">
            اختار مين يقدر يشوف القصص الخاصة بالأصدقاء المقرّبين.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto px-3 py-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="animate-spin text-primary" size={24} />
            </div>
          ) : candidates.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Users size={24} />
              </div>
              <p className="font-cairo text-sm font-semibold text-foreground">مفيش أصدقاء متاحين</p>
              <p className="max-w-[240px] font-cairo text-xs leading-6 text-muted-foreground">
                لما يبقى عندك متابعين أو ناس بتتابعهم هيظهروا هنا.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {candidates.map((person) => {
                const included = closeFriendIds.has(person.id);
                return (
                  <motion.button
                    key={person.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleToggle(person.id)}
                    disabled={toggleCloseFriend.isPending}
                    className="flex w-full items-center gap-3 rounded-2xl p-3 transition-colors hover:bg-secondary/40 disabled:opacity-60"
                  >
                    <div className="relative flex-shrink-0">
                      {person.avatar_url ? (
                        <img src={person.avatar_url} alt="" className="h-11 w-11 rounded-full object-cover" />
                      ) : (
                        <div className="gradient-primary flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold text-primary-foreground">
                          {(person.username || person.full_name || "؟").charAt(0).toUpperCase()}
                        </div>
                      )}
                      {included && (
                        <span className="absolute -bottom-1 -left-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-background">
                          <Star size={11} fill="currentColor" />
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1 text-right">
                      <p className="truncate font-cairo text-sm font-bold text-foreground">
                        {person.full_name || person.username || "مستخدم"}
                      </p>
                      {person.username && <p className="truncate text-xs text-muted-foreground">@{person.username}</p>}
                    </div>

                    <span
                      className={`rounded-full px-3 py-1.5 font-cairo text-[11px] font-bold transition-colors ${
                        included ? "bg-primary text-primary-foreground" : "bg-secondary/70 text-muted-foreground"
                      }`}
                    >
                      {included ? "مضاف" : "إضافة"}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CloseFriendsDialog;
