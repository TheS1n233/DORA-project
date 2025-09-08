// client/src/app-tv.jsx
// English comments only
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import TvPage from './routes/TvPage.jsx';
import AuthGate from './components/AuthGate.jsx';
import LogoutButton from './components/LogoutButton.jsx';
import { TV_ROLES } from './lib/roles.js';
import { WsProvider } from "./components/WsProvider.jsx";
import WsStatusChip from './components/WsStatusChip.jsx';
import WsOverlay from "./lib/WsOverlay.jsx";

export default function AppTv() {
  // Use HashRouter so that multi-page entries like /tv.html do not get replaced to /
  return (
    <HashRouter>
      <AuthGate allowedRoles={TV_ROLES} loginTitle="TV Login">
        <WsProvider base="/ws" defaultRoom="demo">
          <LogoutButton label="Logout" />
          <WsStatusChip align="right" />
          <WsOverlay anchor="top-right" />
          <Routes>
            <Route path="/" element={<TvPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </WsProvider>
      </AuthGate>
    </HashRouter>
  );
}
