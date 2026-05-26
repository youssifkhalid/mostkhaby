/**
 * FloatingNotification — in-app preview card (top, swipe-to-dismiss).
 * Shown ONLY when notificationRouter decides to surface a preview
 * (i.e. user is in-app but NOT in the same chat).
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { notificationRouter, type IncomingPreview } from "@/lib/notificationRouter";
import UserAvatar from "@/components/UserAvatar";
import { MessageCircle } from "lucide-react";

const AUTO_HIDE_MS = 4500;

export default function FloatingNotification() {
  const [preview, setPreview] = useState<IncomingPreview | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let hideTimer: number | undefined;
    const unsub = notificationRouter.subscribe((p) => {
      if (hideTimer) window.clearTimeout(hideTimer);
      setPreview(p);
      if (p) {
        hideTimer = window.setTimeout(() => setPreview(null), AUTO_HIDE_MS);
      }
    });
    return () => {
      unsub();
      if (hideTimer) window.clearTimeout(hideTimer);
    };
  }, []);

  const handleOpen = () => {
    if (!preview) return;
    navigate(`/chat/${preview.chatId}`);
    setPreview(null);
  };

  return (
    <AnimatePresence>
      {preview && (
        <motion.div
          key={preview.msgId}
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          drag="y"
          dragConstraints={{ top: -80, bottom: 0 }}
          dragElastic={0.3}
          onDragEnd={(_, info) => {
            if (info.offset.y < -30) setPreview(null);
          }}
          className="fixed top-3 left-1/2 -translate-x-1/2 z-[60] w-[min(420px,calc(100vw-1.5rem))]"
        >
          <button
            type="button"
            onClick={handleOpen}
            className="w-full text-right flex items-center gap-3 rounded-2xl px-3 py-2.5 border border-border/40 shadow-2xl"
            style={{
              background: "hsl(var(--background) / 0.92)",
              backdropFilter: "blur(20px) saturate(1.4)",
              WebkitBackdropFilter: "blur(20px) saturate(1.4)",
              boxShadow: "0 12px 40px -8px hsl(0 0% 0% / 0.45)",
            }}
          >
            <div className="shrink-0">
              <UserAvatar
                url={preview.senderAvatar || undefined}
                name={preview.senderName}
                size="sm"
              />
            </div>
            <div className="flex-1 min-w-0 text-right">
              <div className="flex items-center justify-between gap-2">
                <span className="font-cairo font-bold text-[13px] text-foreground truncate">
                  {preview.senderName}
                </span>
                <MessageCircle size={14} className="text-primary shrink-0" />
              </div>
              <div className="font-cairo text-[12px] text-muted-foreground truncate">
                {preview.count > 1
                  ? `${preview.count} رسائل جديدة`
                  : preview.content || "رسالة جديدة"}
              </div>
            </div>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
