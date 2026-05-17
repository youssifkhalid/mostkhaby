// Service Worker for advanced background push notifications
const SW_VERSION = "v3";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let data = {};
  try { data = event.data.json(); } catch (e) { data = { title: "مستخبي", body: event.data.text() }; }

  const title = data.title || "مستخبي 🤫";
  const body = data.body || "وصلتك رسالة جديدة";
  const tag = data.tag || "mostkhbi";
  const url = data.url || "/";
  const icon = data.icon || "/logo-icon.png";
  const badge = data.badge || "/logo-icon.png";
  const image = data.image || undefined;

  const options = {
    body,
    icon,
    badge,
    image,
    tag,
    renotify: true,
    requireInteraction: false,
    dir: "rtl",
    lang: "ar",
    vibrate: [120, 60, 120, 60, 200],
    timestamp: Date.now(),
    data: { url, msgId: data.msgId, chatId: data.chatId },
    actions: [
      { action: "open", title: "فتح 💬" },
      { action: "dismiss", title: "تجاهل" },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "dismiss") return;

  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      // Focus an existing tab on same origin
      for (const client of list) {
        try {
          const clientUrl = new URL(client.url);
          if (clientUrl.origin === self.location.origin && "focus" in client) {
            client.postMessage({ type: "navigate", url });
            return client.focus();
          }
        } catch {}
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
