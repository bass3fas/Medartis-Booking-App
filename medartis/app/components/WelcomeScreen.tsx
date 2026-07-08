// app/components/WelcomeScreen.tsx
'use client';

import { useState, useEffect } from 'react';
import { handleDatabaseAuth } from '../actions/auth';

function getSessionState() {
  if (typeof window === 'undefined') {
    return { isAuthenticated: false, userRole: '' };
  }

  const sessionToken = localStorage.getItem('medartis_session_token');
  if (!sessionToken) {
    return { isAuthenticated: false, userRole: '' };
  }

  try {
    const session = JSON.parse(sessionToken);
    if (Date.now() < session.expiresAt) {
      return {
        isAuthenticated: Boolean(session.role && session.role !== 'operator'),
        userRole: session.role || 'operator',
      };
    }

    localStorage.removeItem('medartis_session_token');
  } catch {
    localStorage.removeItem('medartis_session_token');
  }

  return { isAuthenticated: false, userRole: '' };
}

export default function WelcomeScreen() {
  const [sessionState, setSessionState] = useState(getSessionState);
  const { isAuthenticated, userRole } = sessionState;
  
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const handleSignOutEvent = () => {
      setSessionState({ isAuthenticated: false, userRole: '' });
    };

    window.addEventListener('app-signout', handleSignOutEvent);
    return () => window.removeEventListener('app-signout', handleSignOutEvent);
  }, []);

  const handleAuthSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  setError('');

  const result = await handleDatabaseAuth({
      action: isSignUp ? 'signup' : 'signin',
      email,
      password,
      name
    });

    if (result.success) {
    const expiryTime = Date.now() + 7 * 24 * 60 * 60 * 1000;
    
    localStorage.setItem(
      'medartis_session_token', 
      JSON.stringify({ 
        user: result.user?.email, 
        name: result.user?.name, 
        role: result.user?.role, 
        expiresAt: expiryTime 
      })
    );

    // 📢 Broadcast that a user successfully logged in!
    window.dispatchEvent(new Event('app-signin')); 

    setSessionState({
      isAuthenticated: Boolean(result.user?.role && result.user?.role !== 'operator'),
      userRole: result.user?.role || 'operator',
    });
    setPassword('');

    } else {
      setError(result.error || 'Authentication failed.');
    }
    setLoading(false);
  };

  const handleForceLogOut = () => {
    localStorage.removeItem('medartis_session_token');
    setSessionState({ isAuthenticated: false, userRole: '' });
  };

  // 🛡️ If the user is authenticated AND they have a confirmed role, unlock the main app layout
  if (isAuthenticated && userRole !== 'operator') return null;

  return (
    <div className="fixed inset-0 z-100 h-screen w-screen bg-linear-to-br from-primary to-secondary text-primary-content flex flex-col items-center justify-center p-6">
      <div className="card w-full max-w-md bg-base-100 text-base-content shadow-2xl p-8 border border-base-300">
        <div className="card-body p-0 items-center text-center">
          
          <div className="w-14 h-14 rounded-2xl bg-primary text-primary-content flex items-center justify-center font-black text-2xl shadow-sm mb-2">
            M
          </div>

          {/* 🛑 CONDITIONAL WINDOW: Shows block state if user role is 'operator' */}
          {userRole === 'operator' ? (
            <div className="flex flex-col items-center animate-fade-in">
              <h1 className="text-xl font-black text-warning tracking-tight mt-2">Registration Pending Approval</h1>
              
              <div className="bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 border border-amber-200 p-4 rounded-xl my-6 text-sm font-medium leading-relaxed">
                👋 Hello! Your operator account has been created successfully, but is currently locked. 
                <br /><br />
                <span className="font-bold">Please contact your system Administrator to assign your permissions clearance tier</span> before you can access the logistics management grid.
              </div>

              <button 
                type="button" 
                onClick={handleForceLogOut} 
                className="btn btn-outline btn-sm font-bold w-full normal-case"
              >
                ← Back to Login Screen
              </button>
            </div>
          ) : (
            /* 🔓 STANDARD ACCOUNT ROUTE: Login Form Framework */
            <>
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
                  {loading ? 'Verifying DB Status...' : isSignUp ? 'Register Account' : 'Sign In'}
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
            </>
          )}

        </div>
      </div>
    </div>
  );
}