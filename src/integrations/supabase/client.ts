// src/integrations/supabase/client.ts

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/* ════════════════════════════════════════════════════════════════
   ENV VARIABLES
════════════════════════════════════════════════════════════════ */

const SUPABASE_URL: string = import.meta.env.VITE_SUPABASE_URL;

const SUPABASE_ANON_KEY: string =
  import.meta.env.VITE_SUPABASE_ANON_KEY;

/* ════════════════════════════════════════════════════════════════
   VALIDATION
════════════════════════════════════════════════════════════════ */

if (!SUPABASE_URL) {
  throw new Error(
    "[Supabase] VITE_SUPABASE_URL غير موجود داخل .env"
  );
}

if (!SUPABASE_ANON_KEY) {
  throw new Error(
    "[Supabase] VITE_SUPABASE_ANON_KEY غير موجود داخل .env"
  );
}

/* ════════════════════════════════════════════════════════════════
   STORAGE
════════════════════════════════════════════════════════════════ */

const storage =
  typeof window !== "undefined"
    ? window.localStorage
    : undefined;

/* ════════════════════════════════════════════════════════════════
   CLIENT
════════════════════════════════════════════════════════════════ */

export const supabase: SupabaseClient<Database> =
  createClient<Database>(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      db: {
        schema: "public",
      },

      auth: {
        storage,

        persistSession: true,

        autoRefreshToken: true,

        detectSessionInUrl: true,

        flowType: "pkce",

        debug: false,
      },

      realtime: {
        params: {
          eventsPerSecond: 20,
        },

        heartbeatIntervalMs: 25000,

        reconnectAfterMs: (tries: number) => {
          return Math.min(
            1000 * Math.pow(2, tries),
            30000
          );
        },

        timeout: 20000,
      },

      global: {
        headers: {
          "x-app-name": "mostkhaby-app",
          "x-app-version": "1.0.0",
        },
      },
    }
  );

/* ════════════════════════════════════════════════════════════════
   AUTO CLEAN INVALID SESSION
   يمنع مشاكل 401 بسبب session تالفة
════════════════════════════════════════════════════════════════ */

(async () => {
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.error(
        "[Supabase Session Error]",
        error.message
      );

      await supabase.auth.signOut();

      if (typeof window !== "undefined") {
        localStorage.removeItem("supabase.auth.token");
      }

      return;
    }

    if (!session) {
      console.log(
        "[Supabase] مستخدم غير مسجل — وضع anonymous"
      );

      return;
    }

    console.log(
      "[Supabase] Session restored:",
      session.user.id
    );
  } catch (err) {
    console.error(
      "[Supabase Fatal Session Error]",
      err
    );
  }
})();

/* ════════════════════════════════════════════════════════════════
   REALTIME CONNECTION LOGGER
════════════════════════════════════════════════════════════════ */

if (typeof window !== "undefined") {
  supabase.realtime.onOpen(() => {
    console.log("[Realtime] Connected");
  });

  supabase.realtime.onClose(() => {
    console.log("[Realtime] Disconnected");
  });

  supabase.realtime.onError((error) => {
    console.error("[Realtime Error]", error);
  });
}

/* ════════════════════════════════════════════════════════════════
   DEBUG
════════════════════════════════════════════════════════════════ */

console.log(
  "[Supabase Initialized]",
  SUPABASE_URL
);

console.log(
  "[Anon Key Loaded]",
  !!SUPABASE_ANON_KEY
);

export default supabase;
