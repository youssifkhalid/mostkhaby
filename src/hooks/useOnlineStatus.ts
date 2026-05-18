// src/hooks/useOnlineStatus.ts
/**
 * ═══════════════════════════════════════════════════════════════
 * useOnlineStatus — نظام الـ Online احترافي مثل واتساب/تليجرام
 * ═══════════════════════════════════════════════════════════════
 *
 * الإصلاحات:
 * ──────────
 * 1. Anti-fake-online: is_online=true يُضبط فقط بعد SUBSCRIBED confirmation
 * 2. sendBeacon للـ offline عند إغلاق الصفحة (موثوق على موبايل)
 * 3. Heartbeat كل 20 ثانية (أسرع last_seen updates)
 * 4. Throttle ذكي: لا DB calls مكررة في أقل من 5 ثواني
 * 5. visibilitychange مع force update فوري
 * 6. Cleanup صحيح: untrack + offline + removeChannel
 */

import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

const HEARTBEAT_INTERVAL = 20_000;  // 20s
const THROTTLE_MS = 5_000;          // 5s min between same-status updates

export const useOnlineStatus = () => {
  const { user } = useAuth();
  const lastUpdate = useRef(0);
  const currentOnline = useRef<boolean | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    // ── DB update ─────────────────────────────────────────────────
    const setOnlineDb = async (online: boolean, force = false) => {
      const now = Date.now();
      // Throttle: نفس الحالة ما تتكرر في أقل من THROTTLE_MS إلا لو force
      if (
        !force &&
        online === currentOnline.current &&
        now - lastUpdate.current < THROTTLE_MS
      ) return;

      currentOnline.current = online;
      lastUpdate.current = now;

      try {
        await supabase
          .from("profiles")
          .update({
            is_online: online,
            last_seen: new Date().toISOString(),
          })
          .eq("id", user.id);
      } catch (err) {
        console.warn("[useOnlineStatus] DB update failed:", err);
      }
    };

    // ── Beacon للـ offline عند إغلاق الصفحة ──────────────────────
    // sendBeacon أكثر موثوقية من fetch+keepalive على موبايل
    const sendOfflineBeacon = () => {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const apiKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
      if (!supabaseUrl || !apiKey) return;

      const url = `${supabaseUrl}/rest/v1/profiles?id=eq.${user.id}`;
      const body = JSON.stringify({
        is_online: false,
        last_seen: new Date().toISOString(),
      });

      // محاولة sendBeacon أولاً (لا يدعم custom headers — نستخدم fetch+keepalive)
      try {
        fetch(url, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            apikey: apiKey,
            Authorization: `Bearer ${apiKey}`,
            Prefer: "return=minimal",
          },
          body,
          keepalive: true, // ✅ يضمن إرسال الطلب حتى بعد إغلاق الصفحة
        }).catch(() => {});
      } catch { /* best-effort */ }
    };

    // ── Presence Channel ─────────────────────────────────────────
    const channel = supabase.channel("global-presence", {
      config: {
        presence: { key: user.id },
      },
    });
    channelRef.current = channel;

    // ✅ كل .on() قبل .subscribe() — لا إضافة بعده
    channel
      .on("presence", { event: "sync" }, () => { /* no-op */ })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          // ✅ Anti-fake: نشغّل track أولاً ثم نكتب للـ DB
          await channel.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
          });
          setOnlineDb(true, true); // force=true: تجاوز throttle عند الاتصال الأولي
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn("[useOnlineStatus] Presence channel error:", status);
          // لا نضع offline هنا — reconnect سيشتغل تلقائياً
        }
      });

    // ── Heartbeat ────────────────────────────────────────────────
    intervalRef.current = setInterval(() => {
      if (!document.hidden) {
        setOnlineDb(true);
        // نحدّث presence track كذلك
        channelRef.current?.track({
          user_id: user.id,
          online_at: new Date().toISOString(),
        });
      }
    }, HEARTBEAT_INTERVAL);

    // ── Visibility Change ────────────────────────────────────────
    const handleVisibility = () => {
      if (document.hidden) {
        setOnlineDb(false, true);
        channelRef.current?.untrack();
      } else {
        channelRef.current?.track({
          user_id: user.id,
          online_at: new Date().toISOString(),
        });
        setOnlineDb(true, true);
      }
    };

    // ── Window Focus ─────────────────────────────────────────────
    const handleFocus = () => {
      channelRef.current?.track({
        user_id: user.id,
        online_at: new Date().toISOString(),
      });
      setOnlineDb(true);
    };

    // ── Page Unload ──────────────────────────────────────────────
    const handleUnload = () => {
      sendOfflineBeacon();
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("beforeunload", handleUnload);
    window.addEventListener("pagehide", handleUnload);

    // ── Cleanup ──────────────────────────────────────────────────
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);

      // untrack presence + DB offline
      channelRef.current?.untrack();
      supabase.removeChannel(channelRef.current!);
      channelRef.current = null;

      setOnlineDb(false, true);

      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("beforeunload", handleUnload);
      window.removeEventListener("pagehide", handleUnload);
    };
  }, [user?.id]);

  // ── Mark delivered on app open ────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("chat_messages")
      .update({ status: "delivered" })
      .eq("status", "sent")
      .neq("sender_id", user.id)
      .then(({ error }) => {
        if (error) {
          console.warn("[useOnlineStatus] delivered update failed:", error.message);
        }
      });
  }, [user?.id]);
};
