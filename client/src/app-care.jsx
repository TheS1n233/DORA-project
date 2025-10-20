// client/src/app-care.jsx
// English comments only
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import CaregiverPage from './routes/CaregiverPage.jsx';
import AuthGate from './components/AuthGate.jsx';
import LogoutButton from './components/LogoutButton.jsx';
import { CARE_ROLES } from './lib/roles.js';

export default function AppCare() {
  // Use HashRouter to keep URL under /care.html#/
  return (
    <HashRouter>
      <AuthGate allowedRoles={CARE_ROLES} loginTitle="Caregiver Login">
        {/* WsProvider removed: WS not used on caregiver UI */}
        <LogoutButton label="Logout" />
        <Routes>
          <Route path="/" element={<CaregiverPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthGate>
    </HashRouter>
  );
}
