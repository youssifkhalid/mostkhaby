// src/integrations/supabase/client.ts

import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

import type { Database } from "./types";

/* ════════════════════════════════════════════════════════════════
   ENV
════════════════════════════════════════════════════════════════ */

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL;

const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY;

/* ════════════════════════════════════════════════════════════════
   ENV VALIDATION
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
   CLIENT OPTIONS
════════════════════════════════════════════════════════════════ */

const clientOptions = {
  db: {
    schema: "public",
  },

  auth: {
    storage,

    persistSession: true,

    autoRefreshToken: true,

    detectSessionInUrl: true,

    flowType: "pkce" as const,

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
      "x-client-info": "mostkhaby-web",
      "x-app-version": "1.0.0",
    },
  },
};

/* ════════════════════════════════════════════════════════════════
   CREATE CLIENT
════════════════════════════════════════════════════════════════ */

export const supabase: SupabaseClient<Database> =
  createClient<Database>(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    clientOptions
  );

/* ════════════════════════════════════════════════════════════════
   SESSION RECOVERY
════════════════════════════════════════════════════════════════ */

async function restoreSession() {
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

      await clearBrokenSession();

      return null;
    }

    if (!session) {
      console.log(
        "[Supabase] Anonymous mode enabled"
      );

      return null;
    }

    console.log(
      "[Supabase] Session restored:",
      session.user.id
    );

    return session;
  } catch (error) {
    console.error(
      "[Supabase Fatal Session Error]",
      error
    );

    await clearBrokenSession();

    return null;
  }
}

/* ════════════════════════════════════════════════════════════════
   CLEAR BROKEN SESSION
════════════════════════════════════════════════════════════════ */

async function clearBrokenSession() {
  try {
    await supabase.auth.signOut();

    if (typeof window !== "undefined") {
      const keys = Object.keys(localStorage);

      keys.forEach((key) => {
        if (
          key.includes("supabase") ||
          key.includes("sb-")
        ) {
          localStorage.removeItem(key);
        }
      });
    }

    console.log(
      "[Supabase] Broken session cleared"
    );
  } catch (error) {
    console.error(
      "[Supabase Clear Session Error]",
      error
    );
  }
}

/* ════════════════════════════════════════════════════════════════
   AUTH STATE LISTENER
════════════════════════════════════════════════════════════════ */

supabase.auth.onAuthStateChange(
  async (event, session) => {
    console.log(
      "[Supabase Auth Event]",
      event
    );

    switch (event) {
      case "SIGNED_IN":
        console.log(
          "[Supabase] User signed in:",
          session?.user?.id
        );
        break;

      case "SIGNED_OUT":
        console.log(
          "[Supabase] User signed out"
        );
        break;

      case "TOKEN_REFRESHED":
        console.log(
          "[Supabase] Token refreshed"
        );
        break;

      case "USER_UPDATED":
        console.log(
          "[Supabase] User updated"
        );
        break;

      default:
        break;
    }
  }
);

/* ════════════════════════════════════════════════════════════════
   REALTIME TEST
════════════════════════════════════════════════════════════════ */

const realtimeChannel = supabase.channel(
  "system-health-check",
  {
    config: {
      broadcast: {
        ack: false,
      },

      presence: {
        key: "system",
      },
    },
  }
);

realtimeChannel.subscribe((status) => {
  console.log(
    "[Realtime Status]",
    status
  );
});

/* ════════════════════════════════════════════════════════════════
   NETWORK STATUS
════════════════════════════════════════════════════════════════ */

if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    console.log(
      "[Network] Internet connection restored"
    );
  });

  window.addEventListener("offline", () => {
    console.log(
      "[Network] Internet connection lost"
    );
  });
}

/* ════════════════════════════════════════════════════════════════
   INITIALIZE
════════════════════════════════════════════════════════════════ */

restoreSession();

/* ════════════════════════════════════════════════════════════════
   DEBUG
════════════════════════════════════════════════════════════════ */

console.log(
  "[Supabase Initialized]",
  SUPABASE_URL
);

console.log(
  "[Supabase Anon Key Loaded]",
  !!SUPABASE_ANON_KEY
);

console.log(
  "[Supabase Storage Enabled]",
  !!storage
);

console.log(
  "[Supabase Realtime Enabled]"
);

/* ════════════════════════════════════════════════════════════════
   EXPORTS
════════════════════════════════════════════════════════════════ */

export default supabase;
