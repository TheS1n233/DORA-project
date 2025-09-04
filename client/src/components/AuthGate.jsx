// English comments only
import React, { useEffect, useMemo, useState } from 'react';
import InlineLogin from './InlineLogin.jsx';
import { getUser, hasAnyRole, isLoggedIn, clearAuth } from '../lib/auth.js';

function currentEntry() {
  // detect which html entry we are on
  const p = String(window.location.pathname || '');
  if (p.includes('care.html')) return 'care';
  if (p.includes('tv.html')) return 'tv';
  // default to tv for root redirection cases
  return 'tv';
}

function choosePortalUrl(user) {
  const roles = (user && Array.isArray(user.roles)) ? user.roles : [];
  // caregiver first
  if (roles.includes('caregiver')) return '/care.html#/';
  if (roles.includes('elder')) return '/tv.html#/';
  // fallback
  return '/care.html#/';
}

export default function AuthGate({ allowedRoles = [], loginTitle = 'Login', children }) {
  const [ver, setVer] = useState(0);
  const [redirecting, setRedirecting] = useState(false);

  // re-evaluate when global auth update happens
  useEffect(() => {
    const h = () => setVer((x) => x + 1);
    window.addEventListener('dora:auth-update', h);
    return () => window.removeEventListener('dora:auth-update', h);
  }, []);

  const user = useMemo(() => getUser(), [ver]);
  const authed = useMemo(() => isLoggedIn(), [ver]);
  const allowed = useMemo(() => hasAnyRole(allowedRoles), [ver, allowedRoles]);

  // If logged-in but wrong portal, auto redirect to the proper one
  useEffect(() => {
    if (!authed) return;
    if (allowed) return;
    if (redirecting) return;

    const cur = currentEntry();
    const target = choosePortalUrl(user);

    // avoid redirecting to the same html repeatedly
    const isCare = target.startsWith('/care.html');
    const isTv = target.startsWith('/tv.html');

    if ((cur === 'care' && isCare) || (cur === 'tv' && isTv)) {
      // we're already on the correct html but still not allowed -> keep showing message
      return;
    }

    setRedirecting(true);
    // slight delay to let user see the reason
    setTimeout(() => {
      try {
        window.location.href = target;
      } catch {
        setRedirecting(false);
      }
    }, 800);
  }, [authed, allowed, redirecting, user]);

  if (!authed) {
    // Not signed in -> show inline login
    return <InlineLogin title={loginTitle} />;
  }

  if (!allowed) {
    // Signed in but role mismatch -> show helpful message and redirect
    const target = choosePortalUrl(user);
    const tip = target.startsWith('/care.html') ? 'Caregiver' : 'TV';
    return (
      <div className="p-6 text-slate-700">
        <div className="text-xl font-semibold mb-2">No permission</div>
        <div className="mb-4">
          User: {user?.name || user?.id || 'Unknown'} does not have required role(s).
        </div>
        <div className="mb-4">
          You are logged in as <b>{Array.isArray(user?.roles) ? user.roles.join(', ') : 'unknown'}</b>. 
          Redirecting to the <b>{tip}</b> portal…
        </div>
        <div className="flex gap-3">
          <a className="btn" href={target}>Open {tip} portal</a>
          <button
            className="btn"
            onClick={() => {
              clearAuth();
              try { window.dispatchEvent(new Event('dora:auth-update')); } catch {}
            }}
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  // Allowed -> render protected children
  return <>{children}</>;
}
