import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import {
  Loader2, MessageCircle, Users, UserPlus, Search, Ban, Trash2,
  CheckCheck, Clock, Sparkles, ChevronRight, Bell, BellOff,
  Pin, X, Check, TrendingUp, Activity, Zap, Heart
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useChats } from "@/hooks/useChats";
import { useAuth } from "@/hooks/useAuth";
import UserAvatar from "@/components/UserAvatar";
import { useFollows } from "@/hooks/useFollows";
import { useBlockedUsers } from "@/hooks/useBlockedUsers";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { toast } from "sonner";
import TopBar from "@/components/TopBar";
import EmptyState from "@/components/EmptyState";
import { useState, useMemo, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNicknames } from "@/hooks/useNicknames";

/* ── Swipeable chat row ── */
const SwipeableChatRow = ({
  chat, other, displayName,
  onOpen, onDelete, onPin, onMute,
  pinnedIds, mutedIds, unreadCount,
}: any) => {
  const x = useMotionValue(0);
  const leftOpacity = useTransform(x, [-80, -40], [1, 0]);
  const rightOpacity = useTransform(x, [40, 80], [0, 1]);
  const isPinned = pinnedIds.has(chat.id);
  const isMuted = mutedIds.has(chat.id);
  const hasUnread = unreadCount > 0;

  return (
    <div className="relative overflow-hidden rounded-2xl group/row">
      {/* Swipe actions background indicators */}
      <motion.div style={{ opacity: leftOpacity }}
        className="absolute inset-y-0 left-0 flex items-center pl-4 bg-destructive/15 rounded-2xl pointer-events-none">
        <Trash2 size={18} className="text-destructive animate-pulse" />
      </motion.div>
      <motion.div style={{ opacity: rightOpacity }}
        className="absolute inset-y-0 right-0 flex items-center pr-4 bg-amber-500/15 rounded-2xl pointer-events-none">
        <Pin size={18} className="text-amber-500 animate-bounce" />
      </motion.div>

      <motion.div
        drag="x" dragConstraints={{ left: -80, right: 80 }} dragElastic={0.15}
        onDragEnd={(_: any, info: any) => {
          if (info.offset.x < -60) onDelete(chat.id);
          else if (info.offset.x > 60) onPin(chat.id);
        }}
        style={{ x }}
        className={`relative ultra-glass-card p-4.5 flex items-center gap-3.5 transition-all duration-300 cursor-pointer select-none
          ${isPinned ? "border-l-4 border-l-amber-500 bg-amber-500/[0.04] shadow-[inset_0_1px_1px_rgba(251,191,36,0.1)]" : ""} 
          ${hasUnread ? "border-r-4 border-r-rose-500 bg-rose-500/[0.02]" : ""} 
          hover:scale-[1.01] hover:border-primary/30`}
      >
        {isPinned && (
          <div className="absolute top-2.5 left-2.5">
            <Pin size={11} className="text-amber-500 rotate-45 animate-bounce" />
          </div>
        )}

        {/* Quick action buttons on the left */}
        <div className="flex flex-col gap-1.5 opacity-40 group-hover/row:opacity-100 transition-opacity duration-300">
          <motion.button whileTap={{ scale: 0.8 }}
            onClick={(e) => { e.stopPropagation(); onDelete(chat.id); }}
            className="p-1.5 rounded-xl hover:bg-destructive/15 text-muted-foreground hover:text-destructive transition-all">
            <Trash2 size={13} />
          </motion.button>
          <motion.button whileTap={{ scale: 0.8 }}
            onClick={(e) => { e.stopPropagation(); onMute(chat.id); }}
            className="p-1.5 rounded-xl hover:bg-secondary text-muted-foreground transition-all">
            {isMuted ? <BellOff size={12} className="text-primary" /> : <Bell size={12} />}
          </motion.button>
          <motion.button whileTap={{ scale: 0.8 }}
            onClick={(e) => { e.stopPropagation(); onPin(chat.id); }}
            className="p-1.5 rounded-xl hover:bg-amber-500/10 text-muted-foreground hover:text-amber-500 transition-all">
            <Pin size={12} />
          </motion.button>
        </div>

        {/* Clickable body */}
        <button onClick={() => onOpen(chat.id)} className="flex-1 flex items-center gap-3.5 min-w-0">
          <div className="flex-1 text-right min-w-0">
            <div className="flex items-center justify-end gap-2">
              {isMuted && <BellOff size={11} className="text-muted-foreground/45" />}
              <p className={`font-cairo text-sm truncate tracking-wide ${hasUnread ? "font-bold text-foreground" : "font-semibold text-foreground/90"}`}>
                {displayName}
              </p>
            </div>
            {chat.last_message_content && (
              <p className={`text-[11px] line-clamp-1 font-cairo mt-1 ${hasUnread ? "text-foreground/80 font-bold" : "text-muted-foreground/80"}`}>
                {chat.last_message_content}
              </p>
            )}
            <p className="text-[9px] text-muted-foreground/45 mt-1 font-cairo flex items-center justify-end gap-1">
              <Clock size={9} />
              {chat.last_message_at
                ? formatDistanceToNow(new Date(chat.last_message_at), { addSuffix: true, locale: ar })
                : "محادثة جديدة"}
            </p>
          </div>

          {/* Avatar & Unread Count Badge */}
          <div className="relative flex-shrink-0">
            <UserAvatar
              url={other?.avatar_url}
              name={displayName}
              size="md"
              isOnline={other?.is_online || false}
              className={`ring-2 transition-all duration-300 ${hasUnread ? "ring-rose-500 shadow-[0_0_12px_rgba(239,68,68,0.3)]" : "ring-border/15"}`}
            />

            {/* Glowing Unread Badge */}
            {hasUnread && (
              <motion.div
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                className="absolute -top-1.5 -left-1.5 min-w-[20px] h-[20px] rounded-full bg-rose-500 flex items-center justify-center px-1.5 shadow-[0_0_10px_rgba(239,68,68,0.75)] border-2 border-background"
              >
                <span className="text-[9px] font-extrabold text-white leading-none">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              </motion.div>
            )}
          </div>
        </button>
      </motion.div>
    </div>
  );
};


/* ── Friend card ── */
const FriendCard = ({ person, onChat, onProfile, onBlock, delay }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
    className="ultra-glass-card p-3.5 flex items-center gap-3.5 group hover:border-primary/30 transition-all duration-300"
  >
    <div className="relative cursor-pointer flex-shrink-0" onClick={() => onProfile(person.username)}>
      <UserAvatar
        url={person.avatar_url}
        name={person.full_name || person.username}
        size="md"
        isOnline={person.is_online}
        className="ring-2 ring-border/10 group-hover:ring-primary/40 transition-all duration-300"
      />
    </div>
    
    <div className="flex-1 text-right min-w-0">
      <p className="font-cairo font-bold text-sm text-foreground truncate">{person.full_name || person.username}</p>
      <p className="text-[10px] text-muted-foreground/80 font-cairo">@{person.username}</p>
    </div>
    
    <div className="flex gap-2">
      <motion.button whileTap={{ scale: 0.85 }} onClick={() => onChat(person.id)}
        className="p-2.5 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all duration-300">
        <MessageCircle size={15} />
      </motion.button>
      <motion.button whileTap={{ scale: 0.85 }} onClick={() => onProfile(person.username)}
        className="p-2.5 rounded-xl bg-accent/10 text-accent hover:bg-accent hover:text-accent-foreground transition-all duration-300">
        <ChevronRight size={15} />
      </motion.button>
      <motion.button whileTap={{ scale: 0.85 }} onClick={() => onBlock(person.id)}
        className="p-2.5 rounded-xl bg-destructive/10 text-destructive/70 hover:bg-destructive hover:text-white transition-all duration-300">
        <Ban size={14} />
      </motion.button>
    </div>
  </motion.div>
);

/* ── Request card ── */
const RequestCard = ({ req, onAccept, onReject, onProfile, delay }: any) => {
  const [done, setDone] = useState<null | "accepted" | "rejected">(null);
  if (done) return null;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, x: done === "accepted" ? 100 : -100, scale: 0.9 }}
      transition={{ delay }}
      className="ultra-glass-card p-4 relative overflow-hidden animate-pulse-breathe border border-primary/20"
      style={{ "--glow-color": "hsl(var(--primary) / 0.15)" } as any}
    >
      <div className="absolute inset-0 bg-gradient-to-l from-primary/[0.04] to-transparent pointer-events-none" />
      <div className="flex items-center gap-3.5">
        <div className="relative cursor-pointer" onClick={() => onProfile(req.follower?.username)}>
          <UserAvatar
            url={req.follower?.avatar_url}
            name={req.follower?.full_name || req.follower?.username}
            size="md"
            className="w-13 h-13 rounded-2xl border border-border/10"
          />
          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow-lg border border-background">
            <UserPlus size={10} className="text-primary-foreground" />
          </div>
        </div>
        
        <div className="flex-1 text-right min-w-0">
          <p className="font-cairo font-bold text-sm text-foreground truncate">{req.follower?.full_name || req.follower?.username}</p>
          <p className="text-[10px] text-muted-foreground/85 font-cairo">@{req.follower?.username}</p>
          <p className="text-[10px] text-primary font-bold font-cairo mt-1 flex items-center justify-end gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
            يريد متابعتك ✨
          </p>
        </div>
        
        <div className="flex flex-col gap-2">
          <motion.button whileTap={{ scale: 0.9 }}
            onClick={() => { setDone("accepted"); onAccept(req.id); }}
            className="flex items-center gap-1.5 gradient-primary text-primary-foreground text-[11px] px-4 py-2.5 rounded-xl font-cairo font-bold shadow-[0_4px_15px_hsl(var(--primary)/0.35)] hover:brightness-110 transition-all">
            <Check size={13} /> قبول
          </motion.button>
          <motion.button whileTap={{ scale: 0.9 }}
            onClick={() => { setDone("rejected"); onReject(req.id); }}
            className="flex items-center gap-1.5 bg-destructive/10 text-destructive hover:bg-destructive hover:text-white text-[11px] px-4 py-2.5 rounded-xl font-cairo font-semibold transition-all duration-300">
            <X size={13} /> رفض
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

/* ─────────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────────── */
const ChatsPage = () => {
  const navigate = useNavigate();
 const {
  chats = [],
  isLoading,
  createChat,
  deleteChat
} = useChats();
  const { user } = useAuth();
  const { followers, following, pendingRequests, acceptFollow, rejectFollow, unfollow } = useFollows();
  const { isBlocked, blockUser } = useBlockedUsers();
  const { totalUnread, unreadPerChat, clearChatUnread } = useUnreadMessages();
  const [activeTab, setActiveTab] = useState<"chats" | "friends" | "requests">("chats");
  const [searchQuery, setSearchQuery] = useState("");
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  const [mutedIds, setMutedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<"all" | "online" | "unread">("all");
  const qc = useQueryClient();
  const { nicknames } = useNicknames();

  const block = useMutation({
    mutationFn: async (blockedId: string) => {
      if (!user?.id) throw new Error("Not auth");
      await blockUser.mutateAsync(blockedId);
      await supabase.from("follows").delete().eq("follower_id", blockedId).eq("following_id", user.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["followers"] });
      toast.success("تم الحظر ✅");
    },
  });

  const getOtherUser = (chat: any) => chat.user1_id === user?.id ? chat.user2 : chat.user1;
  const getOtherUserId = (chat: any) => chat.user1_id === user?.id ? chat.user2_id : chat.user1_id;

  const acceptedFollowersList = useMemo(() =>
    followers.filter((f: any) => f.status === "accepted").map((f: any) => ({ ...f.follower, followId: f.id })),
    [followers]
  );
  const followingList = useMemo(() =>
    following.map((f: any) => ({ ...f.following, followId: f.id, status: f.status })),
    [following]
  );

  const handleOpenChat = async (otherUserId: string) => {
    try {
      const chatId = await createChat.mutateAsync(otherUserId);
      clearChatUnread(chatId);
      navigate(`/chat/${chatId}`);
    } catch {
      toast.error("مقدرش أفتح الشات");
    }
  };

  const handleNavigateToChat = (chatId: string) => {
    clearChatUnread(chatId);
    navigate(`/chat/${chatId}`);
  };

  const togglePin = useCallback((chatId: string) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(chatId)) { next.delete(chatId); toast("تم إلغاء التثبيت"); }
      else { next.add(chatId); toast.success("تم تثبيت المحادثة 📌"); }
      return next;
    });
  }, []);

  const toggleMute = useCallback((chatId: string) => {
    setMutedIds((prev) => {
      const next = new Set(prev);
      if (next.has(chatId)) { next.delete(chatId); toast("تم تفعيل الإشعارات 🔔"); }
      else { next.add(chatId); toast("تم كتم الإشعارات 🔕"); }
      return next;
    });
  }, []);

  const filteredChats = useMemo(() => {
    const list = chats.filter((chat: any) => {
      const otherId = getOtherUserId(chat);
      if (isBlocked(otherId)) return false;
      if (searchQuery) {
        const other = getOtherUser(chat);
        if (!other?.full_name?.includes(searchQuery) && !other?.username?.includes(searchQuery)) return false;
      }
      if (filter === "online") return getOtherUser(chat)?.is_online;
      if (filter === "unread") return (unreadPerChat.get(chat.id) || 0) > 0;
      return true;
    });
    list.sort((a: any, b: any) => {
      if (pinnedIds.has(a.id) && !pinnedIds.has(b.id)) return -1;
      if (!pinnedIds.has(a.id) && pinnedIds.has(b.id)) return 1;
      return 0;
    });
    return list;
  }, [chats, searchQuery, filter, pinnedIds, isBlocked, unreadPerChat]);

  const onlineCount = useMemo(() =>
    chats.filter((c: any) => getOtherUser(c)?.is_online && !isBlocked(getOtherUserId(c))).length,
    [chats, isBlocked]
  );

  const tabs = [
    { id: "chats" as const, label: "المحادثات", icon: MessageCircle, count: filteredChats.length },
    { id: "friends" as const, label: "الأصدقاء", icon: Users, count: acceptedFollowersList.length },
    { id: "requests" as const, label: "الطلبات", icon: UserPlus, count: pendingRequests.length },
  ];

  return (
    <div className="min-h-screen pb-28 bg-background">
      <TopBar />
      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">

        {/* Tabs */}
        <div className="flex gap-1.5 p-1 bg-secondary/30 rounded-2xl relative">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <motion.button
                key={tab.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-cairo font-bold transition-all relative z-10 ${
                  isActive
                    ? "text-primary-foreground font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="chats-active-tab"
                    className="absolute inset-0 gradient-primary rounded-xl shadow-[0_4px_20px_hsl(var(--primary)/0.35)]"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <tab.icon size={13} className="relative z-10" />
                <span className="relative z-10">{tab.label}</span>
                {tab.count > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={`min-w-[18px] h-[18px] px-1 rounded-full text-[9px] font-extrabold flex items-center justify-center relative z-10 ${
                      isActive ? "bg-white/25 text-white" : "bg-primary text-primary-foreground"
                    }`}
                  >
                    {tab.count}
                  </motion.span>
                )}
                {/* Unread dot on chats tab when not active */}
                {tab.id === "chats" && totalUnread > 0 && !isActive && (
                  <motion.span
                    animate={{ scale: [1, 1.4, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(239,68,68,0.8)] z-10"
                  />
                )}
                {/* Pending requests dot */}
                {tab.id === "requests" && pendingRequests.length > 0 && !isActive && (
                  <motion.span
                    animate={{ scale: [1, 1.4, 1] }}
                    transition={{ repeat: Infinity, duration: 1.8 }}
                    className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 z-10"
                  />
                )}
              </motion.button>
            );
          })}
        </div>

     <AnimatePresence mode="wait">
  {/* CHATS TAB */}
  {activeTab === "chats" && (
    <motion.div
      key="chats"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="space-y-3"
    >

      <div className="flex gap-2.5 items-center">
        <div className="relative flex-1 group">
          <Search size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث في محادثاتك..."
            className="input-premium w-full pr-10 pl-9"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={13} />
            </button>
          )}
        </div>
        <div className="flex gap-1.5 p-1 bg-secondary/20 rounded-xl border border-border/10">
          {(["all", "online", "unread"] as const).map((f) => {
            const isActive = filter === f;
            return (
              <motion.button
                key={f}
                whileTap={{ scale: 0.92 }}
                onClick={() => setFilter(f)}
                className={`px-3 py-2 rounded-lg text-[10px] font-cairo font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
                  isActive
                    ? "gradient-primary text-primary-foreground shadow-[0_4px_12px_hsl(var(--primary)/0.25)]"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                }`}
              >
                {f === "all" ? "الكل" : f === "online" ? "🟢 متصل" : `🔴 غير مقروء`}
                {f === "unread" && totalUnread > 0 && (
                  <span className={`inline-block px-1 rounded bg-rose-600 text-white font-extrabold text-[8px]`}>
                    {totalUnread}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

              {isLoading ? (
                <div className="flex flex-col items-center py-16 gap-3">
                  <Loader2 size={28} className="animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground font-cairo">جاري التحميل...</p>
                </div>
              ) : filteredChats.length > 0 ? (
                <div className="space-y-2">
                  {pinnedIds.size > 0 && filteredChats.some((c: any) => pinnedIds.has(c.id)) && (
                    <p className="text-[10px] text-muted-foreground/60 font-cairo text-right flex items-center justify-end gap-1">
                      <Pin size={9} className="rotate-45" /> مثبتة
                    </p>
                  )}
                  {filteredChats.map((chat: any) => {
                    const other = getOtherUser(chat);
                    const otherId = getOtherUserId(chat);
                    const displayName = (otherId && nicknames[otherId]) || other?.full_name || other?.username;
                    return (
                      <SwipeableChatRow
                        key={chat.id} chat={chat} other={other} otherId={otherId}
                        displayName={displayName} unreadCount={unreadPerChat.get(chat.id) || 0}
                        onOpen={handleNavigateToChat}
                        onDelete={(id: string) => { deleteChat.mutate(id); toast.success("تم حذف المحادثة 🗑️"); }}
                        onPin={togglePin} onMute={toggleMute}
                        pinnedIds={pinnedIds} mutedIds={mutedIds}
                      />
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  icon={MessageCircle}
                  title="مفيش محادثات لسه"
                  description="تابع حد وهو يتابعك عشان تفتحو شات 💬"
                />
              )}
            </motion.div>
          )}

          {/* FRIENDS TAB */}
          {activeTab === "friends" && (
            <motion.div key="friends" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-5">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground/60 font-cairo">{acceptedFollowersList.length} شخص</span>
                  <h3 className="font-cairo font-bold text-sm text-foreground flex items-center gap-1.5">
                    <Heart size={12} className="text-rose-400" /> المتابعون
                  </h3>
                </div>
                {acceptedFollowersList.length > 0 ? acceptedFollowersList.map((person: any, i: number) => (
                  <FriendCard key={person.id} person={person} delay={i * 0.04}
                    onChat={handleOpenChat} onProfile={(u: string) => navigate(`/${u}`)}
                    onBlock={(id: string) => block.mutate(id)} />
                )) : <p className="text-center py-8 text-sm text-muted-foreground font-cairo">مفيش متابعين لسه 👥</p>}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground/60 font-cairo">{followingList.length} شخص</span>
                  <h3 className="font-cairo font-bold text-sm text-foreground flex items-center gap-1.5">
                    <TrendingUp size={12} className="text-primary" /> بتتابع
                  </h3>
                </div>
                {followingList.length > 0 ? followingList.map((person: any, i: number) => (
                  <motion.div key={person.id}
                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                    className="glass-card p-3 flex items-center gap-3 hover:border-primary/20 transition-all group"
                  >
                    <div className="relative cursor-pointer flex-shrink-0" onClick={() => navigate(`/${person.username}`)}>
                      <UserAvatar
                        url={person.avatar_url}
                        name={person.full_name || person.username}
                        size="md"
                        className="ring-2 ring-border/20 group-hover:ring-primary/30 transition-all"
                      />
                    </div>
                    <div className="flex-1 text-right min-w-0">
                      <p className="font-cairo font-bold text-sm text-foreground truncate">{person.full_name || person.username}</p>
                      <p className={`text-[11px] font-cairo flex items-center justify-end gap-1 ${person.status === "accepted" ? "text-emerald-400" : "text-amber-400"}`}>
                        {person.status === "accepted" ? <><Check size={10} /> مقبول</> : <><Clock size={10} /> في الانتظار</>}
                      </p>
                    </div>
                    <div className="flex gap-1.5">
                      <motion.button whileTap={{ scale: 0.88 }} onClick={() => handleOpenChat(person.id)}
                        className="p-2 rounded-xl bg-primary/15 text-primary hover:bg-primary/25 transition-all">
                        <MessageCircle size={15} />
                      </motion.button>
                      <motion.button whileTap={{ scale: 0.88 }} onClick={() => unfollow.mutate(person.id)}
                        className="p-2 rounded-xl bg-destructive/10 text-destructive/60 hover:bg-destructive/20 hover:text-destructive transition-all">
                        <X size={14} />
                      </motion.button>
                    </div>
                  </motion.div>
                )) : <p className="text-center py-8 text-sm text-muted-foreground font-cairo">مش بتتابع حد 🌐</p>}
              </div>
            </motion.div>
          )}

          {/* REQUESTS TAB */}
          {activeTab === "requests" && (
            <motion.div key="requests" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-3">
              {pendingRequests.length > 0 ? (
                <>
                  <div className="flex justify-between items-center">
                    <motion.button whileTap={{ scale: 0.95 }}
                      onClick={() => { pendingRequests.forEach((req: any) => acceptFollow.mutate(req.id)); toast.success(`تم قبول ${pendingRequests.length} طلبات 🎉`); }}
                      className="text-[11px] gradient-primary text-primary-foreground px-4 py-2 rounded-xl font-cairo font-bold shadow-[0_2px_10px_hsl(var(--primary)/0.3)] flex items-center gap-1.5">
                      <CheckCheck size={13} /> قبول الكل
                    </motion.button>
                    <p className="text-[11px] text-muted-foreground font-cairo">{pendingRequests.length} طلب جديد</p>
                  </div>
                  <AnimatePresence>
                    {pendingRequests.map((req: any, i: number) => (
                      <RequestCard key={req.id} req={req} delay={i * 0.05}
                        onAccept={(id: string) => acceptFollow.mutate(id, { onSuccess: () => toast.success("تم القبول 🎉") })}
                        onReject={(id: string) => rejectFollow.mutate(id, { onSuccess: () => toast.success("تم رفض الطلب") })}
                        onProfile={(u: string) => navigate(`/${u}`)} />
                    ))}
                  </AnimatePresence>
                </>
              ) : (
                <EmptyState
                  icon={UserPlus}
                  title="مفيش طلبات"
                  description="لما حد يبعتلك طلب متابعة هيظهر هنا ✨"
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ChatsPage;
