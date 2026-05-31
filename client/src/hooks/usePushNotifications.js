import { useEffect, useRef } from 'react';
import { api } from '../lib/api';

/**
 * Registers the service worker, requests push permission, and sends
 * the subscription to the backend.  No-op if the browser doesn't
 * support push or if the user denies permission.
 *
 * Call this hook in a component that's always mounted after login
 * (e.g. Layout).
 */
export function usePushNotifications(user) {
  const subscribedRef = useRef(false);

  useEffect(() => {
    if (!user) return;
    if (subscribedRef.current) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    subscribedRef.current = true; // prevent double-run in StrictMode

    (async () => {
      try {
        // 1. Register (or retrieve) the service worker
        const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });

        // 2. Fetch the VAPID public key from the backend
        const { publicKey } = await api.get('/notifications/vapid-public-key');
        if (!publicKey) return;

        // 3. Request permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        // 4. Subscribe to push manager
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });

        // 5. Send the subscription to the backend (upsert)
        const subJson = subscription.toJSON();
        await api.post('/notifications/push-subscribe', {
          endpoint: subJson.endpoint,
          keys: subJson.keys,
        });
      } catch (err) {
        // Silently ignore — push is best-effort, shouldn't break the app
        console.warn('[Push] Abonnement impossible :', err.message);
      }
    })();
  }, [user]);
}

// ── Utility: convert Base64 VAPID key to Uint8Array ──────────────────────────
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}
