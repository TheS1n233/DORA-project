// English comments only
import React, { useEffect, useMemo, useState } from 'react';
import { useWs } from '../components/WsProvider.jsx';
import RecommendationsCard from '../components/RecommendationsCard.jsx';
import { getUser } from '../lib/auth.js';
import AlertOverlay from '../components/AlertOverlay.jsx';
import LiveKitPanel from '../components/LiveKitPanel.jsx';

export default function TvPage() {
  const { status, room, send } = useWs() || { status: 'disconnected', room: 'demo', send: () => {} };
  const [hr, setHr] = useState(null);
  const [bp, setBp] = useState({ sys: null, dia: null });
  const [steps, setSteps] = useState(null);
  const [env, setEnv] = useState({ gas: null, smoke: null, leak: null, power: null, water: null });

  // LiveKit state
  const [lkOpen, setLkOpen] = useState(false);

  useEffect(() => {
    function onVitals(e) {
      const d = e.detail || {};
      if (d.hr != null) setHr(Number(d.hr));
      if (d.bp_sys != null || d.bp_systolic != null) setBp((p) => ({ ...p, sys: Number(d.bp_sys ?? d.bp_systolic) }));
      if (d.bp_dia != null || d.bp_diastolic != null) setBp((p) => ({ ...p, dia: Number(d.bp_dia ?? d.bp_diastolic) }));
      if (d.steps != null) setSteps(Number(d.steps));
    }
    function onEnv(e) {
      const { type, data } = e.detail || {};
      const val = data?.value ?? data?.status ?? data?.level ?? null;
      if (type === 'env/gas') setEnv((x) => ({ ...x, gas: val ?? 'alert' }));
      if (type === 'env/smoke') setEnv((x) => ({ ...x, smoke: val ?? 'alert' }));
      if (type === 'env/leak') setEnv((x) => ({ ...x, leak: val ?? 'alert' }));
      if (type === 'env/power') setEnv((x) => ({ ...x, power: data?.usage ?? val ?? x.power }));
      if (type === 'env/water') setEnv((x) => ({ ...x, water: data?.usage ?? val ?? x.water }));
    }
    function onVoice(e) {
      const name = (e.detail && (e.detail.name || e.detail.intent)) || '';
      if (name === 'call.answer' || name === 'answer.call' || name === 'cowatch.answer') setLkOpen(true);
    }
    window.addEventListener('dora:vitals', onVitals);
    window.addEventListener('dora:env', onEnv);
    window.addEventListener('dora:voice', onVoice);
    return () => {
      window.removeEventListener('dora:vitals', onVitals);
      window.removeEventListener('dora:env', onEnv);
      window.removeEventListener('dora:voice', onVoice);
    };
  }, []);

  const wsBadge =
    status === 'connected'
      ? 'bg-green-500 !text-white !border-green-500'
      : status === 'connecting'
      ? 'bg-amber-400 !text-white !border-amber-400'
      : 'bg-red-500 !text-white !border-red-500';

  const userName = useMemo(() => {
    const u = getUser();
    return (u && (u.name || u.nickname || u.id)) || 'User';
  }, []);

  function renderStatus(v) {
    if (v == null) return <span className="opacity-60">—</span>;
    if (typeof v === 'number') return <span>{v}</span>;
    const s = String(v).toLowerCase();
    return s.includes('ok') ? <span>OK</span> : <span className="text-red-600 font-semibold">Alert</span>;
  }

  return (
    <div className="app-shell">
      <AlertOverlay />
      <aside className="app-aside">
        <div className="flex items-center gap-3 mb-6">
          <span className="w-3 h-3 rounded-full bg-slate-400 inline-block" />
          <h1 className="text-2xl font-bold text-green-600">DORA</h1>
          <span className="badge">Ready</span>
        </div>

        <div className="space-y-3">
          <div className="card">
            <h2 className="font-bold mb-2">Quick phrases</h2>
            <div className="grid grid-cols-2 gap-2">
              <button className="btn" onClick={() => send({ type: 'intent', name: 'ask.hr' })}>What is my heart rate?</button>
              <button className="btn" onClick={() => send({ type: 'intent', name: 'ask.schedule' })}>Read today schedule</button>
              <button className="btn" onClick={() => send({ type: 'intent', name: 'call.caregiver' })}>Call my caregiver</button>
              <button className="btn" onClick={() => send({ type: 'intent', name: 'play.stretch' })}>Play stretching video</button>
            </div>
          </div>

          <div className="card">
            <h2 className="font-bold mb-2">Tips</h2>
            <ul className="list-disc pl-5 text-sm">
              <li>Drink water every hour.</li>
              <li>Take a short walk in the evening.</li>
              <li>Breathe deeply when you feel nervous.</li>
            </ul>
          </div>
        </div>
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
              <img src="https://i.pravatar.cc/40?img=3" alt="avatar" className="w-10 h-10 rounded-full" />
              <span className="font-semibold">{userName}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="card">
            <h2 className="font-bold mb-2">Today's overview</h2>
            <div className="text-sm space-y-2">
              <div className="flex justify-between"><span>Medication</span><span>08:30 / 20:30</span></div>
              <div className="flex justify-between"><span>Hydration</span><span>3 / 8 cups</span></div>
              <div className="flex justify-between"><span>Sleep</span><span>7h 20m</span></div>
            </div>
          </div>

          <div className="card">
            <h2 className="font-bold mb-2">Home status</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-md border border-slate-200 bg-white">Gas<br />{renderStatus(env.gas)}</div>
              <div className="p-3 rounded-md border border-slate-200 bg-white">Smoke<br />{renderStatus(env.smoke)}</div>
              <div className="p-3 rounded-md border border-slate-200 bg-white">Water leak<br />{renderStatus(env.leak)}</div>
              <div className="p-3 rounded-md border border-slate-200 bg-white">Power usage<br />{renderStatus(env.power)}</div>
              <div className="p-3 rounded-md border border-slate-200 bg-white col-span-2">Water usage<br />{renderStatus(env.water)}</div>
            </div>
          </div>

          <div className="card">
            <h2 className="font-bold mb-2">Call / Co-watch</h2>
            <div className="text-sm mb-2">Waiting for incoming call…</div>
            <div className="flex gap-2">
              <button className="btn" onClick={() => setLkOpen(true)}>Answer</button>
              <button className="btn" onClick={() => setLkOpen(false)}>Hang up</button>
              <button className="btn" onClick={() => window.open('https://example.com', '_blank')}>Open link</button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6 mt-6">
          <div className="card col-span-2">
            <h2 className="font-bold mb-2">Calendar</h2>
            <div className="p-3 rounded-md border border-slate-200 bg-white">Dentist — 08:00–08:30</div>
            <div className="p-3 rounded-md border border-slate-200 bg-white mt-2">Neurologist — 09:00–09:30</div>
            <div className="p-3 rounded-md border border-slate-200 bg-white mt-2">Digital X-Ray — 18:00–18:30</div>
          </div>

          <RecommendationsCard title="Recommendations" limit={5} pollMs={60000} />
        </div>
      </main>

      <LiveKitPanel
        open={lkOpen}
        onClose={() => setLkOpen(false)}
        role="elder"
        room={room || 'demo'}
        identity={userName}
      />
    </div>
  );
}
