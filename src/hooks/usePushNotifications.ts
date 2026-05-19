// src/hooks/usePushNotifications.ts — FIXED
/**
 * ═══════════════════════════════════════════════════════════════
 * usePushNotifications — نظام Push احترافي
 * ═══════════════════════════════════════════════════════════════
 *
 * الإصلاحات:
 * ──────────
 * 1. ✅ أزلنا localhost من الـ preview check (دع localhost يشتغل)
 * 2. ✅ Pre-check للـ VAPID endpoint — إذا 404 يعطّل Push بصمت كامل
 * 3. ✅ لا console.error spam عند غياب الـ Edge Function
 * 4. ✅ supported يرجع false إذا VAPID غير متاح
 * 5. ✅ AbortSignal.timeout لمنع hanging requests
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

type VapidStatus = "checking" | "available" | "unavailable";

export const usePushNotifications = () => {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [vapidStatus, setVapidStatus] = useState<VapidStatus>("checking");
  const checkedRef = useRef(false);

  const browserSupported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

  // ── Register SW ──────────────────────────────────────────────
  useEffect(() => {
    if (!browserSupported) return;

    // لا تسجّل داخل iframe أو preview environments
    try {
      if (window.self !== window.top) return;
    } catch { return; }

    const hostname = window.location.hostname;
    // ✅ FIX: أزلنا localhost من هنا — دعنا نسمح بـ localhost للـ development
    if (
      hostname.includes("lovableproject.com") ||
      hostname.includes("id-preview--")
    ) {
      setVapidStatus("unavailable");
      return;
    }

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch((e) => console.warn("[Push] SW registration failed:", e));
  }, [browserSupported]);

  // ── VAPID Pre-check ──────────────────────────────────────────
  useEffect(() => {
    if (!browserSupported || !user?.id || checkedRef.current) return;
    checkedRef.current = true;

    const checkVapid = async () => {
      try {
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID as string;
        if (!projectId) {
          setVapidStatus("unavailable");
          return;
        }

        const ctrl = new AbortController();
        const timeout = setTimeout(() => ctrl.abort(), 5000);

        const res = await fetch(
          `https://${projectId}.supabase.co/functions/v1/vapid-public-key`,
          { signal: ctrl.signal }
        ).finally(() => clearTimeout(timeout));

        if (!res.ok) {
          // 404 = Edge Function غير مطلوبة حالياً — صمت كامل
          if (res.status !== 404) {
            console.warn("[Push] VAPID check returned HTTP", res.status);
          }
          setVapidStatus("unavailable");
          return;
        }

        const json = await res.json();
        if (json?.publicKey) {
          setVapidStatus("available");
        } else {
          setVapidStatus("unavailable");
        }
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          console.warn("[Push] VAPID check failed:", e?.message);
        }
        setVapidStatus("unavailable");
      }
    };

    checkVapid();
  }, [browserSupported, user?.id]);

  // ── Check current subscription ───────────────────────────────
  useEffect(() => {
    if (!browserSupported || !user?.id || vapidStatus !== "available") return;
    navigator.serviceWorker.ready
      .then(async (reg) => {
        const sub = await reg.pushManager.getSubscription();
        setIsSubscribed(!!sub);
      })
      .catch(() => {});
  }, [browserSupported, user?.id, vapidStatus]);

  // ── Subscribe ────────────────────────────────────────────────
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!browserSupported || !user?.id || vapidStatus !== "available") {
      return false;
    }

    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") return false;

      const reg = await navigator.serviceWorker.ready;

      // جلب الـ VAPID key
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID as string;
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 5000);
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/vapid-public-key`,
        { signal: ctrl.signal }
      ).finally(() => clearTimeout(timeout));

      if (!res.ok) {
        setVapidStatus("unavailable");
        return false;
      }

      const { publicKey } = await res.json();
      if (!publicKey) {
        return false;
      }

      // Subscribe to push
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      // Save to DB
      const { error } = await supabase
        .from("push_subscriptions")
        .upsert([
          {
            user_id: user.id,
            endpoint: sub.endpoint,
            p256dh: btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array((sub.getKey("p256dh") as ArrayBuffer))))),
            auth: btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array((sub.getKey("auth") as ArrayBuffer))))),
            user_agent: navigator.userAgent,
          },
        ], { onConflict: "endpoint" });

      if (error) {
        console.warn("[Push] Failed to save subscription:", error);
        return false;
      }

      setIsSubscribed(true);
      return true;
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        console.warn("[Push] Subscribe failed:", e?.message);
      }
      return false;
    }
  }, [browserSupported, user?.id, vapidStatus]);

  // ── Unsubscribe ──────────────────────────────────────────────
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!browserSupported || !user?.id) return false;

    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();

      if (!sub) return true;

      const { error } = await supabase
        .from("push_subscriptions")
        .delete()
        .eq("endpoint", sub.endpoint);

      if (error) {
        console.warn("[Push] Failed to remove subscription:", error);
        return false;
      }

      await sub.unsubscribe();
      setIsSubscribed(false);
      return true;
    } catch (e: any) {
      console.warn("[Push] Unsubscribe failed:", e?.message);
      return false;
    }
  }, [browserSupported, user?.id]);

  const supported = browserSupported && vapidStatus === "available";

  return {
    supported,
    isSubscribed,
    permission,
    subscribe,
    unsubscribe,
    vapidStatus,
  };
};

export default usePushNotifications;
