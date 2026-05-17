import { motion, AnimatePresence } from "framer-motion";
import { Copy, Share2, Mail, MessageSquare, Loader2, Camera, Heart, Eye, QrCode, ArrowRight, Star, Send as SendIcon, Search, Inbox, Reply, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import TopBar from "@/components/TopBar";
import MessageCard from "@/components/MessageCard";
import AccountSwitcher from "@/components/AccountSwitcher";
import { useProfile } from "@/hooks/useProfile";
import { useMessages } from "@/hooks/useMessages";
import { useAuth } from "@/hooks/useAuth";
import { useProfileVisits } from "@/hooks/useProfileVisits";
import { useFollows } from "@/hooks/useFollows";
import { useReplies } from "@/hooks/useReplies";
import { supabase } from "@/integrations/supabase/client";
import QRCodeCard from "@/components/QRCodeCard";
import OnlineIndicator from "@/components/OnlineIndicator";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

const messageTabs = [
  { id: "inbox", label: "الوارد", icon: Inbox },
  { id: "favorites", label: "المفضلة", icon: Star },
  { id: "sent", label: "المُرسلة", icon: SendIcon },
];

const sentSubTabs = [
  { id: "replies", label: "الردود", icon: Reply },
  { id: "accounts", label: "الحسابات", icon: Users },
];

const ProfilePage = () => {
  const { profile, isLoading, updateProfile } = useProfile();
  const { messages, sentMessages, isLoading: messagesLoading, toggleFavorite, deleteMessage, togglePublic } = useMessages();
  const { user } = useAuth();
  const { visitCount } = useProfileVisits();
  const { followers, following } = useFollows();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState("inbox");
  const [sentSubTab, setSentSubTab] = useState("replies");
  const [searchQuery, setSearchQuery] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");

  const inboxIds = messages.map((m: any) => m.id);
  const sentIds = sentMessages.map((m: any) => m.id);
  const allIds = [...inboxIds, ...sentIds];
  const { repliesByMessage } = useReplies(allIds);

  if (isLoading) {
    return (
      <div className="min-h-screen pb-24">
        <TopBar />
        <div className="flex justify-center py-20">
          <Loader2 size={28} className="animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const link = `${window.location.origin}/${profile?.username || ""}`;
  const totalMessages = messages.length;
  const unreadMessages = messages.filter((m: any) => !m.is_read).length;
  const favoriteMessages = messages.filter((m: any) => m.is_favorite).length;
  const acceptedFollowers = followers.filter((f: any) => f.status === "accepted");
  const acceptedFollowing = following.filter((f: any) => f.status === "accepted");

  const sentWithReplies = sentMessages.filter((m: any) => repliesByMessage[m.id]?.length > 0);
  const sentToAccounts = sentMessages;

  const getSentMessages = () => {
    if (sentSubTab === "replies") return sentWithReplies;
    return sentToAccounts;
  };

  const currentMessages = activeTab === "sent" ? getSentMessages() : activeTab === "favorites" ? messages.filter((m: any) => m.is_favorite) : messages;
  const filteredMessages = currentMessages.filter((m: any) => !searchQuery || m.content.includes(searchQuery));

  const handleCopy = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    if (navigator.vibrate) navigator.vibrate(10);
    toast.success("تم نسخ الرابط! 🔗");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("الصورة كبيرة أوي! الحد الأقصى 2MB"); return; }
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (uploadError) { toast.error("مقدرش أرفع الصورة"); return; }
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    updateProfile.mutate({ avatar_url: publicUrl }, { onSuccess: () => toast.success("تم تحديث الصورة! 📸") });
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: "مستخبي", text: "ابعتلي رسالة سرية!", url: link });
    } else handleCopy();
  };

  const handleToggleFavorite = (id: string, current: boolean) => {
    toggleFavorite.mutate({ id, is_favorite: !current });
  };

  const handleDelete = (id: string) => {
    deleteMessage.mutate(id, { onSuccess: () => toast.success("اتمسحت! 🗑️") });
  };

  const handleReply = async () => {
    if (!replyingTo || !replyContent.trim() || !user?.id) return;
    const { error } = await supabase.from("message_replies").insert({
      message_id: replyingTo,
      replier_id: user.id,
      content: replyContent.trim(),
    });
    if (error) { toast.error("حصل مشكلة في الرد"); return; }
    toast.success("تم الرد بنجاح! 💬");
    setReplyingTo(null);
    setReplyContent("");
  };

  const getPersonInfo = (msg: any) => {
    if (activeTab === "sent") {
      return {
        name: msg.receiver?.full_name || msg.receiver?.username || "المستلم",
        username: msg.receiver?.username,
        avatar: msg.receiver?.avatar_url,
        label: "إلى",
        onOpen: msg.receiver?.username ? () => navigate(`/${msg.receiver.username}`) : undefined,
      };
    }
    if (msg.sender_id) {
      return {
        name: msg.sender?.full_name || msg.sender?.username || "مستخدم",
        username: msg.sender?.username,
        avatar: msg.sender?.avatar_url,
        label: undefined,
        onOpen: msg.sender?.username ? () => navigate(`/${msg.sender.username}`) : undefined,
      };
    }
    return { name: "مجهول 🤫", username: undefined, avatar: null, label: undefined, onOpen: undefined };
  };

  return (
    <div className="min-h-screen pb-24">
      <TopBar />
      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">

        {/* ───── Avatar with animated ring ───── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center text-center">
          <div className="relative mb-4">
            <div className="absolute -inset-1.5 rounded-[22px] bg-gradient-to-br from-primary via-accent to-primary opacity-70 blur-sm animate-pulse" />
            <motion.div
              className="absolute -inset-1 rounded-[20px] border-2 border-primary/50"
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              style={{ borderStyle: "dashed" }}
            />
            <div className="relative">
              {profile?.avatar_url ? (
                <motion.img
                  src={profile.avatar_url}
                  alt=""
                  className="w-24 h-24 rounded-2xl object-cover border-2 border-background shadow-2xl relative z-10"
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 300 }}
                />
              ) : (
                <motion.div
                  className="w-24 h-24 rounded-2xl gradient-primary flex items-center justify-center text-3xl font-bold text-primary-foreground shadow-2xl relative z-10 border-2 border-background"
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  {profile?.full_name?.charAt(0) || profile?.username?.charAt(0)?.toUpperCase() || "M"}
                </motion.div>
              )}
              <label className="absolute -bottom-2 -left-2 w-9 h-9 rounded-full gradient-accent flex items-center justify-center text-accent-foreground cursor-pointer shadow-lg z-20 border-2 border-background">
                <Camera size={14} />
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </label>
              <div className="absolute -top-1 -right-1 z-20">
                <OnlineIndicator isOnline={true} size="md" />
              </div>
            </div>
          </div>

          {/* Account Switcher */}
          <AccountSwitcher />
          <h1 className="text-xl font-cairo font-bold text-foreground mt-2">{profile?.full_name || profile?.username}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">@{profile?.username}</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs">{profile?.bio}</p>
        </motion.div>

        {/* Followers/Following */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="flex justify-center gap-6">
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => { setShowFollowers(!showFollowers); setShowFollowing(false); }} className="flex flex-col items-center gap-0.5">
            <span className="text-xl font-cairo font-bold text-foreground">{acceptedFollowers.length}</span>
            <span className="text-xs text-muted-foreground font-cairo">متابعين</span>
          </motion.button>
          <div className="w-px bg-border/30" />
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => { setShowFollowing(!showFollowing); setShowFollowers(false); }} className="flex flex-col items-center gap-0.5">
            <span className="text-xl font-cairo font-bold text-foreground">{acceptedFollowing.length}</span>
            <span className="text-xs text-muted-foreground font-cairo">بيتابع</span>
          </motion.button>
        </motion.div>

        {/* Followers/Following Lists */}
        <AnimatePresence>
          {showFollowers && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-2 overflow-hidden">
              <h3 className="font-cairo font-semibold text-sm text-muted-foreground text-right">المتابعين</h3>
              {acceptedFollowers.map((f: any) => (
                <motion.button key={f.id} whileTap={{ scale: 0.98 }} onClick={() => navigate(`/${f.follower?.username}`)} className="w-full glass-card p-3 flex items-center gap-3">
                  <ArrowRight size={14} className="text-muted-foreground" />
                  <div className="flex-1 text-right">
                    <p className="font-cairo font-semibold text-sm text-foreground">{f.follower?.full_name || f.follower?.username}</p>
                    <p className="text-[11px] text-muted-foreground">@{f.follower?.username}</p>
                  </div>
                  {f.follower?.avatar_url ? (
                    <img src={f.follower.avatar_url} alt="" className="w-10 h-10 rounded-xl object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center text-sm font-bold text-primary-foreground">
                      {f.follower?.username?.charAt(0)?.toUpperCase()}
                    </div>
                  )}
                </motion.button>
              ))}
              {acceptedFollowers.length === 0 && <p className="text-center text-muted-foreground text-sm font-cairo py-4">مفيش متابعين لسه</p>}
            </motion.div>
          )}
          {showFollowing && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-2 overflow-hidden">
              <h3 className="font-cairo font-semibold text-sm text-muted-foreground text-right">بيتابع</h3>
              {acceptedFollowing.map((f: any) => (
                <motion.button key={f.id} whileTap={{ scale: 0.98 }} onClick={() => navigate(`/${f.following?.username}`)} className="w-full glass-card p-3 flex items-center gap-3">
                  <ArrowRight size={14} className="text-muted-foreground" />
                  <div className="flex-1 text-right">
                    <p className="font-cairo font-semibold text-sm text-foreground">{f.following?.full_name || f.following?.username}</p>
                    <p className="text-[11px] text-muted-foreground">@{f.following?.username}</p>
                  </div>
                  {f.following?.avatar_url ? (
                    <img src={f.following.avatar_url} alt="" className="w-10 h-10 rounded-xl object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center text-sm font-bold text-primary-foreground">
                      {f.following?.username?.charAt(0)?.toUpperCase()}
                    </div>
                  )}
                </motion.button>
              ))}
              {acceptedFollowing.length === 0 && <p className="text-center text-muted-foreground text-sm font-cairo py-4">مش بتتابع حد</p>}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-4 gap-2">
          {[
            { label: "الرسائل", value: totalMessages, icon: Mail, gradient: "gradient-primary" },
            { label: "جديدة", value: unreadMessages, icon: MessageSquare, gradient: "gradient-accent" },
            { label: "المفضلة", value: favoriteMessages, icon: Heart, gradient: "gradient-rose" },
            { label: "الزيارات", value: visitCount, icon: Eye, gradient: "gradient-primary" },
          ].map((stat) => (
            <motion.div whileTap={{ scale: 0.95 }} key={stat.label} className="glass-card p-3 text-center">
              <div className={`w-8 h-8 rounded-lg ${stat.gradient} flex items-center justify-center mx-auto mb-1`}>
                <stat.icon size={14} className="text-primary-foreground" />
              </div>
              <p className="text-lg font-cairo font-bold text-foreground">{stat.value}</p>
              <p className="text-[10px] font-cairo text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} className="gradient-primary rounded-2xl p-5 text-center glow-border">
          <p className="text-primary-foreground font-cairo font-bold text-lg leading-relaxed">
            ابعتلي رسايل سرية من غير ما حد يعرفك! 🤫
          </p>
        </motion.div>

        {/* Copy Link */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-5 space-y-3">
          <h3 className="font-cairo font-bold text-foreground text-center">شارك رابطك!</h3>
          <div className="flex items-center gap-2">
            <motion.button whileTap={{ scale: 0.95 }} onClick={handleCopy} className="btn-primary flex-shrink-0 text-sm py-2.5 px-4">
              {copied ? "تم! ✓" : <><Copy size={14} /> نسخ</>}
            </motion.button>
            <div className="flex-1 bg-secondary/50 rounded-xl px-3 py-2.5 text-xs text-muted-foreground truncate text-left" dir="ltr">
              {link}
            </div>
          </div>
          <div className="flex gap-2">
            <motion.button whileTap={{ scale: 0.97 }} onClick={handleShare} className="flex-1 btn-accent flex items-center justify-center gap-2 font-cairo text-sm">
              <Share2 size={16} /> مشاركة
            </motion.button>
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowQR(!showQR)} className="flex-1 glass-card flex items-center justify-center gap-2 font-cairo text-sm font-semibold text-foreground hover:border-primary/30 transition-colors py-3">
              <QrCode size={16} className="text-primary" /> QR Code
            </motion.button>
          </div>
        </motion.div>

        {showQR && <QRCodeCard url={link} username={profile?.username || ""} />}

        {/* ───── Messages Section ───── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="space-y-4">
          <h2 className="font-cairo font-bold text-lg text-foreground text-right flex items-center gap-2 justify-end">
            <Mail size={20} className="text-primary" />
            رسائلي
          </h2>

          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث في رسائلك..."
              className="w-full bg-secondary/30 rounded-xl py-2.5 pr-9 pl-4 text-sm text-foreground placeholder:text-muted-foreground font-cairo border border-border/20 focus:border-primary/50 focus:outline-none transition-colors"
            />
          </div>

          {/* Main Tabs */}
          <div className="flex gap-1 bg-secondary/30 rounded-xl p-1">
            {messageTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-cairo font-semibold transition-all ${
                  activeTab === tab.id ? "bg-primary/15 text-primary border border-primary/20" : "text-muted-foreground"
                }`}
              >
                <tab.icon size={14} />
                {tab.label}
                {tab.id === "inbox" && unreadMessages > 0 && (
                  <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
                    {unreadMessages}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Sent Sub-tabs */}
          {activeTab === "sent" && (
            <div className="flex gap-1 bg-secondary/20 rounded-lg p-0.5">
              {sentSubTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSentSubTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-[11px] font-cairo font-semibold transition-all ${
                    sentSubTab === tab.id ? "bg-accent/15 text-accent border border-accent/20" : "text-muted-foreground"
                  }`}
                >
                  <tab.icon size={12} />
                  {tab.label}
                  {tab.id === "replies" && sentWithReplies.length > 0 && (
                    <span className="min-w-[16px] h-[16px] px-0.5 rounded-full bg-accent text-accent-foreground text-[8px] font-bold flex items-center justify-center">
                      {sentWithReplies.length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Messages List */}
          {messagesLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 size={24} className="animate-spin text-primary" />
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {filteredMessages.length > 0 ? (
                <motion.div key={`${activeTab}-${sentSubTab}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                  {filteredMessages.map((msg: any, i: number) => {
                    const person = getPersonInfo(msg);
                    const msgReplies = repliesByMessage[msg.id] || [];

                    return (
                      <motion.div key={msg.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="space-y-0">
                        <MessageCard
                          id={msg.id}
                          content={msg.content}
                          created_at={msg.created_at}
                          is_favorite={msg.is_favorite}
                          is_read={msg.is_read}
                          is_public={msg.is_public}
                          personName={person.name}
                          personUsername={person.username}
                          personAvatarUrl={person.avatar}
                          personLabel={person.label}
                          onOpenProfile={person.onOpen}
                          onToggleFavorite={handleToggleFavorite}
                          onDelete={handleDelete}
                          onReply={activeTab !== "sent" ? (id) => { setReplyingTo(replyingTo === id ? null : id); setReplyContent(""); } : undefined}
                          onTogglePublic={activeTab !== "sent" ? (id, current) => togglePublic.mutate({ id, is_public: !current }) : undefined}
                          showReply={activeTab !== "sent"}
                          showPublicToggle={activeTab !== "sent"}
                        />

                        {/* Show existing replies under the message */}
                        {msgReplies.length > 0 && (
                          <div className="mr-6 border-r-2 border-primary/20 pr-3 space-y-2 py-2">
                            {msgReplies.map((reply: any) => (
                              <motion.div
                                key={reply.id}
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="glass-card p-3 border-primary/10"
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <Reply size={12} className="text-primary" />
                                  <span className="text-[10px] text-primary font-cairo font-semibold">
                                    {reply.replier_id === user?.id ? "ردك" : "رد"}
                                  </span>
                                  <span className="text-[9px] text-muted-foreground mr-auto">
                                    {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true, locale: ar })}
                                  </span>
                                </div>
                                <p className="text-sm text-foreground font-cairo">{reply.content}</p>
                              </motion.div>
                            ))}
                          </div>
                        )}

                        {/* Inline reply input - next to message */}
                        {activeTab !== "sent" && replyingTo === msg.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mr-6 border-r-2 border-accent/30 pr-3 py-2"
                          >
                            <div className="flex items-center gap-2">
                              <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={handleReply}
                                disabled={!replyContent.trim()}
                                className="h-10 w-10 gradient-primary text-primary-foreground rounded-xl flex items-center justify-center disabled:opacity-40 flex-shrink-0 shadow-lg"
                              >
                                <SendIcon size={16} />
                              </motion.button>
                              <input
                                value={replyContent}
                                onChange={(e) => setReplyContent(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleReply()}
                                placeholder="اكتب ردك..."
                                maxLength={300}
                                autoFocus
                                className="flex-1 bg-secondary/30 rounded-xl py-2.5 px-3 text-sm text-foreground placeholder:text-muted-foreground font-cairo border border-border/20 focus:border-primary/50 focus:outline-none"
                                dir="rtl"
                              />
                            </div>
                          </motion.div>
                        )}
                      </motion.div>
                    );
                  })}
                </motion.div>
              ) : (
                <motion.div key="empty" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12 space-y-3">
                  <div className="text-5xl">{activeTab === "favorites" ? "⭐" : activeTab === "sent" ? "📤" : "📭"}</div>
                  <h3 className="font-cairo font-bold text-lg text-foreground">
                    {activeTab === "favorites" ? "مفيش مفضلة لسه" : activeTab === "sent" ? (sentSubTab === "replies" ? "مفيش ردود لسه" : "مبعتش رسائل لسه") : "مفيش رسائل لسه"}
                  </h3>
                  <p className="text-sm text-muted-foreground">شارك رابطك عشان الناس تبعتلك!</p>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ProfilePage;
