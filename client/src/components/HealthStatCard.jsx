// English comments only
import React from 'react';

export default function HealthStatCard({ title, value, unit, hint }) {
  const show = value !== null && value !== undefined;
  return (
    <div className="card">
      <h2 className="font-bold mb-2">{title}</h2>
      <p className="text-3xl font-bold text-teal-700">{show ? `${value}${unit ? ' ' + unit : ''}` : '—'}</p>
      {hint ? <p className="text-xs opacity-70 mt-1">{hint}</p> : null}
    </div>
  );
}
