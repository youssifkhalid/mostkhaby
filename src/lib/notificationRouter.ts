/**
 * notificationRouter
 * ──────────────────
 * Singleton (module-scope) that gates EVERY incoming chat-message event
 * before it becomes a toast, sound, vibration, or push.
 *
 * Rules:
 *  1. message.chat_id === activeChatId AND app is active → silent
 *  2. app active but DIFFERENT chat → in-app preview + soft sound (rate-limited)
 *  3. app inactive → no in-app UI (the SW push handler takes over)
 *  4. burst-collapse: N msgs from same chat within 4s → 1 grouped preview
 *  5. global rate limit: 1 sound / 1500ms
 *  6. dedup by msg id (FIFO Set, cap 500)
 */

import { playNotificationSound, vibrate } from "@/lib/notificationSounds";

type Listener = (preview: IncomingPreview | null) => void;

export interface IncomingPreview {
  chatId: string;
  msgId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string | null;
  content: string;
  count: number; // how many collapsed
  createdAt: number;
}

interface RouterState {
  activeChatId: string | null;
  isAppActive: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  soundName: string;
  soundVolume: number;
}

const state: RouterState = {
  activeChatId: null,
  isAppActive: true,
  soundEnabled: true,
  vibrationEnabled: true,
  soundName: "default",
  soundVolume: 80,
};

const seenIds: string[] = [];
const SEEN_CAP = 500;
function markSeen(id: string): boolean {
  if (seenIds.includes(id)) return false;
  seenIds.push(id);
  if (seenIds.length > SEEN_CAP) seenIds.shift();
  return true;
}

let lastSoundAt = 0;
const SOUND_COOLDOWN = 1500;

const listeners = new Set<Listener>();
function emit(preview: IncomingPreview | null) {
  for (const l of listeners) {
    try { l(preview); } catch { }
  }
}

// Burst collapsing per chat
const bursts = new Map<string, { timer: number; preview: IncomingPreview }>();
const BURST_WINDOW = 4000;

function flushBurst(chatId: string) {
  const b = bursts.get(chatId);
  if (!b) return;
  bursts.delete(chatId);
  emit(b.preview);
  maybeSound();
}

function maybeSound() {
  const now = Date.now();
  if (now - lastSoundAt < SOUND_COOLDOWN) return;
  lastSoundAt = now;
  if (state.soundEnabled) {
    try { playNotificationSound(state.soundName as any, state.soundVolume); } catch { }
  }
  if (state.vibrationEnabled) {
    try { vibrate([60, 40, 60]); } catch { }
  }
}

export const notificationRouter = {
  setActive(activeChatId: string | null, isAppActive: boolean) {
    state.activeChatId = activeChatId;
    state.isAppActive = isAppActive;
  },
  setSettings(s: Partial<Pick<RouterState, "soundEnabled" | "vibrationEnabled" | "soundName" | "soundVolume">>) {
    Object.assign(state, s);
  },
  subscribe(l: Listener) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  dismiss() {
    emit(null);
  },
  /**
   * Main entry — call this from every realtime "INSERT chat_messages" handler.
   * Returns `true` if the message should be considered "consumed silently"
   * (i.e. caller should mark-as-read), `false` if it surfaced a preview.
   */
  ingest(msg: {
    id: string;
    chat_id: string;
    sender_id: string;
    content: string;
    created_at?: string;
    sender_name?: string;
    sender_avatar?: string | null;
  }): "silent" | "previewed" | "dropped" {
    if (!markSeen(msg.id)) return "dropped";

    // Rule 1: same chat + app active → silent
    if (state.isAppActive && state.activeChatId === msg.chat_id) {
      return "silent";
    }

    // Rule 3: app inactive → SW handles push, no in-app UI
    if (!state.isAppActive) return "dropped";

    // Rule 2 + 4: in-app, different chat → debounced preview
    const existing = bursts.get(msg.chat_id);
    if (existing) {
      window.clearTimeout(existing.timer);
      existing.preview = {
        ...existing.preview,
        msgId: msg.id,
        content: msg.content,
        count: existing.preview.count + 1,
        createdAt: Date.now(),
      };
      existing.timer = window.setTimeout(() => flushBurst(msg.chat_id), BURST_WINDOW);
    } else {
      const preview: IncomingPreview = {
        chatId: msg.chat_id,
        msgId: msg.id,
        senderId: msg.sender_id,
        senderName: msg.sender_name || "رسالة جديدة",
        senderAvatar: msg.sender_avatar ?? null,
        content: msg.content || "",
        count: 1,
        createdAt: Date.now(),
      };
      // First message of a burst: show immediately, then keep window open
      emit(preview);
      maybeSound();
      const timer = window.setTimeout(() => flushBurst(msg.chat_id), BURST_WINDOW);
      bursts.set(msg.chat_id, { timer, preview });
    }
    return "previewed";
  },
};
