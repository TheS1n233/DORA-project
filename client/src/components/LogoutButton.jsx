// English comments only
import React, { useState } from 'react';
import { clearAuth } from '../lib/auth.js';
import { logoutBackend } from '../lib/api_auth.js';

export default function LogoutButton({ label = 'Logout' }) {
  const [loading, setLoading] = useState(false);
  async function handleLogout() {
    setLoading(true);
    try {
      await logoutBackend();
    } catch {}
    clearAuth();
    try {
      window.dispatchEvent(new Event('dora:auth-update'));
    } catch {}
    // Redirect to the same page; AuthGate will show login
    window.location.hash = '';
    window.location.search = '';
    window.scrollTo(0, 0);
    setLoading(false);
  }
  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      style={{
        position: 'fixed',
        top: 12,
        right: 12,
        zIndex: 1000,
        padding: '10px 14px',
        borderRadius: 10,
        border: 'none',
        background: '#0f766e',
        color: 'white',
        cursor: 'pointer',
        opacity: loading ? 0.6 : 1,
      }}
      aria-label="Logout"
      title="Logout"
    >
      {loading ? '...' : label}
    </button>
  );
}
