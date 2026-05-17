import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Bell, X, Share, Plus } from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { toast } from "sonner";

const STORAGE_KEY = "install-banner-dismissed-v1";

const InstallBanner = () => {
  const { canInstall, install } = usePWAInstall();
  const { supported, permission, isSubscribed, subscribe } = usePushNotifications();
  const [dismissed, setDismissed] = useState(true);
  const [showIosHelp, setShowIosHelp] = useState(false);

  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true;

  useEffect(() => {
    const isDismissed = localStorage.getItem(STORAGE_KEY) === "1";
    setDismissed(isDismissed);
  }, []);

  const needsInstall = !isStandalone && (canInstall || isIos);
  const needsPush = supported && permission !== "granted" && !isSubscribed;
  const show = !dismissed && (needsInstall || needsPush);

  if (!show) return null;

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setDismissed(true);
  };

  const handleInstall = async () => {
    if (isIos) {
      setShowIosHelp(true);
      return;
    }
    await install();
  };

  const handleEnablePush = async () => {
    const ok = await subscribe();
    if (ok) toast.success("تم تفعيل الإشعارات 🔔");
    else toast.error("لم يتم تفعيل الإشعارات");
  };

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="sticky top-0 z-30 mx-3 mt-2 mb-1"
        >
          <div className="glass-card rounded-2xl p-3 flex items-center gap-2.5 shadow-[0_4px_20px_hsl(var(--primary)/0.15)] border-primary/30">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
              {needsInstall ? <Download size={16} className="text-primary-foreground" /> : <Bell size={16} className="text-primary-foreground" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-cairo font-bold text-foreground leading-tight">
                {needsInstall ? "ثبّت مستخبي على جهازك" : "فعّل الإشعارات"}
              </p>
              <p className="text-[10px] font-cairo text-muted-foreground leading-tight mt-0.5">
                {needsInstall ? "وصول أسرع وإشعارات في الخلفية" : "اعرف فورًا لما توصلك رسالة"}
              </p>
            </div>
            <button
              onClick={needsInstall ? handleInstall : handleEnablePush}
              className="px-3 py-1.5 rounded-xl gradient-primary text-primary-foreground text-xs font-cairo font-bold flex-shrink-0 active:scale-95 transition-transform"
            >
              {needsInstall ? "تثبيت" : "تفعيل"}
            </button>
            <button onClick={handleDismiss} className="p-1 text-muted-foreground active:scale-90">
              <X size={14} />
            </button>
          </div>
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {showIosHelp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 backdrop-blur-sm"
            onClick={() => setShowIosHelp(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-lg glass-card rounded-t-3xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1 rounded-full bg-border/50 mx-auto" />
              <h3 className="text-center font-cairo font-bold text-lg">ثبّت التطبيق على آيفون</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-xl">
                  <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center text-primary-foreground font-bold">١</div>
                  <p className="text-sm font-cairo flex-1">اضغط على زر المشاركة</p>
                  <Share size={20} className="text-primary" />
                </div>
                <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-xl">
                  <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center text-primary-foreground font-bold">٢</div>
                  <p className="text-sm font-cairo flex-1">اختر "إضافة إلى الشاشة الرئيسية"</p>
                  <Plus size={20} className="text-primary" />
                </div>
              </div>
              <button onClick={() => setShowIosHelp(false)} className="w-full py-3 rounded-xl gradient-primary text-primary-foreground font-cairo font-bold">
                تمام
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default InstallBanner;
