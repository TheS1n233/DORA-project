// English comments only
import React from 'react';
import { useWs } from './WsProvider.jsx';

export default function WsStatusChip({ align = 'right' }) {
  const { status, room } = useWs() || { status: 'disconnected', room: 'demo' };
  const bg =
    status === 'connected'
      ? 'var(--chip-bg-ok, #dcfce7)'
      : status === 'connecting'
      ? 'var(--chip-bg-warn, #fef9c3)'
      : 'var(--chip-bg-bad, #fee2e2)';
  const color =
    status === 'connected'
      ? 'var(--chip-fg-ok, #166534)'
      : status === 'connecting'
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
    border: '1px solid rgba(0,0,0,0.05)',
    boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
  };

  return (
    <div style={style}>
      <span style={{ marginRight: 8 }}>
        {status === 'connected'
          ? 'WS connected'
          : status === 'connecting'
          ? 'WS connecting'
          : 'WS disconnected'}
      </span>
      <span style={{ opacity: 0.8 }}>room: {room || 'demo'}</span>
    </div>
  );
}
