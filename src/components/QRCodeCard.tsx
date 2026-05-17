import { QRCodeSVG } from "qrcode.react";
import { motion } from "framer-motion";
import { Download, Share2 } from "lucide-react";
import { toast } from "sonner";

const QRCodeCard = ({ url, username }: { url: string; username: string }) => {
  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: "مستخبي", text: `ابعتلي رسالة سرية!`, url });
    } else {
      navigator.clipboard.writeText(url);
      toast.success("تم نسخ الرابط! 🔗");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-card p-5 text-center space-y-4"
    >
      <h3 className="font-cairo font-bold text-foreground">كود QR بتاعك</h3>
      <div className="bg-white rounded-2xl p-4 inline-block mx-auto">
        <QRCodeSVG
          value={url}
          size={160}
          bgColor="#ffffff"
          fgColor="#0f0d23"
          level="M"
          style={{ borderRadius: 8 }}
        />
      </div>
      <p className="text-xs text-muted-foreground font-cairo">@{username}</p>
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={handleShare}
        className="btn-primary w-full flex items-center justify-center gap-2 font-cairo text-sm"
      >
        <Share2 size={16} />
        شارك الكود
      </motion.button>
    </motion.div>
  );
};

export default QRCodeCard;
