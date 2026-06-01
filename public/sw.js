// public/sw.js — Mostkhaby Service Worker (v2)
//
// Smart push handling:
//  • Reads active chat state from IndexedDB written by the client (swBridge.ts)
//  • Suppresses push if the user is currently focused on the same chat
//  • Groups notifications per chat via `tag: chat-<chatId>` (auto-collapse on Android/Desktop)
//  • Click → focus existing client or open /chat/<chatId>
//  • Optional "Mark read" action via postMessage to the focused client
//
// IMPORTANT: this SW is INTENTIONALLY NOT caching app shell —
// live deploys need fresh HTML on every navigation. We only handle push.

const SW_VERSION = "mostkhaby-v2";
const DB_NAME = "mostkhaby-sw";
const STORE = "state";
const KEY = "active";

// ── Lifecycle ───────────────────────────────────────────────
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// No fetch interception — let the network/proxy handle it.
// (Previous version did network-first; that broke HMR in some cases.)

// ── IndexedDB helper to read active state ────────────────────
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function readActiveState() {
  try {
    const db = await openDB();
    const state = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return state;
  } catch {
    return null;
  }
}

async function anyClientFocused() {
  const list = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  return list.some((c) => c.focused === true && c.visibilityState === "visible");
}

// ── In-memory state mirror (updated via postMessage from client) ──
let memState = { activeChatId: null, isAppActive: false, updatedAt: 0 };

self.addEventListener("message", (event) => {
  const data = event.data;
  if (data?.type === "ACTIVE_STATE" && data.state) {
    memState = data.state;
  }
});

// ── Push ────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  event.waitUntil(handlePush(event));
});

async function handlePush(event) {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "إشعار جديد", body: event.data ? event.data.text() : "" };
  }

  const {
    title = "رسالة جديدة",
    body = "",
    chatId,
    msgId,
    url,
    icon,
    badge,
    type,
    silent: silentFlag,
  } = payload;

  // ── Smart suppression for chat messages ────────────────────
  if (type === "chat_message" && chatId) {
    // Use in-memory first (fresher), then fallback to IDB
    let state = memState;
    if (!state.updatedAt || Date.now() - state.updatedAt > 30_000) {
      const fromDb = await readActiveState();
      if (fromDb) state = fromDb;
    }

    const focused = await anyClientFocused();
    const sameChat = state.activeChatId === chatId;

    if (focused && sameChat && state.isAppActive) {
      // User is staring at this chat — don't show OS notification.
      // Just tell the client to play a tiny tick if it wants to.
      const list = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      list.forEach((c) =>
        c.postMessage({ type: "PUSH_SUPPRESSED", chatId, msgId })
      );
      return;
    }
  }

  const notificationOptions = {
    body,
    icon: icon || "/logo-icon.png",
    badge: badge || "/logo-icon.png",
    image: payload.image,
    tag: chatId ? `chat-${chatId}` : msgId || "general",
    renotify: false,
    requireInteraction: false,
    silent: !!silentFlag,
    vibrate: silentFlag ? [] : [80, 40, 80],
    timestamp: payload.timestamp || Date.now(),
    data: { chatId, msgId, url: url || (chatId ? `/chat/${chatId}` : "/") },
    actions: chatId
      ? [
          { action: "open", title: "فتح" },
          { action: "mark-read", title: "تحديد كمقروء" },
        ]
      : [],
  };

  await self.registration.showNotification(title, notificationOptions);

  // Update app badge if supported
  try {
    if ("setAppBadge" in self.navigator) {
      // We don't know exact count here — just bump by 1; client owns the truth.
      self.navigator.setAppBadge?.(1).catch(() => {});
    }
  } catch {}
}

// ── Notification click ──────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const action = event.action;
  const { chatId, msgId, url } = event.notification.data || {};

  if (action === "mark-read" && chatId) {
    // Tell any open client to mark the chat as read; if none, swallow.
    event.waitUntil(
      (async () => {
        const list = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
        list.forEach((c) => c.postMessage({ type: "MARK_CHAT_READ", chatId }));
      })()
    );
    return;
  }

  const targetUrl = url || (chatId ? `/chat/${chatId}` : "/");

  event.waitUntil(
    (async () => {
      const list = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      // Try to focus an existing tab
      for (const c of list) {
        try {
          if ("focus" in c) {
            await c.focus();
            c.postMessage({ type: "NAVIGATE", url: targetUrl, chatId, msgId });
            return;
          }
        } catch {}
      }
      // No tab open → open a new one
      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }
    })()
  );
});

self.addEventListener("notificationclose", () => {
  /* analytics hook (no-op) */
});
