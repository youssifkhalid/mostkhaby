import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

/**
 * Real online tracking using Supabase Presence + DB sync.
 * - Joins a global presence channel and tracks the current user.
 * - Updates profiles.is_online / last_seen on join, leave, visibility change.
 * - Sends a sendBeacon-style offline mark on tab close as a fallback.
 */
export const useOnlineStatus = () => {
  const { user } = useAuth();
  const lastUpdate = useRef(0);
  const currentOnline = useRef<boolean | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const setOnlineDb = async (online: boolean) => {
      const now = Date.now();
      // Throttle identical state updates to once per 8s, but always allow state changes
      if (online === currentOnline.current && now - lastUpdate.current < 8000) return;
      currentOnline.current = online;
      lastUpdate.current = now;
      await supabase
        .from("profiles")
        .update({ is_online: online, last_seen: new Date().toISOString() })
        .eq("id", user.id);
    };

    // Mark online immediately
    setOnlineDb(true);

    // Presence channel (global)
    const channel = supabase.channel("global-presence", {
      config: { presence: { key: user.id } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        // no-op: presence state available via channel.presenceState()
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ user_id: user.id, online_at: new Date().toISOString() });
          setOnlineDb(true);
        }
      });

    // Heartbeat as a safety net (every 30s)
    const interval = setInterval(() => setOnlineDb(true), 30000);

    const handleVisibility = () => {
      if (document.hidden) {
        setOnlineDb(false);
        channel.untrack();
      } else {
        setOnlineDb(true);
        channel.track({ user_id: user.id, online_at: new Date().toISOString() });
      }
    };

    const handleFocus = () => {
      setOnlineDb(true);
      channel.track({ user_id: user.id, online_at: new Date().toISOString() });
    };

    const handleBlur = () => {
      // Don't mark offline on blur alone (user may switch windows briefly)
    };

    const handleBeforeUnload = () => {
      // Best-effort sync offline mark
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}`;
        const blob = new Blob(
          [JSON.stringify({ is_online: false, last_seen: new Date().toISOString() })],
          { type: "application/json" }
        );
        // Note: PATCH via sendBeacon is not standard; fall back to fetch with keepalive
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
      } catch {}
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

  // Mark unread chat messages as delivered on app open
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("chat_messages")
      .update({ status: "delivered" })
      .eq("status", "sent")
      .neq("sender_id", user.id)
      .then(() => {});
  }, [user?.id]);
};
