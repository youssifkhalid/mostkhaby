import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import TopBar from "@/components/TopBar";
import MessageCard from "@/components/MessageCard";
import EmptyState from "@/components/EmptyState";
import { Inbox, Star, Send as SendIcon, Loader2, Search, Reply } from "lucide-react";
import { useMessages } from "@/hooks/useMessages";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const tabs = [
  { id: "inbox", label: "الوارد", icon: Inbox },
  { id: "favorites", label: "المفضلة", icon: Star },
  { id: "sent", label: "المُرسلة", icon: SendIcon },
];

const InboxPage = () => {
  const [activeTab, setActiveTab] = useState("inbox");
  const [searchQuery, setSearchQuery] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const { messages, sentMessages, isLoading, toggleFavorite, deleteMessage, togglePublic } = useMessages();
  const { profile } = useProfile();
  const { user } = useAuth();
  const navigate = useNavigate();

  const currentMessages = activeTab === "sent" ? sentMessages : activeTab === "favorites" ? messages.filter(m => m.is_favorite) : messages;
  const filteredMessages = currentMessages.filter(m => !searchQuery || m.content.includes(searchQuery));

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
    if (error) {
      toast.error("حصل مشكلة في الرد");
      return;
    }
    toast.success("تم الرد بنجاح! 💬");
    setReplyingTo(null);
    setReplyContent("");
  };

  return (
    <div className="min-h-screen pb-24">
      <TopBar />
      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* Share banner */}
        {profile && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-3 flex items-center gap-3 cursor-pointer glow-border"
            onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/${profile.username}`);
              toast.success("تم نسخ الرابط! 🔗");
            }}
          >
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
              <span className="text-primary-foreground text-lg">🔗</span>
            </div>
            <div className="flex-1 text-right">
              <p className="font-cairo font-bold text-primary text-sm">شارك رابطك عشان توصلك رسايل!</p>
              <p className="text-xs text-muted-foreground">اضغط هنا عشان تنسخ</p>
            </div>
          </motion.div>
        )}

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

        {/* Tabs */}
        <div className="flex gap-1 bg-secondary/30 rounded-xl p-1 relative">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <motion.button
                key={tab.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-cairo font-bold transition-all relative z-10 ${
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="inbox-active-tab"
                    className="absolute inset-0 bg-primary/15 border border-primary/20 rounded-lg"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <tab.icon size={14} className="relative z-10" />
                <span className="relative z-10">{tab.label}</span>
              </motion.button>
            );
          })}
        </div>

        {/* Messages */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={28} className="animate-spin text-primary" />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {filteredMessages.length > 0 ? (
              <motion.div key={activeTab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                {filteredMessages.map((msg: any, i: number) => (
                  <motion.div key={msg.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                    <MessageCard
                      id={msg.id}
                      content={msg.content}
                      created_at={msg.created_at}
                      is_favorite={msg.is_favorite}
                      is_read={msg.is_read}
                      is_public={msg.is_public}
                      onToggleFavorite={handleToggleFavorite}
                      onDelete={handleDelete}
                      onReply={activeTab !== "sent" ? (id) => setReplyingTo(id) : undefined}
                      onTogglePublic={activeTab !== "sent" ? (id, current) => togglePublic.mutate({ id, is_public: !current }) : undefined}
                      showReply={activeTab !== "sent"}
                      showPublicToggle={activeTab !== "sent"}
                    />
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <EmptyState
                icon={activeTab === "favorites" ? Star : activeTab === "sent" ? SendIcon : Inbox}
                title={
                  activeTab === "favorites"
                    ? "مفيش مفضلة لسه"
                    : activeTab === "sent"
                    ? "مبعتش رسائل لسه"
                    : "مفيش رسائل لسه"
                }
                description="شارك رابطك عشان الناس تبعتلك رسايل مجهولة ممتعة! 💬"
              />
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Reply Sheet */}
      <AnimatePresence>
        {replyingTo && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 backdrop-blur-sm" onClick={() => setReplyingTo(null)}>
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="w-full max-w-lg glass-card rounded-t-3xl p-6 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1 rounded-full bg-border/50 mx-auto" />
              <h3 className="font-cairo font-bold text-lg text-foreground text-center flex items-center justify-center gap-2">
                <Reply size={18} className="text-primary" />
                رد على الرسالة
              </h3>
              <p className="text-xs text-muted-foreground text-center">الرد هيوصل للمرسل بدون ما يعرف مين انت</p>
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="اكتب ردك..."
                rows={3}
                maxLength={300}
                className="w-full bg-secondary/30 rounded-xl py-3 px-4 text-sm text-foreground font-cairo border border-border/20 focus:border-primary/50 focus:outline-none resize-none"
              />
              <div className="flex gap-2">
                <button onClick={() => setReplyingTo(null)} className="flex-1 py-3 rounded-xl bg-secondary text-sm font-cairo font-semibold text-foreground">إلغاء</button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleReply}
                  disabled={!replyContent.trim()}
                  className="flex-1 btn-primary flex items-center justify-center gap-2 text-sm font-cairo disabled:opacity-40"
                >
                  ابعت الرد 💬
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default InboxPage;
