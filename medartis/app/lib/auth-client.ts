export function checkSessionExpired(): boolean {
  if (typeof window === 'undefined') return true;
  const sessionToken = localStorage.getItem('medartis_session_token');
  if (!sessionToken) return true;
  
  try {
    const session = JSON.parse(sessionToken);
    return Date.now() > session.expiresAt;
  } catch {
    return true;
  }
}