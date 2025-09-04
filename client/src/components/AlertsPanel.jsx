// English comments only
import React, { useEffect, useState } from 'react';
import { fetchAlerts, ackAlert, escalateAlert } from '../lib/services/alerts.js';

export default function AlertsPanel() {
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState({}); // {id:'ack'|'esc'}

  async function load() {
    const list = await fetchAlerts({ limit: 10 });
    setItems(list);
  }

  useEffect(() => {
    load();
  }, []);

  async function onAck(id) {
    setBusy((b) => ({ ...b, [id]: 'ack' }));
    const r = await ackAlert(id);
    setItems((arr) => arr.filter((x) => x.id !== id));
    setBusy((b) => ({ ...b, [id]: undefined }));
  }

  async function onEsc(id) {
    setBusy((b) => ({ ...b, [id]: 'esc' }));
    const r = await escalateAlert(id);
    setItems((arr) => arr.map((x) => (x.id === id ? { ...x, level: 'high', escalated: true } : x)));
    setBusy((b) => ({ ...b, [id]: undefined }));
  }

  if (!items.length) {
    return <div className="text-slate-500">No recent alerts.</div>;
  }

  return (
    <div className="space-y-3">
      {items.map((a) => (
        <div key={a.id} className="p-3 rounded-md border border-slate-200 bg-white flex items-center justify-between">
          <div>
            <div className="font-medium">{a.type} {a.level ? `· ${a.level}` : ''}</div>
            <div className="text-xs opacity-70">{a.note || new Date(a.at).toLocaleString()}</div>
          </div>
          <div className="flex gap-2">
            <button className="btn" disabled={busy[a.id]} onClick={() => onAck(a.id)}>
              {busy[a.id] === 'ack' ? 'Acknowledging…' : 'Acknowledge'}
            </button>
            <button className="btn" disabled={busy[a.id]} onClick={() => onEsc(a.id)}>
              {busy[a.id] === 'esc' ? 'Escalating…' : 'Escalate'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
