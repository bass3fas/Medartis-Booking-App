import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import type { PushSubscriptionRequest } from '@/app/types/interfaces';

export async function POST(request: Request) {
  try {
    const { userId, subscription } = await request.json() as PushSubscriptionRequest;
    if (!userId || !subscription?.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      return NextResponse.json({ error: 'A user ID and complete push subscription are required.' }, { status: 400 });
    }

    await prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      update: { userId, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
      create: { userId, endpoint: subscription.endpoint, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unable to save push subscription:', error);
    return NextResponse.json({ error: 'Unable to save push subscription.' }, { status: 500 });
  }
}
