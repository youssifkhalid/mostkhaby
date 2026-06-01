import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Share2, Copy, Check, Users, Gift, Link2 } from "lucide-react";
import { FaWhatsapp, FaTelegram, FaXTwitter } from "react-icons/fa6";
import { toast } from "sonner";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";

interface InviteSystemProps {
  compact?: boolean;
}

const InviteSystem = ({ compact = false }: InviteSystemProps) => {
  const { profile } = useProfile();
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  const profileUrl = `https://mstkhbi.app/${profile?.username}`;
  const inviteText = `عندي حساب على مستخبي! ابعتلي رسالة سرية من غير ما تعرّفني بنفسك 🔮\n${profileUrl}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      toast.success("تم نسخ الرابط! 🔗");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("مش قادر ينسخ");
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "مستخبي — ابعتلي رسالة سرية",
          text: inviteText,
          url: profileUrl,
        });
      } catch {
        // User cancelled
      }
    } else {
      handleCopy();
    }
  };

  const shareLinks = [
    {
      label: "واتساب",
      icon: FaWhatsapp,
      color: "#25D366",
      href: `https://wa.me/?text=${encodeURIComponent(inviteText)}`,
    },
    {
      label: "تيليجرام",
      icon: FaTelegram,
      color: "#2AABEE",
      href: `https://t.me/share/url?url=${encodeURIComponent(profileUrl)}&text=${encodeURIComponent("ابعتلي رسالة سرية على مستخبي 🔮")}`,
    },
    {
      label: "تويتر",
      icon: FaXTwitter,
      color: "#fff",
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(inviteText)}`,
    },
  ];

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-cairo font-semibold hover:bg-primary/20 transition-colors"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? "تم النسخ" : "نسخ الرابط"}
        </button>
        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 text-accent text-xs font-cairo font-semibold hover:bg-accent/20 transition-colors"
        >
          <Share2 size={12} />
          مشاركة
        </button>
      </div>
    );
  }

  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex items-center gap-2 justify-end">
        <span className="font-cairo font-bold text-base text-foreground">شارك رابطك</span>
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <Link2 size={17} className="text-primary" />
        </div>
      </div>

      {/* URL display */}
      <div className="flex items-center gap-2 bg-secondary/30 rounded-xl p-3 border border-border/20">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleCopy}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-cairo font-bold transition-all flex-shrink-0 ${
            copied ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground hover:text-foreground"
          }`}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? "✓" : "نسخ"}
        </motion.button>
        <p className="text-xs text-muted-foreground font-cairo truncate flex-1 text-left" dir="ltr">
          {profileUrl}
        </p>
      </div>

      {/* Share platforms */}
      <div className="grid grid-cols-3 gap-2">
        {shareLinks.map((link) => (
          <a
            key={link.label}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-1.5 py-3 rounded-xl border border-border/20 hover:border-opacity-50 transition-all"
            style={{ background: `${link.color}10`, borderColor: `${link.color}25` }}
          >
            <link.icon size={20} style={{ color: link.color }} />
            <span className="text-[10px] font-cairo font-semibold text-foreground">{link.label}</span>
          </a>
        ))}
      </div>

      {/* Native share */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={handleShare}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl gradient-primary text-primary-foreground font-cairo font-bold text-sm shadow-[0_4px_16px_hsl(var(--primary)/0.3)]"
      >
        <Share2 size={16} />
        مشاركة الرابط
      </motion.button>

      <div className="flex items-center gap-2 text-center">
        <Gift size={14} className="text-primary flex-shrink-0" />
        <p className="text-[11px] text-muted-foreground font-cairo leading-relaxed">
          شارك رابطك مع أصحابك واستقبل رسائل مجهولة منهم!
        </p>
      </div>
    </div>
  );
};

export default InviteSystem;
