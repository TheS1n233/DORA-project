// English comments only
import React, { useEffect, useMemo, useState } from 'react';
import { useWs } from '../components/WsProvider.jsx';
import { getUser } from '../lib/auth.js';
import AlertsPanel from '../components/AlertsPanel.jsx';
import TvCompatBanner from '../components/TvCompatBanner.jsx';
import FhirExportButton from '../components/FhirExportButton.jsx';
import { fetchDevices } from '../lib/services/devices.js';
import LiveKitPanel from '../components/LiveKitPanel.jsx';
import WsSwitch from '../components/WsSwitch.jsx';
import EventsTimeline from '../components/EventsTimeline.jsx';
import AdminCallElder from '../components/AdminCallElder.jsx';

export default function CaregiverPage() {
  const userName = useMemo(() => {
    const u = getUser();
    return (u && (u.name || u.nickname || u.id)) || 'Caregiver';
  }, []);

  const { status, room, send } = useWs() || {
    status: 'disconnected',
    room: 'demo',
    send: () => {},
  };

  const wsBadge =
    status === 'connected'
      ? 'bg-green-500 !text-white !border-green-500'
      : status === 'connecting'
      ? 'bg-amber-400 !text-white !border-amber-400'
      : 'bg-red-500 !text-white !border-red-500';

  // LiveKit panel state
  const [lkOpen, setLkOpen] = useState(false);
  const [currentCall, setCurrentCall] = useState(null);

  // devices mock/load
  const [devices, setDevices] = useState([]);
  useEffect(() => {
    fetchDevices().then(setDevices).catch(() => setDevices([]));
  }, []);

  const handleCallInitiated = (callData) => {
    setCurrentCall(callData);
    // 立即打开LiveKit界面，不显示"正在呼叫"状态
    setLkOpen(true);
    console.log('📞 管理员发起呼叫，LiveKit界面已打开');
  };

  const handleCallEnded = () => {
    setCurrentCall(null);
    setLkOpen(false);
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="logo">
          <img src="/logo.svg" alt="" className="w-10 h-10" />
        </div>
        <h1 className="text-2xl font-bold text-green-600 mb-6">DORA</h1>
        <nav className="space-y-4">
          <div>Dashboard</div>
          <div>Alerts</div>
          <div>Health</div>
          <div>Tele-assist</div>
          <div>Devices</div>
          <div>Settings</div>
        </nav>
      </aside>

      <main className="app-main">
        <div className="topbar">
          <input type="text" placeholder="Search" className="input max-w-md" />
          <div 
            className={`badge ${wsBadge}`}
            aria-live="polite"
            aria-label={`WebSocket status ${status}`}
          >
            {status}
          </div>
          <WsSwitch />
        </div>

        <TvCompatBanner />

        <div className="grid grid-cols-4 gap-6 mt-4">
          <div className="card">
            <h2 className="font-bold mb-2">Alerts today</h2>
            <div className="text-5xl font-bold">0</div>
          </div>
          <div className="card">
            <h2 className="font-bold mb-2">Falls today</h2>
            <div className="text-5xl font-bold">0</div>
          </div>
          <div className="card">
            <h2 className="font-bold mb-2">Hazards</h2>
            <div className="text-5xl font-bold">2</div>
          </div>
          <div className="card">
            <h2 className="font-bold mb-2">Devices online</h2>
            <div className="text-5xl font-bold">{devices.length}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mt-6">
          <div className="card">
            <h2 className="font-bold mb-2">Alerts feed</h2>
            <AlertsPanel />
          </div>
          <div className="card">
            <h2 className="font-bold mb-2">Notes</h2>
            <div className="p-3 rounded-md border border-slate-200 bg-white">
              Check medication plan if BP anomalies persist.
            </div>
            <div className="p-3 rounded-md border border-slate-200 bg-white mt-2">
              Encourage short outdoor walks (weather permitting).
            </div>
          </div>
        </div>

        {/* === NEW: Admin Call Elder Panel === */}
        <div className="card mt-6">
          <AdminCallElder 
            onCallInitiated={handleCallInitiated}
            onCallEnded={handleCallEnded}
          />
        </div>

        <div className="card mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold">Tele-assist</h2>
            <div className="flex items-center gap-3">
              <label className="text-sm flex items-center gap-2">
                <input type="checkbox" /> <span>Embed</span>
              </label>
              <button className="btn" onClick={() => setLkOpen(true)}>Start Call</button>
              <button className="btn" onClick={() => setLkOpen(true)}>Join</button>
              <button className="btn" onClick={() => setLkOpen(false)}>Hang up</button>
            </div>
          </div>
          <div className="rounded-md border border-slate-200 p-4 bg-white">
            <div className="text-sm opacity-70">Room: {room || 'demo'}</div>
            <FhirExportButton />
          </div>
        </div>

        <div className="card mt-6">
          <h2 className="font-bold mb-2">Devices</h2>
          <div className="grid grid-cols-2 gap-3">
            {devices.map((d, i) => (
              <div key={i} className="p-3 rounded-md border border-slate-200 bg-white">
                <div className="font-semibold">{d.name || d.id || 'Device'}</div>
                <div className="text-xs opacity-70">{d.type || 'unknown'}</div>
              </div>
            ))}
            {!devices.length && <div className="p-3 rounded-md border border-slate-200 bg-white">No devices.</div>}
          </div>
        </div>

        {/* === New: Events timeline card === */}
        <div className="card mt-6">
          <h2 className="font-bold mb-2">Events (24h)</h2>
          <EventsTimeline kinds="vitals,hazard,emergency" since="24h" limit={200} />
        </div>
      </main>

      <LiveKitPanel
        open={lkOpen}
        onClose={() => setLkOpen(false)}
        role="caregiver"
        room={currentCall?.room_id || room || 'demo'}
        identity={userName}
        roomId={currentCall?.room_id}
      />
    </div>
  );
}
