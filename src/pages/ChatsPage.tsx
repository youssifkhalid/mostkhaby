import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import {
  Loader2, MessageCircle, Users, UserPlus, Search, Ban, Trash2,
  CheckCheck, Clock, Sparkles, ChevronRight, Bell, BellOff,
  Pin, X, Check, TrendingUp, Activity, Zap, Heart
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useChats } from "@/hooks/useChats";
import { useAuth } from "@/hooks/useAuth";
import OnlineIndicator from "@/components/OnlineIndicator";
import { useFollows } from "@/hooks/useFollows";
import { useBlockedUsers } from "@/hooks/useBlockedUsers";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { toast } from "sonner";
import TopBar from "@/components/TopBar";
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
    <div className="relative overflow-hidden rounded-2xl">
      <motion.div style={{ opacity: leftOpacity }}
        className="absolute inset-y-0 left-0 flex items-center pl-4 bg-destructive/20 rounded-2xl pointer-events-none">
        <Trash2 size={20} className="text-destructive" />
      </motion.div>
      <motion.div style={{ opacity: rightOpacity }}
        className="absolute inset-y-0 right-0 flex items-center pr-4 bg-amber-500/20 rounded-2xl pointer-events-none">
        <Pin size={20} className="text-amber-500" />
      </motion.div>

      <motion.div
        drag="x" dragConstraints={{ left: -80, right: 80 }} dragElastic={0.1}
        onDragEnd={(_: any, info: any) => {
          if (info.offset.x < -60) onDelete(chat.id);
          else if (info.offset.x > 60) onPin(chat.id);
        }}
        style={{ x }}
        className={`relative glass-card p-4 flex items-center gap-3 transition-all cursor-pointer select-none
          ${isPinned ? "border border-amber-500/30 bg-amber-500/5" : hasUnread ? "border border-rose-500/30 bg-rose-500/3" : "hover:border-primary/20"}`}
      >
        {isPinned && (
          <div className="absolute top-2 left-2">
            <Pin size={10} className="text-amber-500 rotate-45" />
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col gap-1">
          <motion.button whileTap={{ scale: 0.85 }}
            onClick={(e) => { e.stopPropagation(); onDelete(chat.id); }}
            className="p-1.5 rounded-xl hover:bg-destructive/15 text-muted-foreground hover:text-destructive transition-all">
            <Trash2 size={14} />
          </motion.button>
          <motion.button whileTap={{ scale: 0.85 }}
            onClick={(e) => { e.stopPropagation(); onMute(chat.id); }}
            className="p-1.5 rounded-xl hover:bg-secondary text-muted-foreground transition-all">
            {isMuted ? <BellOff size={13} className="text-primary" /> : <Bell size={13} />}
          </motion.button>
          <motion.button whileTap={{ scale: 0.85 }}
            onClick={(e) => { e.stopPropagation(); onPin(chat.id); }}
            className="p-1.5 rounded-xl hover:bg-amber-500/10 text-muted-foreground hover:text-amber-500 transition-all">
            <Pin size={13} />
          </motion.button>
        </div>

        {/* Main content */}
        <button onClick={() => onOpen(chat.id)} className="flex-1 flex items-center gap-3 min-w-0">
          <div className="flex-1 text-right min-w-0">
            <div className="flex items-center justify-end gap-2">
              {isMuted && <BellOff size={11} className="text-muted-foreground/50" />}
              <p className={`font-cairo text-sm truncate ${hasUnread ? "font-extrabold text-foreground" : "font-bold text-foreground"}`}>
                {displayName}
              </p>
            </div>
            {chat.last_message_content && (
              <p className={`text-[11px] line-clamp-1 font-cairo mt-0.5 ${hasUnread ? "text-foreground/70 font-semibold" : "text-muted-foreground"}`}>
                {chat.last_message_content}
              </p>
            )}
            <p className="text-[10px] text-muted-foreground/50 mt-0.5 font-cairo">
              {chat.last_message_at
                ? formatDistanceToNow(new Date(chat.last_message_at), { addSuffix: true, locale: ar })
                : "محادثة جديدة"}
            </p>
          </div>

          {/* Avatar + unread badge */}
          <div className="relative flex-shrink-0">
            {other?.avatar_url ? (
              <img src={other.avatar_url} alt=""
                className={`w-[52px] h-[52px] rounded-2xl object-cover ring-2 transition-all ${hasUnread ? "ring-rose-500/60" : "ring-border/20"}`} />
            ) : (
              <div className={`w-[52px] h-[52px] rounded-2xl gradient-primary flex items-center justify-center text-lg font-bold text-primary-foreground ring-2 transition-all ${hasUnread ? "ring-rose-500/60" : "ring-transparent"}`}>
                {other?.username?.charAt(0)?.toUpperCase() || "?"}
              </div>
            )}
            <div className="absolute -bottom-0.5 -right-0.5">
              <OnlineIndicator isOnline={other?.is_online || false} />
            </div>
            {hasUnread && (
              <motion.div
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                className="absolute -top-1.5 -left-1.5 min-w-[20px] h-[20px] rounded-full bg-rose-500 flex items-center justify-center px-1 shadow-[0_0_10px_rgba(239,68,68,0.7)]"
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
    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay }}
    className="glass-card p-3 flex items-center gap-3 group hover:border-primary/25 transition-all"
  >
    <div className="relative cursor-pointer flex-shrink-0" onClick={() => onProfile(person.username)}>
      {person.avatar_url ? (
        <img src={person.avatar_url} alt="" className="w-12 h-12 rounded-2xl object-cover ring-2 ring-border/20 group-hover:ring-primary/30 transition-all" />
      ) : (
        <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center font-bold text-primary-foreground">
          {person.username?.charAt(0)?.toUpperCase()}
        </div>
      )}
      {person.is_online && <div className="absolute -bottom-0.5 -right-0.5"><OnlineIndicator isOnline /></div>}
    </div>
    <div className="flex-1 text-right min-w-0">
      <p className="font-cairo font-bold text-sm text-foreground truncate">{person.full_name || person.username}</p>
      <p className="text-[11px] text-muted-foreground font-cairo">@{person.username}</p>
    </div>
    <div className="flex gap-1.5">
      <motion.button whileTap={{ scale: 0.88 }} onClick={() => onChat(person.id)}
        className="p-2 rounded-xl bg-primary/15 text-primary hover:bg-primary/25 transition-all">
        <MessageCircle size={15} />
      </motion.button>
      <motion.button whileTap={{ scale: 0.88 }} onClick={() => onProfile(person.username)}
        className="p-2 rounded-xl bg-accent/15 text-accent hover:bg-accent/25 transition-all">
        <ChevronRight size={15} />
      </motion.button>
      <motion.button whileTap={{ scale: 0.88 }} onClick={() => onBlock(person.id)}
        className="p-2 rounded-xl bg-destructive/10 text-destructive/60 hover:bg-destructive/20 hover:text-destructive transition-all">
        <Ban size={14} />
      </motion.button>
    </div>
  </motion.div>
);

/* ── Request card ── */
const RequestCard = ({ req, onAccept, onBlock, onProfile, delay }: any) => {
  const [done, setDone] = useState<null | "accepted" | "rejected">(null);
  if (done) return null;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, x: done === "accepted" ? 80 : -80, scale: 0.8 }}
      transition={{ delay }}
      className="glass-card p-4 relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-l from-primary/5 to-transparent pointer-events-none" />
      <div className="flex items-center gap-3">
        <div className="relative cursor-pointer" onClick={() => onProfile(req.follower?.username)}>
          {req.follower?.avatar_url ? (
            <img src={req.follower.avatar_url} alt="" className="w-[52px] h-[52px] rounded-2xl object-cover" />
          ) : (
            <div className="w-[52px] h-[52px] rounded-2xl gradient-primary flex items-center justify-center font-bold text-primary-foreground">
              {req.follower?.username?.charAt(0)?.toUpperCase()}
            </div>
          )}
          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
            <UserPlus size={10} className="text-primary-foreground" />
          </div>
        </div>
        <div className="flex-1 text-right">
          <p className="font-cairo font-bold text-sm text-foreground">{req.follower?.full_name || req.follower?.username}</p>
          <p className="text-[11px] text-muted-foreground font-cairo">@{req.follower?.username}</p>
          <p className="text-[10px] text-primary/70 font-cairo mt-0.5">يريد متابعتك ✨</p>
        </div>
        <div className="flex flex-col gap-2">
          <motion.button whileTap={{ scale: 0.85 }}
            onClick={() => { setDone("accepted"); onAccept(req.id); }}
            className="flex items-center gap-1.5 gradient-primary text-primary-foreground text-[11px] px-4 py-2 rounded-xl font-cairo font-bold shadow-[0_2px_10px_hsl(var(--primary)/0.35)]">
            <Check size={12} /> قبول
          </motion.button>
          <motion.button whileTap={{ scale: 0.85 }}
            onClick={() => { setDone("rejected"); onBlock(req.follower?.id); }}
            className="flex items-center gap-1.5 bg-destructive/15 text-destructive text-[11px] px-4 py-2 rounded-xl font-cairo font-semibold">
            <X size={12} /> رفض
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
  const { chats, isLoading, createChat, deleteChat } = useChats();
  const { user } = useAuth();
  const { followers, following, pendingRequests, acceptFollow, unfollow } = useFollows();
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
    let list = chats.filter((chat: any) => {
      const otherId = getOtherUserId(chat);
      if (isBlocked(otherId)) return false;
      if (searchQuery) {
        const other = getOtherUser(chat);
        if (!other?.full_name?.includes(searchQuery) && !other?.username?.includes(searchQuery)) return false;
      }
      if (filter === "online") return getOtherUser(chat)?.is_online;
      if (filter === "unread") return (unreadPerChat[chat.id] || 0) > 0;
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
        <div className="flex gap-1.5 p-1 bg-secondary/30 rounded-2xl">
          {tabs.map((tab) => (
            <motion.button
              key={tab.id} layout whileTap={{ scale: 0.95 }}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-cairo font-bold transition-all relative ${
                activeTab === tab.id
                  ? "gradient-primary text-primary-foreground shadow-[0_4px_20px_hsl(var(--primary)/0.35)]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon size={13} />
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
                  className={`min-w-[18px] h-[18px] px-1 rounded-full text-[9px] font-extrabold flex items-center justify-center ${
                    activeTab === tab.id ? "bg-white/25 text-white" : "bg-primary text-primary-foreground"
                  }`}>
                  {tab.count}
                </motion.span>
              )}
              {/* Unread dot on chats tab when not active */}
              {tab.id === "chats" && totalUnread > 0 && activeTab !== "chats" && (
                <motion.span
                  animate={{ scale: [1, 1.4, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}
                  className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]" />
              )}
              {/* Pending requests dot */}
              {tab.id === "requests" && pendingRequests.length > 0 && activeTab !== "requests" && (
                <motion.span
                  animate={{ scale: [1, 1.4, 1] }} transition={{ repeat: Infinity, duration: 1.8 }}
                  className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500" />
              )}
            </motion.button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* CHATS TAB */}
          {activeTab === "chats" && (
            <motion.div key="chats" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-3">
              {!isLoading && chats.length > 0 && (
              )}

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="ابحث..."
                    className="w-full bg-secondary/30 rounded-xl py-2.5 pr-9 pl-3 text-sm text-foreground placeholder:text-muted-foreground font-cairo border border-border/20 focus:border-primary/40 focus:outline-none transition-all" />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      <X size={13} />
                    </button>
                  )}
                </div>
                <div className="flex gap-1">
                  {(["all", "online", "unread"] as const).map((f) => (
                    <motion.button key={f} whileTap={{ scale: 0.9 }} onClick={() => setFilter(f)}
                      className={`px-2.5 py-1.5 rounded-xl text-[10px] font-cairo font-bold transition-all whitespace-nowrap ${
                        filter === f ? "gradient-primary text-primary-foreground shadow-[0_2px_10px_hsl(var(--primary)/0.3)]" : "bg-secondary/40 text-muted-foreground"
                      }`}>
                      {f === "all" ? "الكل" : f === "online" ? "🟢" : `🔴${totalUnread > 0 ? ` ${totalUnread}` : ""}`}
                    </motion.button>
                  ))}
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
                        displayName={displayName} unreadCount={unreadPerChat[chat.id] || 0}
                        onOpen={handleNavigateToChat}
                        onDelete={(id: string) => { deleteChat.mutate(id); toast.success("تم حذف المحادثة 🗑️"); }}
                        onPin={togglePin} onMute={toggleMute}
                        pinnedIds={pinnedIds} mutedIds={mutedIds}
                      />
                    );
                  })}
                </div>
              ) : (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-16 space-y-4">
                  <div className="relative w-20 h-20 mx-auto">
                    <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center">
                      <MessageCircle size={38} className="text-primary" />
                    </div>
                    <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 2 }}
                      className="absolute -top-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                      <Sparkles size={12} className="text-primary-foreground" />
                    </motion.div>
                  </div>
                  <h3 className="font-cairo font-extrabold text-lg text-foreground">مفيش محادثات لسه</h3>
                  <p className="text-sm text-muted-foreground font-cairo">تابع حد وهو يتابعك عشان تفتحو شات 💬</p>
                </motion.div>
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
                      {person.avatar_url ? (
                        <img src={person.avatar_url} alt="" className="w-12 h-12 rounded-2xl object-cover ring-2 ring-border/20 group-hover:ring-primary/30 transition-all" />
                      ) : (
                        <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center font-bold text-primary-foreground">
                          {person.username?.charAt(0)?.toUpperCase()}
                        </div>
                      )}
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
                        onBlock={(id: string) => block.mutate(id)}
                        onProfile={(u: string) => navigate(`/${u}`)} />
                    ))}
                  </AnimatePresence>
                </>
              ) : (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-16 space-y-4">
                  <div className="w-20 h-20 mx-auto bg-accent/10 rounded-3xl flex items-center justify-center">
                    <UserPlus size={38} className="text-accent" />
                  </div>
                  <h3 className="font-cairo font-extrabold text-lg text-foreground">مفيش طلبات</h3>
                  <p className="text-sm text-muted-foreground font-cairo">لما حد يبعتلك طلب متابعة هيظهر هنا ✨</p>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ChatsPage;
