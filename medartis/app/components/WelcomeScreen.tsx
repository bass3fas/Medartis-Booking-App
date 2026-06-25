// app/components/WelcomeScreen.tsx
'use client';

import { useState, useEffect } from 'react';
import { handleDatabaseAuth } from '../actions/auth'; // 👈 Import the real database action

export default function WelcomeScreen() {
  const [isMounted, setIsMounted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setIsMounted(true);
    const sessionToken = localStorage.getItem('medartis_session_token');
    if (sessionToken) {
      try {
        const session = JSON.parse(sessionToken);
        if (Date.now() < session.expiresAt) {
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem('medartis_session_token');
        }
      } catch {
        localStorage.removeItem('medartis_session_token');
      }
    }

    const handleSignOutEvent = () => setIsAuthenticated(false);
    window.addEventListener('app-signout', handleSignOutEvent);
    return () => window.removeEventListener('app-signout', handleSignOutEvent);
  }, []);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Call the real database Server Action
    const result = await handleDatabaseAuth({
      action: isSignUp ? 'signup' : 'signin',
      email,
      password,
      name
    });

    if (result.success) {
      // Create a 7-day session token locally upon successful DB validation
      const expiryTime = Date.now() + 7 * 24 * 60 * 60 * 1000;
      localStorage.setItem(
        'medartis_session_token', 
        JSON.stringify({ user: result.user?.email, name: result.user?.name, expiresAt: expiryTime })
      );
      setIsAuthenticated(true);
      // Reset fields
      setPassword('');
    } else {
      setError(result.error || 'Authentication failed.');
    }
    setLoading(false);
  };

  if (!isMounted || isAuthenticated) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-gradient-to-br from-primary to-secondary text-primary-content flex flex-col items-center justify-center p-6">
      <div className="card w-full max-w-md bg-base-100 text-base-content shadow-2xl p-8 border border-base-300">
        <div className="card-body p-0 items-center text-center">
          
          <div className="w-14 h-14 rounded-2xl bg-primary text-primary-content flex items-center justify-center font-black text-2xl shadow-sm mb-2">
            M
          </div>
          
          <h1 className="text-xl font-black tracking-tight">
            {isSignUp ? 'Create Operator Account' : 'Initialize Session'}
          </h1>
          <p className="text-[10px] font-mono tracking-wider opacity-50 uppercase mb-6">
            {isSignUp ? 'Register to Postgres DB' : 'Logistics Verification Portal'}
          </p>

          <form onSubmit={handleAuthSubmit} className="form-control w-full gap-3 text-left">
            {isSignUp && (
              <div>
                <label className="label-text font-bold text-xs px-1 block mb-1">Full Name</label>
                <input 
                  type="text" 
                  placeholder="Alex Carter" 
                  className="input input-bordered w-full text-sm font-semibold"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            )}

            <div>
              <label className="label-text font-bold text-xs px-1 block mb-1">Operator Email</label>
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
              <div className="alert alert-error text-xs py-2 px-3 font-semibold mt-1 text-error-content">
                <span>{error}</span>
              </div>
            )}

            <button type="submit" className="btn btn-primary w-full mt-2 font-bold" disabled={loading}>
              {loading ? 'Connecting to Database...' : isSignUp ? 'Register Account' : 'Sign In'}
            </button>
          </form>

          <div className="mt-4 text-xs">
            <span className="opacity-60">{isSignUp ? 'Already have an account? ' : "New operator? "}</span>
            <button 
              type="button" 
              className="link link-primary font-bold" 
              onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
            >
              {isSignUp ? 'Sign In here' : 'Sign Up here'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}