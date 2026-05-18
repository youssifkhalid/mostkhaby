// src/integrations/supabase/client.ts
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error(
    "[Supabase] VITE_SUPABASE_URL أو VITE_SUPABASE_PUBLISHABLE_KEY غير محدد في ملف .env"
  );
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: typeof window !== "undefined" ? localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 20,          // ✅ منع flood
    },
    heartbeatIntervalMs: 25000,      // ✅ heartbeat كل 25 ثانية
    reconnectAfterMs: (tries) =>     // ✅ exponential backoff عند انقطاع
      Math.min(1000 * Math.pow(2, tries), 30000),
    timeout: 20000,
  },
  db: {
    schema: "public",
  },
  global: {
    headers: {
      "x-app-version": "1.0.0",
    },
  },
});
