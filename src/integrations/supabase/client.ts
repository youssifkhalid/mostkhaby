// src/integrations/supabase/client.ts

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://example.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "anon-key";

const DEV = import.meta.env.DEV;
const log = (...args: any[]) => { if (DEV) console.log(...args); };

const storage = typeof window !== "undefined" ? window.localStorage : undefined;

export const supabase: any = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  db: { schema: "public" },
  auth: {
    storage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "pkce",
    debug: false,
  },
  realtime: {
    params: { eventsPerSecond: 20 },
    heartbeatIntervalMs: 25000,
    reconnectAfterMs: (tries: number) => Math.min(1000 * Math.pow(2, tries), 30000),
    timeout: 20000,
  },
  global: {
    headers: {
      "x-client-info": "mostkhaby-web",
      "x-app-version": "1.0.0",
    },
  },
});

async function clearBrokenSession() {
  try {
    await supabase.auth.signOut();
    if (typeof window !== "undefined") {
      Object.keys(localStorage).forEach((key) => {
        if (key.includes("supabase") || key.includes("sb-")) {
          localStorage.removeItem(key);
        }
      });
    }
    log("[Supabase] Broken session cleared");
  } catch (error) {
    console.error("[Supabase Clear Session Error]", error);
  }
}

async function restoreSession() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.error("[Supabase Session Error]", error.message);
      await clearBrokenSession();
      return null;
    }
    if (!session) {
      log("[Supabase] Anonymous mode");
      return null;
    }
    log("[Supabase] Session restored:", session.user.id);
    return session;
  } catch (error) {
    console.error("[Supabase Fatal Session Error]", error);
    await clearBrokenSession();
    return null;
  }
}

supabase.auth.onAuthStateChange((event: string, session: any) => {
  log("[Supabase Auth]", event, session?.user?.id ?? "");
});

const realtimeChannel = supabase.channel("system-health-check", {
  config: { broadcast: { ack: false }, presence: { key: "system" } },
});
realtimeChannel.subscribe((status: string) => log("[Realtime]", status));

if (typeof window !== "undefined") {
  window.addEventListener("online", () => log("[Network] online"));
  window.addEventListener("offline", () => log("[Network] offline"));
}

restoreSession();

if (DEV) {
  log("[Supabase Initialized]", SUPABASE_URL);
  log("[Supabase Anon Key Loaded]", !!SUPABASE_ANON_KEY);
}

export default supabase;
