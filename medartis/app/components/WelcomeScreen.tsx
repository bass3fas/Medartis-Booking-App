'use client';

import { useState, useEffect } from 'react';

export default function WelcomeScreen() {
  const [isMounted, setIsMounted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setIsMounted(true);
    // Read local storage to determine if an active session is still valid
    const sessionToken = localStorage.getItem('medartis_session_token');
    if (sessionToken) {
      try {
        const session = JSON.parse(sessionToken);
        if (Date.now() < session.expiresAt) {
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem('medartis_session_token'); // Clear expired token
        }
      } catch (e) {
        localStorage.removeItem('medartis_session_token');
      }
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Temporary validation logic (We will replace this with a secure API hash route)
    setTimeout(() => {
      if (email.endsWith('@gmail.com') && password.length >= 6) {
        const expiryTime = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 Days duration limit
        localStorage.setItem(
          'medartis_session_token', 
          JSON.stringify({ user: email, expiresAt: expiryTime })
        );
        setIsAuthenticated(true);
      } else {
        setError('Invalid coordinate email access signature or password too short.');
      }
      setLoading(false);
    }, 1200);
  };

  // Prevent layout shifts during structural mounting hydrations
  if (!isMounted) return null;

  // If authenticated cleanly, hide the login screen completely
  if (isAuthenticated) return null;

  return (
    /* fixed inset-0 z-[100]: Overlays everything on the phone/desktop glass workspace completely */
    <div className="fixed inset-0 z-[100] bg-gradient-to-br from-primary to-secondary text-primary-content flex flex-col items-center justify-center p-6 animate-fade-in">
      
      <div className="card w-full max-w-md bg-base-100 text-base-content shadow-2xl p-8 border border-base-300">
        <div className="card-body p-0 items-center text-center">
          
          {/* Medical Identity Token Stamp */}
          <div className="w-16 h-16 rounded-2xl bg-primary text-primary-content flex items-center justify-center font-black text-2xl shadow-md mb-2">
            M
          </div>
          
          <h1 className="text-2xl font-black tracking-tight text-base-content">Medartis Hub</h1>
          <p className="text-xs opacity-60 font-mono uppercase tracking-widest mb-6">Logistics Verification Engine</p>

          <form onSubmit={handleLogin} className="form-control w-full gap-4 text-left">
            <div>
              <label className="label-text font-bold text-xs px-1 block mb-1">Operator Email Address</label>
              <input 
                type="email" 
                placeholder="operator@company.com" 
                className="input input-bordered w-full text-sm font-semibold"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="label-text font-bold text-xs px-1 block mb-1">Security Password</label>
              <input 
                type="password" 
                placeholder="••••••••" 
                className="input input-bordered w-full text-sm font-semibold"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="alert alert-error text-xs py-2 px-3 font-semibold text-error-content mt-1">
                <span>{error}</span>
              </div>
            )}

            <button 
              type="submit" 
              className={`btn btn-primary w-full mt-4 font-bold ${loading ? 'loading' : ''}`}
              disabled={loading}
            >
              {loading ? 'Authenticating Token...' : 'Initialize Secure Session'}
            </button>
          </form>

          <div className="mt-6 border-t border-base-200 pt-4 w-full text-center">
            <span className="text-[10px] font-mono tracking-wider opacity-40 uppercase block">
              Protected Medical Logistics Matrix
            </span>
          </div>

        </div>
      </div>
    </div>
  );
}