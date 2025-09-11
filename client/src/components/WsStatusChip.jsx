// English comments only
import React from 'react';
import { useWs } from './WsProvider.jsx';

function mapStatus(s) {
  // Normalize provider ('open'|'closed'|'connecting'|'idle') to UI ('connected'|'connecting'|'disconnected')
  if (s === 'open') return 'connected';
  if (s === 'connecting') return 'connecting';
  return 'disconnected'; // 'closed' or 'idle' or unknown
}

export default function WsStatusChip({ align = 'right' }) {
  const { status, room } = useWs() || { status: 'idle', room: 'demo' };
  const norm = mapStatus(status);
  const bg =
    norm === 'connected'
      ? 'var(--chip-bg-ok, #dcfce7)'
      : norm === 'connecting'
      ? 'var(--chip-bg-warn, #fef9c3)'
      : 'var(--chip-bg-bad, #fee2e2)';
  const color =
    norm === 'connected'
      ? 'var(--chip-fg-ok, #166534)'
      : norm === 'connecting'
      ? 'var(--chip-fg-warn, #92400e)'
      : 'var(--chip-fg-bad, #991b1b)';

  const style = {
    position: 'fixed',
    top: 14,
    [align === 'right' ? 'right' : 'left']: 14,
    zIndex: 1000,
    background: bg,
    color,
    padding: '6px 10px',
    borderRadius: 999,
    fontSize: 12,
    boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
  };

  return (
    <div style={style}>
      <span style={{ marginRight: 8 }}>
        {norm === 'connected'
          ? 'WS connected'
          : norm === 'connecting'
          ? 'WS connecting'
          : 'WS disconnected'}
      </span>
      <span style={{ opacity: 0.8 }}>room: {room || 'demo'}</span>
    </div>
  );
}
