// public/sw.js — UPDATED SERVICE WORKER

/**
 * ═══════════════════════════════════════════════════════════════
 * Service Worker — Push Notifications Handler
 * ═══════════════════════════════════════════════════════════════
 *
 * الوظائف:
 * ────────
 * 1. استقبال push notifications من الخادم
 * 2. عرض الإشعارات حتى لو التطبيق مغلق
 * 3. معالجة النقرات على الإشعارات
 * 4. التعامل مع notification actions (open, dismiss, etc)
 */

const CACHE_NAME = "mostkhaby-v1";
const ASSETS_TO_CACHE = ["/", "/index.html"];

// ── Install Event ────────────────────────────────────────────
self.addEventListener("install", (event) => {
  console.log("[SW] Install event");
  self.skipWaiting();
});

// ── Activate Event ───────────────────────────────────────────
self.addEventListener("activate", (event) => {
  console.log("[SW] Activate event");
  event.waitUntil(clients.claim());
});

// ── Fetch Event ──────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  // Only handle GET requests
  if (event.request.method !== "GET") {
    return;
  }

  // Network first, fallback to cache
  event.respondWith(
    fetch(event.request)
      .catch(() => {
        return caches.open(CACHE_NAME).then((cache) => {
          return cache.match(event.request);
        });
      })
  );
});

// ── Push Notification Event ──────────────────────────────────
/**
 * This is the critical event for background notifications.
 * Even if the app is closed, this will trigger and show the notification.
 */
self.addEventListener("push", (event) => {
  console.log("[SW] Push event received");

  if (!event.data) {
    console.warn("[SW] Push event with no data");
    return;
  }

  let payload;
  try {
    payload = event.data.json();
  } catch (e) {
    console.warn("[SW] Failed to parse push payload:", e);
    // Fallback to text
    payload = {
      type: "chat_message",
      title: "رسالة جديدة",
      body: event.data.text(),
    };
  }

  // ✅ CRITICAL: Only show if it's a chat message
  // (don't spam users with other notification types)
  if (payload.type !== "chat_message") {
    console.log("[SW] Skipping non-chat notification type:", payload.type);
    return;
  }

  const notificationOptions = {
    // ✅ Notification properties
    body: payload.body || "رسالة جديدة",
    icon: payload.icon || "/logo-icon.png",
    badge: payload.badge || "/logo-icon.png",
    tag: payload.tag || "chat-notification", // Only one per tag
    renotify: true, // Vibrate again even if same tag replaces old notification
    requireInteraction: false, // Auto-dismiss after a few seconds
    silent: false, // Allow sound
    sound: "/sounds/notification.mp3", // Custom notification sound
    vibrate: [200, 100, 200], // WhatsApp-like vibration pattern
    data: {
      type: payload.type,
      chatId: payload.chatId,
      msgId: payload.msgId,
      url: payload.url || "/",
    },
    // ✅ Actions (buttons on the notification)
    actions: [
      {
        action: "open",
        title: "فتح المحادثة",
      },
      {
        action: "close",
        title: "إغلاق",
      },
    ],
    // ✅ Visual properties
    timestamp: payload.timestamp || Date.now(),
    dir: "rtl", // Right-to-left for Arabic
    lang: "ar",
  };

  event.waitUntil(
    // Show the notification
    self.registration.showNotification(
      payload.title || "رسالة جديدة",
      notificationOptions
    )
  );
});

// ── Notification Click Event ──────────────────────────────────
/**
 * Handle user interactions with notifications
 */
self.addEventListener("notificationclick", (event) => {
  console.log("[SW] Notification clicked:", event.action);

  const notification = event.notification;
  const data = notification.data;

  // Close the notification
  notification.close();

  // Handle different actions
  if (event.action === "close") {
    console.log("[SW] User dismissed notification");
    return;
  }

  // Default action (click on body) = open the chat
  const relativeUrl = data.url || "/";
  const absoluteUrl = new URL(relativeUrl, self.location.origin).href;

  event.waitUntil(
    // Look for existing window
    clients.matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // 1. Check if the exact URL is already open
        for (const client of clientList) {
          if (client.url === absoluteUrl && "focus" in client) {
            return client.focus();
          }
        }

        // 2. If not, check if there is ANY window of our app open and navigate it
        for (const client of clientList) {
          if ("focus" in client && "navigate" in client) {
            client.navigate(absoluteUrl);
            return client.focus();
          }
        }

        // 3. Open new window if no window of our app is open
        if (clients.openWindow) {
          return clients.openWindow(absoluteUrl);
        }
      })
  );
});

// ── Notification Close Event ─────────────────────────────────
self.addEventListener("notificationclose", (event) => {
  console.log("[SW] Notification closed (dismissed)");
  // Optional: track that user dismissed the notification
  // You could send analytics here if needed
});

// ── Message Event (for communication with app) ────────────────
self.addEventListener("message", (event) => {
  console.log("[SW] Message received:", event.data);

  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// ── Background Sync (for offline support) ───────────────────
/**
 * Optional: Retry failed requests when coming back online
 * Uncomment if you want offline support
 */
/*
self.addEventListener("sync", (event) => {
  console.log("[SW] Background sync:", event.tag);

  if (event.tag === "sync-messages") {
    event.waitUntil(
      fetch("/api/sync-messages")
        .then(() => console.log("[SW] Sync successful"))
        .catch((e) => console.warn("[SW] Sync failed:", e))
    );
  }
});
*/

console.log("[SW] Service Worker loaded and ready");
