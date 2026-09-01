'use client';

import { useEffect, useState } from 'react';
import { subscribeUserToPush } from '../lib/registerPush';
import type { StoredSession } from '../types/interfaces';

const SESSION_KEY = 'medartis_session_token';

function getSession(): StoredSession | null {
  try {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null') as StoredSession | null;
    return session && session.id && Date.now() < session.expiresAt ? session : null;
  } catch { return null; }
}

/**
 * Browser permission must be requested from a user action. This prompt is shown to
 * Sales and Warehouse staff after sign-in, so their device can receive web/PWA push.
 */
export default function PushNotificationPrompt() {
  const [session, setSession] = useState<StoredSession | null>(null);
  const [status, setStatus] = useState<'idle' | 'subscribing' | 'failed'>('idle');

  useEffect(() => {
    const refreshSession = () => setSession(getSession());
    refreshSession();
    window.addEventListener('app-signin', refreshSession);
    window.addEventListener('app-signout', refreshSession);
    return () => {
      window.removeEventListener('app-signin', refreshSession);
      window.removeEventListener('app-signout', refreshSession);
    };
  }, []);

  if (!session || !['sales', 'warehouse'].includes(session.role.trim().toLowerCase()) || Notification.permission === 'granted') return null;

  const enableNotifications = async () => {
    setStatus('subscribing');
    const result = await subscribeUserToPush(session);
    setStatus(result === 'subscribed' || result === 'denied' || result === 'unsupported' ? 'idle' : 'failed');
  };

  return (
    <div className="fixed bottom-20 left-3 right-3 z-40 mx-auto flex max-w-lg flex-col gap-3 rounded-2xl border border-primary/20 bg-base-100 p-4 shadow-xl sm:bottom-5 sm:flex-row sm:items-center">
      <p className="flex-1 text-sm">Enable notifications to receive booking updates on this browser or installed app.</p>
      <button type="button" className="btn btn-primary btn-sm" onClick={enableNotifications} disabled={status === 'subscribing'}>
        {status === 'subscribing' ? 'Enabling…' : 'Enable notifications'}
      </button>
      {status === 'failed' && <p className="text-xs text-error">Unable to enable notifications. Check the app configuration and try again.</p>}
    </div>
  );
}
