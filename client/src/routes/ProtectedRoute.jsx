// English comments only
import React from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { isAuthed } from '../lib/auth'

export default function ProtectedRoute() {
  const authed = isAuthed()
  const loc = useLocation()
  if (!authed) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />
  return <Outlet />
}
