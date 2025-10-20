// English comments only
import React, { useEffect, useMemo, useState } from 'react';
// import { useWs } from '../components/WsProvider.jsx';
import { getUser } from '../lib/auth.js';
import AlertsPanel from '../components/AlertsPanel.jsx';
// import TvCompatBanner from '../components/TvCompatBanner.jsx';
import FhirExportButton from '../components/FhirExportButton.jsx';
import BloodPressureMonitor from '../components/BloodPressureMonitor.jsx';
import HealthDataMonitor from '../components/HealthDataMonitor.jsx';
import { fetchDevices } from '../lib/services/devices.js';
import LiveKitPanel from '../components/LiveKitPanel.jsx';
// import WsSwitch from '../components/WsSwitch.jsx';
import EventsTimeline from '../components/EventsTimeline.jsx';
import AdminCallElder from '../components/AdminCallElder.jsx';

export default function CaregiverPage() {
  const userName = useMemo(() => {
    const u = getUser();
    return (u && (u.name || u.nickname || u.id)) || 'Caregiver';
  }, []);

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
    // open LiveKit panel immediately
    setLkOpen(true);
    console.log('📞 管理员发起呼叫，LiveKit界面已打开');
  };

  const handleCallEnded = () => {
    setCurrentCall(null);
    setLkOpen(false);
  };

  return (
    <div className="app-main p-4">
      <div className="topbar mb-4">
        <input type="text" placeholder="Search" className="input max-w-md" />
      </div>

      {/* Health Data Monitor Section */}
      <div className="mt-2">
        <HealthDataMonitor />
      </div>

      {/* === Admin Call Elder Panel === */}
      <div className="card mt-6">
        <AdminCallElder 
          onCallInitiated={handleCallInitiated}
          onCallEnded={handleCallEnded}
        />
      </div>

      <div className="grid grid-cols-4 gap-6 mt-6">
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
          <div className="text-sm opacity-70">Room: {currentCall?.room_id || 'demo'}</div>
          <FhirExportButton />
        </div>
      </div>

      {/* === New: Events timeline card === */}
      <div className="card mt-6">
        <h2 className="font-bold mb-2">Events (24h)</h2>
        <EventsTimeline kinds="vitals,hazard,emergency" since="24h" limit={200} />
      </div>

      <LiveKitPanel
        open={lkOpen}
        onClose={() => setLkOpen(false)}
        role="caregiver"
        room={currentCall?.room_id || 'demo'}
        identity={userName}
        roomId={currentCall?.room_id}
      />
    </div>
  );
}
