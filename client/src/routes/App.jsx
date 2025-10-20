// English comments only
import React from 'react'
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom'
import ProtectedRoute from './ProtectedRoute'
import LoginPage from './LoginPage'
import TvPage from './TvPage'
import CaregiverPage from './CaregiverPage'
import HealthDashboard from './HealthDashboard'
import { isAuthed, logout } from '../lib/auth'

function TopNav() {
  const loc = useLocation()
  const navigate = useNavigate()
  const authed = isAuthed()

  const onLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="px-4 py-3 flex items-center gap-3 sticky top-0 bg-soft-mint z-50">
      <span className="w-3 h-3 bg-blue-600 rounded-sm inline-block"></span>
      <span className="font-semibold">DORA Client</span>
      <div className="ml-auto flex items-center gap-2">
        <Link to="/tv?room=demo"><button className={`btn ${loc.pathname.startsWith('/tv') ? '!bg-slate-900 !text-white !border-slate-900' : ''}`}>TV</button></Link>
        <Link to="/caregiver"><button className={`btn ${loc.pathname.startsWith('/caregiver') ? '!bg-slate-900 !text-white !border-slate-900' : ''}`}>Caregiver</button></Link>
        <Link to="/dashboard"><button className={`btn ${loc.pathname.startsWith('/dashboard') ? '!bg-slate-900 !text-white !border-slate-900' : ''}`}>Dashboard</button></Link>
        {authed && <button className="btn" onClick={onLogout}>Logout</button>}
      </div>
    </div>
  )
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <TopNav />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/caregiver" element={<CaregiverPage />} />
          <Route path="/caregiver/*" element={<CaregiverPage />} />
          <Route path="/tv" element={<TvPage />} />
          <Route path="/dashboard" element={<HealthDashboard />} />
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
