// lib/push-service.ts
import webpush from 'web-push';
import { prisma } from './db';

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function sendPushNotificationToUser(userId: string, title: string, body: string, url?: string) {
  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });

  const payload = JSON.stringify({ title, body, url });

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      );
    } catch (err) {
      console.error('Failed to send push notification:', err);
    }
  }
}