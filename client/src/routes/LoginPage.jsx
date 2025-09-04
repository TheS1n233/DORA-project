// English comments only
import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { login, isAuthed } from '../lib/auth'

export default function LoginPage() {
  const navigate = useNavigate()
  const [sp] = useSearchParams()
  const next = sp.get('next') || '/tv?room=demo'

  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Redirect if already authed
  React.useEffect(() => {
    if (isAuthed()) navigate(next, { replace: true })
  }, [navigate, next])

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login({ phone, password, remember })
      navigate(next, { replace: true })
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-soft-mint">
      <header className="px-6 py-4 flex items-center gap-2">
        <span className="w-3 h-3 bg-blue-600 rounded-sm inline-block"></span>
        <span className="font-semibold text-lg">DORA Assistant</span>
      </header>

      <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-sm grid grid-cols-1 md:grid-cols-2 mt-10 overflow-hidden">
        <div className="bg-blue-50 h-full flex items-center justify-center p-10">
          <img src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png" alt="avatar" className="w-60 h-60 opacity-90" />
        </div>

        <form onSubmit={onSubmit} className="p-10">
          <h1 className="text-2xl font-bold mb-6">Account Login</h1>

          <label className="block text-sm mb-1">Phone Number</label>
          <input
            className="input mb-4"
            placeholder="86+"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          <label className="block text-sm mb-1">Password</label>
          <input
            type="password"
            className="input mb-2"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <div className="flex items-center justify-between mb-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              Remember me
            </label>
            <a className="text-sm text-blue-600 hover:underline" href="#">Forgot password?</a>
          </div>

          {error && <div className="mb-3 text-red-600 text-sm">{error}</div>}

          <button type="submit" className="btn w-full !bg-blue-600 !text-white !border-blue-600 hover:opacity-90" disabled={loading}>
            {loading ? 'Logging in…' : 'Login'}
          </button>

          <div className="text-sm text-slate-600 mt-3">
            Don’t have an account? <a className="text-blue-600 hover:underline" href="#">Sign up</a>
          </div>
        </form>
      </div>
    </div>
  )
}
