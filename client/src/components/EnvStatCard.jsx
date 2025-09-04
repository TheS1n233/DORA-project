// English comments only
import React from 'react';

export default function EnvStatCard({ label, value, unit }) {
  const show = value !== null && value !== undefined && value !== '';
  return (
    <div className="p-3 rounded-md border border-slate-200 bg-white">
      <div className="text-sm opacity-70">{label}</div>
      <div className="text-xl font-semibold">{show ? `${value}${unit ? ' ' + unit : ''}` : '—'}</div>
    </div>
  );
}
