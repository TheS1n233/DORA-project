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
import AdminCallElder from '../components/AdminCallElder.jsx';
import ElderCallAlert from '../components/ElderCallAlert.jsx';

export default function CaregiverPage() {
  const [selectedPerson, setSelectedPerson] = useState('ms-zhang');
  const userName = useMemo(() => {
    const u = getUser();
    return (u && (u.name || u.nickname || u.id)) || 'Caregiver';
  }, []);

  // LiveKit panel state
  const [lkOpen, setLkOpen] = useState(false);
  const [currentCall, setCurrentCall] = useState(null);
  
  // Active rooms (examples)
  const [activeRooms] = useState([
    { id: 'room-001', name: 'Sarah Johnson - Consultation', participants: 2, status: 'active', startedAt: '10:30 AM' },
    { id: 'room-002', name: 'Michael Chen - Health Check', participants: 1, status: 'waiting', startedAt: '11:15 AM' },
    { id: 'room-003', name: 'Emily Brown - Emergency', participants: 3, status: 'active', startedAt: '09:45 AM' },
    { id: 'room-004', name: 'David Wilson - Follow-up', participants: 1, status: 'active', startedAt: '11:00 AM' }
  ]);

  // devices mock/load
  const [devices, setDevices] = useState([]);
  useEffect(() => {
    fetchDevices().then(setDevices).catch(() => setDevices([]));
  }, []);

  const handleCallInitiated = (callData) => {
    setCurrentCall(callData);
    // open LiveKit panel immediately
    setLkOpen(true);
    console.log('📞 Admin initiated call, LiveKit panel opened');
  };

  const handleCallEnded = () => {
    setCurrentCall(null);
    setLkOpen(false);
  };

  const handleElderCallAnswered = (callData) => {
    setCurrentCall(callData);
    setLkOpen(true);
    console.log('📞 Admin answered elder call, LiveKit panel opened');
  };

  const handleElderCallDeclined = (callData) => {
    console.log('❌ Admin declined elder call:', callData.room_id);
  };

  return (
    <div className="app-main p-4">
      <div className="topbar mb-4">
        <input type="text" placeholder="Search" className="input max-w-md" />
      </div>

      {/* Health Data Monitor Section */}
      <div className="mt-2">
        <HealthDataMonitor onPersonChange={setSelectedPerson} />
      </div>

      {/* === Admin Call Elder Panel === */}
      <div className="card mt-6">
        <AdminCallElder 
          onCallInitiated={handleCallInitiated}
          onCallEnded={handleCallEnded}
          selectedPerson={selectedPerson}
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
        
        {/* Active Rooms List */}
        <div className="space-y-2 mb-4">
          {activeRooms.map((room) => (
            <div 
              key={room.id}
              className={`rounded-md border-2 p-3 bg-white transition-all ${
                room.status === 'active' 
                  ? 'border-green-500 bg-green-50' 
                  : room.status === 'waiting'
                  ? 'border-yellow-500 bg-yellow-50'
                  : 'border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-3 h-3 rounded-full ${
                      room.status === 'active' ? 'bg-green-500 animate-pulse' : 
                      room.status === 'waiting' ? 'bg-yellow-500' : 
                      'bg-gray-300'
                    }`}></span>
                    <span className="font-semibold text-gray-800">{room.name}</span>
                    {room.status === 'active' && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Active</span>
                    )}
                    {room.status === 'waiting' && (
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">Waiting</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 ml-5">
                    {room.participants} participant{room.participants !== 1 ? 's' : ''}
                    {room.startedAt && ` • Started: ${room.startedAt}`}
                  </div>
                </div>
                {room.status === 'active' && (
                  <button 
                    className="btn btn-sm bg-blue-500 text-white px-3 py-1"
                    onClick={() => {
                      setCurrentCall({ room_id: room.id });
                      setLkOpen(true);
                    }}
                  >
                    Join
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        
        <div className="rounded-md border border-slate-200 p-4 bg-white">
          <div className="text-sm opacity-70 mb-2">
            Current Room: {currentCall?.room_id 
              ? activeRooms.find(r => r.id === currentCall.room_id)?.name || currentCall.room_id
              : activeRooms.find(r => r.status === 'active')?.name || 'No active room'}
          </div>
          <FhirExportButton />
        </div>
      </div>

      <LiveKitPanel
        open={lkOpen}
        onClose={() => setLkOpen(false)}
        role="caregiver"
        room={currentCall?.room_id || 'demo'}
        identity={userName}
        roomId={currentCall?.room_id}
      />

      {/* === Elder Call Alert === */}
      <ElderCallAlert
        onCallAnswered={handleElderCallAnswered}
        onCallDeclined={handleElderCallDeclined}
      />
    </div>
  );
}
