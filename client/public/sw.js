/**
 * CliniqueCI — Service Worker
 * Handles Web Push notifications and click-through navigation.
 */

const APP_URL = self.location.origin;

// ── Push event ────────────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = { title: 'CliniqueCI', body: 'Nouvelle notification', link: '/' };

  if (event.data) {
    try {
      data = JSON.parse(event.data.text());
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    data: { link: data.link || '/' },
    vibrate: [150, 50, 150],
    requireInteraction: false,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// ── Notification click ────────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const link = event.notification.data?.link || '/';
  const targetUrl = APP_URL + link;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If the app is already open in a tab, focus it and navigate
      for (const client of windowClients) {
        if (client.url.startsWith(APP_URL) && 'focus' in client) {
          client.focus();
          client.navigate(targetUrl);
          return;
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
