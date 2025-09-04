// English comments only
import React, { useEffect, useMemo, useState } from 'react';
import { useWs } from '../components/WsProvider.jsx';
import { getUser } from '../lib/auth.js';
import AlertsPanel from '../components/AlertsPanel.jsx';
import TvCompatBanner from '../components/TvCompatBanner.jsx';
import FhirExportButton from '../components/FhirExportButton.jsx';
import { fetchDevices } from '../lib/services/devices.js';
import LiveKitPanel from '../components/LiveKitPanel.jsx';

export default function CaregiverPage() {
  const userName = useMemo(() => {
    const u = getUser();
    return (u && (u.name || u.nickname || u.id)) || 'Caregiver';
  }, []);

  const { status, room } = useWs() || {
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

  const [devices, setDevices] = useState([]);
  useEffect(() => {
    let alive = true;
    (async () => {
      const list = await fetchDevices();
      if (alive) setDevices(list);
    })();
    return () => { alive = false; };
  }, []);

  return (
    <div className="app-shell">
      <aside className="app-aside">
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
          <div className="flex items-center space-x-3">
            <span className={`badge ${wsBadge}`}>
              {status === 'connected' ? 'WS connected' : status === 'connecting' ? 'WS connecting' : 'WS disconnected'}
            </span>
            <span className="badge">room: {room || 'demo'}</span>
            <div className="flex items-center space-x-2">
              <img src="https://i.pravatar.cc/40?img=5" alt="avatar" className="w-10 h-10 rounded-full" />
              <span className="font-semibold">{userName}</span>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <TvCompatBanner />
        </div>

        <div className="card mt-4">
          <div className="flex items-center gap-3 mb-2">
            <label className="text-sm flex items-center gap-2">
              <input type="checkbox" /> <span>Embed</span>
            </label>
            <button className="btn" onClick={() => setLkOpen(true)}>Start Call</button>
            <button className="btn" onClick={() => setLkOpen(true)}>Join</button>
            <button className="btn" onClick={() => setLkOpen(false)}>Hang up</button>
          </div>
        </div>

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
            <h2 className="font-bold mb-2">Env. alerts today</h2>
            <div className="text-5xl font-bold">0</div>
          </div>
          <div className="card">
            <h2 className="font-bold mb-2">Devices online</h2>
            <div className="text-5xl font-bold">6</div>
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

        <div className="grid grid-cols-2 gap-6 mt-6">
          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-bold">Health board</h2>
              <FhirExportButton />
            </div>
            <div className="p-3 rounded-md border border-slate-200 bg-white">BP last: 120/78</div>
            <div className="p-3 rounded-md border border-slate-200 bg-white mt-2">HR last: 74</div>
            <div className="p-3 rounded-md border border-slate-200 bg-white mt-2">Steps today: 2300</div>
            <div className="p-3 rounded-md border border-slate-200 bg-white mt-2">Glucose last: normal</div>
          </div>

          <div className="card">
            <h2 className="font-bold mb-2">Devices</h2>
            {devices.map((d) => (
              <div key={d.id} className="p-3 rounded-md border border-slate-200 bg-white flex justify-between mt-2 first:mt-0">
                <span>{d.name}</span><span>{d.status}</span>
              </div>
            ))}
            {!devices.length && <div className="p-3 rounded-md border border-slate-200 bg-white">No devices.</div>}
          </div>
        </div>
      </main>

      <LiveKitPanel
        open={lkOpen}
        onClose={() => setLkOpen(false)}
        role="caregiver"
        room={room || 'demo'}
        identity={userName}
      />
    </div>
  );
}
