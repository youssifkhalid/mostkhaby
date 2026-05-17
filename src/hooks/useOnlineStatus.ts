import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

/**
 * تتبع حالة الاتصال الحقيقية عن طريق Supabase Presence + DB sync.
 * - بتنضم لـ presence channel وتتابع اليوزر الحالي.
 * - بتحدث profiles.is_online / last_seen عند الدخول والخروج وتغيير الـ visibility.
 * - بترسل تحديث offline عند إغلاق التاب كـ fallback.
 *
 * ✅ كل عمليات الكتابة على الداتابيز محاطة بـ try/catch
 *    عشان لو العمود مش موجود لأي سبب، التطبيق ما يكرشش.
 */
export const useOnlineStatus = () => {
  const { user } = useAuth();
  const lastUpdate = useRef(0);
  const currentOnline = useRef<boolean | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const setOnlineDb = async (online: boolean) => {
      const now = Date.now();
      // Throttle: نفس الحالة ما تتبعت أكثر من مرة كل 8 ثواني
      if (online === currentOnline.current && now - lastUpdate.current < 8000)
        return;
      currentOnline.current = online;
      lastUpdate.current = now;

      // ✅ try/catch: لو العمود is_online مش موجود لأي سبب، التطبيق يكمل
      try {
        await supabase
          .from("profiles")
          .update({ is_online: online, last_seen: new Date().toISOString() })
          .eq("id", user.id);
      } catch (err) {
        console.warn("[useOnlineStatus] تعذّر تحديث الحالة:", err);
      }
    };

    // سجّل كـ online فورًا
    setOnlineDb(true);

    // Presence channel (global)
    const channel = supabase.channel("global-presence", {
      config: { presence: { key: user.id } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        // no-op
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
          });
          setOnlineDb(true);
        }
      });

    // Heartbeat كل 30 ثانية كـ safety net
    const interval = setInterval(() => setOnlineDb(true), 30000);

    const handleVisibility = () => {
      if (document.hidden) {
        setOnlineDb(false);
        channel.untrack();
      } else {
        setOnlineDb(true);
        channel.track({
          user_id: user.id,
          online_at: new Date().toISOString(),
        });
      }
    };

    const handleFocus = () => {
      setOnlineDb(true);
      channel.track({
        user_id: user.id,
        online_at: new Date().toISOString(),
      });
    };

    const handleBlur = () => {
      // ما نعمل offline على blur لوحده — اليوزر ممكن يكون بدّل نافذة بس
    };

    const handleBeforeUnload = () => {
      // ✅ try/catch هنا كمان
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}`;
        const blob = new Blob(
          [
            JSON.stringify({
              is_online: false,
              last_seen: new Date().toISOString(),
            }),
          ],
          { type: "application/json" }
        );
        fetch(url, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            Prefer: "return=minimal",
          },
          body: blob,
          keepalive: true,
        }).catch(() => {});
      } catch {
        // تجاهل أي خطأ — best-effort فقط
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handleBeforeUnload);

    return () => {
      clearInterval(interval);
      channel.untrack();
      supabase.removeChannel(channel);
      setOnlineDb(false);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handleBeforeUnload);
    };
  }, [user?.id]);

  // ✅ تحديث رسائل الشات كـ delivered عند فتح التطبيق
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("chat_messages")
      .update({ status: "delivered" })
      .eq("status", "sent")
      .neq("sender_id", user.id)
      .then(({ error }) => {
        if (error) {
          console.warn("[useOnlineStatus] تعذّر تحديث حالة الرسائل:", error.message);
        }
      });
  }, [user?.id]);
};
