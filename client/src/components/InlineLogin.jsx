// English comments only
import React, { useState } from 'react';
import { loginByPassword } from '../lib/api_auth.js';
import { setRemember } from '../lib/auth.js';

export default function InlineLogin({ title = 'Login' }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRememberFlag] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      // persist remember preference BEFORE login so that token storage is correct
      setRemember(remember);
      const res = await loginByPassword({ username, password });
      window.location.reload();
      return res;
    } catch (error) {
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        'Login failed. Please check your credentials.';
      setErr(String(msg));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-xl shadow-lg border border-slate-200">
      <h2 className="text-2xl font-bold mb-6">{title}</h2>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Username / Phone</label>
          <input
            className="input w-full"
            placeholder="care"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Password</label>
          <input
            className="input w-full"
            type="password"
            placeholder="123"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRememberFlag(e.target.checked)}
          />
          <span>Remember me</span>
        </label>

        {!!err && <div className="text-red-600 text-sm">{err}</div>}

        <button className="btn w-full" type="submit" disabled={loading}>
          {loading ? 'Logging in…' : 'Login'}
        </button>
      </form>
      <div className="text-xs opacity-70 mt-3">
        Dev accounts when backend is offline: <code>care / 123456</code>.
      </div>
    </div>
  );
}
