import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Send, Sparkles, ArrowRight, Loader2, AlertTriangle, UserPlus, UserCheck, Expand, Eye, EyeOff } from "lucide-react";
import { FaInstagram, FaTiktok, FaWhatsapp, FaSnapchat, FaFacebookF, FaXTwitter, FaFacebookMessenger, FaPhone } from "react-icons/fa6";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import MstkhbiLogo from "@/components/MstkhbiLogo";
import UserAvatar from "@/components/UserAvatar";
import { useProfileByUsername } from "@/hooks/useProfile";
import { useMessages } from "@/hooks/useMessages";
import { useAuth } from "@/hooks/useAuth";
import { useFollows } from "@/hooks/useFollows";
import { useProfileVisits } from "@/hooks/useProfileVisits";
import { messageSchema } from "@/lib/contentFilter";
import { sanitizeTextForDatabase } from "@/lib/sanitizeText";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

const AI_SUGGESTIONS = [
  "إيه أكتر حاجة بتحبها في نفسك؟ 🤔",
  "لو هتسافر مكان واحد بس، هتروح فين؟ ✈️",
  "إيه الأغنية اللي بتسمعها على الريبيت؟ 🎵",
  "عايز أقولك حاجة من زمان 🙈",
  "أنت أحلى إنسان عرفته 💛",
  "ابتسامتك بتنور الدنيا 🌟",
  "إيه أكتر حاجة بتخليك سعيد؟ 😊",
  "لو عندك superpower، هتختار إيه؟ ⚡",
];

const RATE_LIMIT_KEY = "mstkhbi_msg_times";
const MAX_MESSAGES_PER_MIN = 5;

const socialIconMap: Record<string, { icon: any; color: string; urlPrefix: string }> = {
  instagram: { icon: FaInstagram, color: "#E4405F", urlPrefix: "https://instagram.com/" },
  tiktok: { icon: FaTiktok, color: "#ffffff", urlPrefix: "https://tiktok.com/@" },
  whatsapp: { icon: FaWhatsapp, color: "#25D366", urlPrefix: "https://wa.me/" },
  snapchat: { icon: FaSnapchat, color: "#FFFC00", urlPrefix: "https://snapchat.com/add/" },
  facebook: { icon: FaFacebookF, color: "#1877F2", urlPrefix: "https://facebook.com/" },
  messenger: { icon: FaFacebookMessenger, color: "#006AFF", urlPrefix: "https://m.me/" },
  twitter: { icon: FaXTwitter, color: "#ffffff", urlPrefix: "https://x.com/" },
  phone: { icon: FaPhone, color: "#34C759", urlPrefix: "tel:" },
};

const SendMessagePage = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [showAvatar, setShowAvatar] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(true);
  const { user } = useAuth();
  const { data: receiverProfile, isLoading: profileLoading } = useProfileByUsername(username);
  const { sendMessage } = useMessages();
const { follow, following = [] } = useFollows();
  const { recordVisit } = useProfileVisits();

  useEffect(() => {
    if (receiverProfile?.id) recordVisit(receiverProfile.id);
  }, [receiverProfile?.id]);

  const checkRateLimit = (): boolean => {
    const now = Date.now();
    const stored = JSON.parse(localStorage.getItem(RATE_LIMIT_KEY) || "[]") as number[];
    const recent = stored.filter(t => now - t < 60000);
    if (recent.length >= MAX_MESSAGES_PER_MIN) { toast.error("بتبعت كتير أوي! استنى شوية 🛑"); return false; }
    localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify([...recent, now]));
    return true;
  };

  const handleSend = async () => {
    const safeMessage = sanitizeTextForDatabase(message);
    if (!safeMessage || !receiverProfile) return;
    const result = messageSchema.safeParse({ content: safeMessage });
    if (!result.success) { setValidationError(result.error.errors[0].message); return; }
    setValidationError("");
    if (!checkRateLimit()) return;
    if (navigator.vibrate) navigator.vibrate([10, 50, 10]);
    try {
      const sender_id = isAnonymous ? undefined : user?.id;
      await sendMessage.mutateAsync({ receiver_id: receiverProfile.id, content: safeMessage, sender_id });
      setSent(true);
      toast.success("الرسالة اتبعتت! ✉️");
      setTimeout(() => { setSent(false); setMessage(""); }, 2500);
    } catch (error) {
      const message = (error as any)?.message || "";
      const isRuleIssue = message.includes("row-level security") || message.includes("permission denied");
      toast.error(isRuleIssue ? "صلاحيات الرسائل محتاجة تحديث من قاعدة البيانات" : `حصل مشكلة، جرب تاني${message ? `: ${message}` : ""}`);
    }
  };

  const handleFollow = () => {
    if (!user || !receiverProfile) { toast.error("سجل دخول الأول"); return; }
    follow.mutate(receiverProfile.id, { onSuccess: () => toast.success("تم إرسال طلب المتابعة! 👀") });
  };

  if (profileLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 size={28} className="animate-spin text-primary" /></div>;
  }

  if (!receiverProfile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 space-y-4">
        <div className="text-6xl">😕</div>
        <h2 className="font-cairo font-bold text-xl text-foreground">المستخدم ده مش موجود</h2>
        <button onClick={() => navigate("/")} className="bg-primary text-primary-foreground rounded-xl px-6 py-2 font-cairo">الرئيسية</button>
      </div>
    );
  }
const followStatus = receiverProfile
  ? following.find((f: any) => f.following_id === receiverProfile.id)?.status
  : null;
  const socialLinks = (receiverProfile.social_links || {}) as Record<string, string>;
  const activeSocials = Object.entries(socialLinks).filter(([, val]) => val && val.trim());

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 bg-background/60 backdrop-blur-2xl border-b border-border/15">
        <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
          <div className="w-10" />
          <MstkhbiLogo size="sm" />
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-secondary transition-colors">
            <ArrowRight size={22} className="text-foreground" />
          </button>
        </div>
      </header>

      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-6 space-y-5">
        {/* Profile Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5 text-center space-y-3">
          <div className="relative inline-block cursor-pointer" onClick={() => setShowAvatar(true)}>
            <UserAvatar
              url={receiverProfile.avatar_url}
              name={receiverProfile.full_name || receiverProfile.username}
              size="lg"
              isOnline={receiverProfile.is_online || false}
              className="border-2 border-primary/30 shadow-lg"
            />
          </div>
          <h2 className="font-cairo font-bold text-xl text-foreground">{receiverProfile.full_name || receiverProfile.username}</h2>
          {!receiverProfile.is_online && receiverProfile.last_seen && (
            <p className="text-[11px] text-muted-foreground">آخر ظهور: {formatDistanceToNow(new Date(receiverProfile.last_seen), { addSuffix: true, locale: ar })}</p>
          )}
          <p className="text-sm text-muted-foreground">{receiverProfile.bio}</p>

          {/* Social Links */}
          {activeSocials.length > 0 && (
            <div className="flex justify-center gap-2 pt-2 flex-wrap">
              {activeSocials.map(([key, val]) => {
                const social = socialIconMap[key];
                if (!social) return null;
                const IconComp = social.icon;
                const url = val.startsWith("http") ? val : `${social.urlPrefix}${val.replace("@", "")}`;
                return (
                  <motion.a key={key} href={url} target="_blank" rel="noopener noreferrer" whileTap={{ scale: 0.9 }} className="w-9 h-9 rounded-xl bg-secondary/50 flex items-center justify-center hover:bg-secondary transition-colors">
                    <IconComp size={16} style={{ color: social.color }} />
                  </motion.a>
                );
              })}
            </div>
          )}

          {/* Follow button */}
          {user && user.id !== receiverProfile.id && (
            <div className="pt-2">
              {followStatus === "accepted" ? (
                <span className="text-xs text-accent font-cairo flex items-center justify-center gap-1"><UserCheck size={14} /> متابع</span>
              ) : followStatus === "pending" ? (
                <span className="text-xs text-muted-foreground font-cairo">في انتظار القبول...</span>
              ) : (
                <motion.button whileTap={{ scale: 0.97 }} onClick={handleFollow} className="bg-accent text-accent-foreground rounded-xl px-4 py-2 text-sm font-cairo flex items-center justify-center gap-2 mx-auto">
                  <UserPlus size={16} /> متابعة
                </motion.button>
              )}
            </div>
          )}
        </motion.div>

        {/* Message Area */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-4 space-y-3">
          {/* Anonymous / Identified Toggle */}
          {user && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setIsAnonymous(!isAnonymous)}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-cairo font-semibold transition-all border ${
                isAnonymous
                  ? "bg-secondary/50 text-muted-foreground border-border/20"
                  : "bg-primary/10 text-primary border-primary/30"
              }`}
            >
              {isAnonymous ? <EyeOff size={16} /> : <Eye size={16} />}
              {isAnonymous ? "إرسال كمجهول 🤫" : "إرسال بشخصيتي 👤"}
            </motion.button>
          )}

          <textarea
            value={message}
            onChange={(e) => { setMessage(e.target.value); setValidationError(""); }}
            placeholder={isAnonymous ? "قول اللي في قلبك من غير ما حد يعرفك 😉" : "اكتب رسالتك..."}
            maxLength={500}
            rows={4}
            className="w-full bg-secondary/30 rounded-xl p-4 text-sm text-foreground placeholder:text-muted-foreground font-cairo border border-border/20 focus:border-primary/50 focus:outline-none resize-none transition-colors"
          />
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">{message.length}/500</span>
            {!isAnonymous && user && (
              <span className="text-xs text-primary font-cairo">سيظهر اسمك للمستلم</span>
            )}
          </div>

          {validationError && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-destructive text-xs font-cairo bg-destructive/10 rounded-lg p-2">
              <AlertTriangle size={14} /> {validationError}
            </motion.div>
          )}

          <motion.button whileTap={{ scale: 0.97 }} onClick={() => { setMessage(AI_SUGGESTIONS[Math.floor(Math.random() * AI_SUGGESTIONS.length)]); setValidationError(""); }} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-secondary/50 text-sm font-cairo font-semibold text-foreground hover:bg-secondary transition-colors border border-border/20">
            <Sparkles size={16} className="text-accent" /> اقتراح رسالة ✨
          </motion.button>

          <AnimatePresence mode="wait">
            {sent ? (
              <motion.div key="sent" initial={{ scale: 1 }} animate={{ y: -100, scale: 0.3, opacity: 0 }} className="text-center py-4">
                <span className="text-5xl">✉️</span>
              </motion.div>
            ) : (
              <motion.button
                key="send"
                whileTap={{ scale: 0.97 }}
                onClick={handleSend}
                disabled={!message.trim() || sendMessage.isPending}
                className="w-full bg-primary text-primary-foreground rounded-xl py-3.5 flex items-center justify-center gap-2 font-cairo text-lg font-bold disabled:opacity-40 shadow-lg"
              >
                {sendMessage.isPending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                {isAnonymous ? "ابعت كمجهول 🤫" : "ابعت الرسالة ✉️"}
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Avatar Full Screen */}
      <AnimatePresence>
        {showAvatar && receiverProfile.avatar_url && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAvatar(false)} className="fixed inset-0 z-50 bg-background/90 backdrop-blur-xl flex items-center justify-center p-8">
            <motion.img initial={{ scale: 0.5 }} animate={{ scale: 1 }} exit={{ scale: 0.5 }} src={receiverProfile.avatar_url} alt="" className="max-w-full max-h-full rounded-2xl object-contain shadow-2xl" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SendMessagePage;
