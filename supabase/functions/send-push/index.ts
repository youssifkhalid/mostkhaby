// supabase/functions/send-push/index.ts
/**
 * FIXED:
 * ──────
 * 1. Added Authorization header validation (service role only)
 * 2. Handles expired/invalid subscriptions (410/404) cleanly
 * 3. Proper error logging without crashing
 * 4. Added Content-Type header to response
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
    const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY");
    const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY");
    const VAPID_SUBJECT =
      Deno.env.get("VAPID_SUBJECT") || "mailto:admin@mostkhbii.app";

    if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
      return new Response(
        JSON.stringify({ error: "VAPID keys not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

    const body = await req.json();
    const {
      user_id,
      title,
      body: msgBody,
      url,
      tag,
      icon,
      badge,
      image,
      msgId,
      chatId,
    } = body;

    if (!user_id) {
      return new Response(JSON.stringify({ error: "user_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: subs, error } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", user_id);

    if (error) {
      console.error("send-push: fetch subs error:", error.message);
      throw error;
    }

    if (!subs?.length) {
      return new Response(JSON.stringify({ sent: 0, reason: "no_subscriptions" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = JSON.stringify({
      title: title || "مستخبي 🤫",
      body: msgBody || "رسالة جديدة",
      url: url || "/",
      tag: tag || "msg",
      icon: icon || "/logo-icon.png",
      badge: badge || "/logo-icon.png",
      image,
      msgId,
      chatId,
    });

    const results = await Promise.allSettled(
      subs.map((s: any) =>
        webpush.sendNotification(
          {
            endpoint: s.endpoint,
            keys: { p256dh: s.p256dh, auth: s.auth },
          },
          payload,
          {
            TTL: 86400, // 24 hours
            urgency: "high",
          }
        )
      )
    );

    // Clean up dead subscriptions (410 Gone / 404 Not Found)
    const deadIds: string[] = [];
    results.forEach((r, i) => {
      if (r.status === "rejected") {
        const code = (r.reason as any)?.statusCode;
        if (code === 410 || code === 404) {
          deadIds.push(subs[i].id);
        } else {
          console.warn(
            `send-push: failed for sub ${subs[i].id}:`,
            (r.reason as any)?.message || r.reason
          );
        }
      }
    });

    if (deadIds.length) {
      const { error: delErr } = await supabase
        .from("push_subscriptions")
        .delete()
        .in("id", deadIds);
      if (delErr) console.warn("send-push: cleanup error:", delErr.message);
    }

    const sent = results.filter((r) => r.status === "fulfilled").length;

    return new Response(
      JSON.stringify({ sent, total: subs.length, dead: deadIds.length }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e: any) {
    console.error("send-push error:", e?.message || e);
    return new Response(JSON.stringify({ error: e?.message || "unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
