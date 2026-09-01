import type { StoredSession } from '../types/interfaces';

function urlBase64ToUint8Array(value: string): ArrayBuffer {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const bytes = Uint8Array.from(rawData, (character) => character.charCodeAt(0));
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

/** Requests permission from a signed-in user and stores this device's subscription. */
export async function subscribeUserToPush(session: StoredSession): Promise<'subscribed' | 'denied' | 'unsupported' | 'failed'> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !session.id) return 'unsupported';
  if (await Notification.requestPermission() !== 'granted') return 'denied';

  const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicVapidKey) return 'failed';

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription()
      ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicVapidKey) });
    const response = await fetch('/api/save-subscription', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: session.id, subscription }),
    });
    return response.ok ? 'subscribed' : 'failed';
  } catch (error) {
    console.error('Unable to subscribe this device to push notifications:', error);
    return 'failed';
  }
}
