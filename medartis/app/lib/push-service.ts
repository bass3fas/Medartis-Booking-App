import webpush from 'web-push';
import { prisma } from './db';

/** Sends web-push messages only when the server has been configured with VAPID keys. */
function configureWebPush(): boolean {
  const { VAPID_SUBJECT, NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } = process.env;
  if (!VAPID_SUBJECT || !NEXT_PUBLIC_VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn('Push notification skipped because VAPID environment variables are not configured.');
    return false;
  }

  webpush.setVapidDetails(VAPID_SUBJECT, NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  return true;
}

async function sendPushNotifications(userIds: string[], title: string, body: string, url = '/bookings') {
  if (!userIds.length || !configureWebPush()) return;

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId: { in: userIds } },
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  });
  const payload = JSON.stringify({ title, body, url });

  await Promise.allSettled(subscriptions.map(async (subscription: { id: string; endpoint: string; p256dh: string; auth: string }) => {
    try {
      await webpush.sendNotification({
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      }, payload);
    } catch (error: unknown) {
      // Expired subscriptions cannot recover and would otherwise fail every delivery.
      const statusCode = typeof error === 'object' && error && 'statusCode' in error ? Number(error.statusCode) : 0;
      if (statusCode === 404 || statusCode === 410) {
        await prisma.pushSubscription.delete({ where: { id: subscription.id } });
      } else {
        console.error('Failed to send push notification:', error);
      }
    }
  }));
}

export async function sendPushNotificationToUser(userId: string, title: string, body: string, url?: string) {
  await sendPushNotifications([userId], title, body, url);
}

/** Notifies every subscribed Warehouse account, across browser and installed PWA devices. */
export async function sendPushNotificationToWarehouse(title: string, body: string, url?: string) {
  const warehouseUsers = await prisma.user.findMany({
    where: { role: { equals: 'warehouse', mode: 'insensitive' } },
    select: { id: true },
  });
  await sendPushNotifications(warehouseUsers.map((user: { id: string }) => user.id), title, body, url);
}
