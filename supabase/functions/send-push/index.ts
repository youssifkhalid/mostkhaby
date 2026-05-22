// supabase/functions/send-push/index.ts

/**
 * FINAL FIXED VERSION
 * ─────────────────────
 * - Secure service-role only usage
 * - Better error handling
 * - Clean dead subscriptions (410/404)
 * - High priority push (WhatsApp-like behavior)
 * - Stable payload for chat-only notifications
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import webpush from "https://esm.sh/web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ─────────────────────────────────────
    // 1. ENV CHECK
    // ─────────────────────────────────────
    const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY");
    const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY");
    const VAPID_SUBJECT =
      Deno.env.get("VAPID_SUBJECT") || "mailto:admin@app.local";

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
      return new Response(
        JSON.stringify({ error: "Missing VAPID keys" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

    // ─────────────────────────────────────
    // 2. REQUEST BODY
    // ─────────────────────────────────────
    const body = await req.json();
    const {
      user_id,
      title,
      body: msgBody,
      chatId,
      msgId,
      url,
      icon_url,
    } = body;

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "user_id required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ─────────────────────────────────────
    // 3. SUPABASE CLIENT (SERVICE ROLE ONLY)
    // ─────────────────────────────────────
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // 3a. Server-side suppression: is the recipient currently focused on this chat?
    if (chatId) {
      try {
        const { data: activeFlag } = await supabase.rpc("is_user_active_in_chat", {
          p_user_id: user_id,
          p_chat_id: chatId,
          p_freshness_seconds: 15,
        });
        if (activeFlag === true) {
          await supabase.from("push_delivery_log").insert({
            user_id, chat_id: chatId, msg_id: msgId,
            status: "suppressed", reason: "active_in_chat",
          });
          return new Response(
            JSON.stringify({ sent: 0, suppressed: true, reason: "active_in_chat" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch (e) {
        console.warn("[send-push] presence check failed (continuing):", (e as Error).message);
      }
    }

    // 3b. Mute check (per-chat silent push)
    let muted = false;
    if (chatId) {
      try {
        const { data: muteFlag } = await supabase.rpc("is_chat_muted", {
          p_user_id: user_id,
          p_chat_id: chatId,
        });
        muted = muteFlag === true;
      } catch (e) {
        console.warn("[send-push] mute check failed:", (e as Error).message);
      }
    }

    const { data: subs, error } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", user_id);

    if (error) {
      console.error("DB error:", error);
      throw error;
    }

    if (!subs || subs.length === 0) {
      await supabase.from("push_delivery_log").insert({
        user_id, chat_id: chatId, msg_id: msgId, status: "no_subs",
      });
      return new Response(
        JSON.stringify({ sent: 0, reason: "no_subscriptions" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─────────────────────────────────────
    // 4. PAYLOAD (grouped by chatId)
    // ─────────────────────────────────────
    const payload = JSON.stringify({
      type: "chat_message",
      title: title || "رسالة جديدة 💬",
      body: msgBody || "رسالة جديدة",
      chatId,
      msgId,
      url: url || (chatId ? `/chat/${chatId}` : "/"),
      icon: icon_url || "/logo-icon.png",
      badge: "/logo-icon.png",
      tag: chatId ? `chat-${chatId}` : `msg-${msgId || Date.now()}`,
      silent: muted,
      timestamp: Date.now(),
    });

    // ─────────────────────────────────────
    // 5. SEND PUSH
    // ─────────────────────────────────────
    const results = await Promise.allSettled(
      subs.map((s) =>
        webpush.sendNotification(
          {
            endpoint: s.endpoint,
            keys: { p256dh: s.p256dh, auth: s.auth },
          },
          payload,
          { TTL: 60 * 60 * 24, urgency: muted ? "normal" : "high" }
        )
      )
    );


    // ─────────────────────────────────────
    // 6. CLEAN DEAD SUBSCRIPTIONS
    // ─────────────────────────────────────
    const deadIds: string[] = [];

    results.forEach((r, i) => {
      if (r.status === "rejected") {
        const statusCode = (r.reason as any)?.statusCode;

        if (statusCode === 410 || statusCode === 404) {
          deadIds.push(subs[i].id);
        } else {
          console.warn(
            "Push failed:",
            subs[i].id,
            r.reason?.message || r.reason
          );
        }
      }
    });

    if (deadIds.length > 0) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .in("id", deadIds);
    }

    // ─────────────────────────────────────
    // 7. RESPONSE
    // ─────────────────────────────────────
    const sent = results.filter((r) => r.status === "fulfilled").length;

    return new Response(
      JSON.stringify({
        success: true,
        sent,
        total: subs.length,
        removed: deadIds.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (err: any) {
    console.error("send-push crash:", err);

    return new Response(
      JSON.stringify({
        error: err?.message || "internal_error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
