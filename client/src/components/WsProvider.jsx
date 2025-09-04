// English comments only
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

const WsCtx = createContext(null);

export function useWs() {
  return useContext(WsCtx);
}

function pickRoom() {
  try {
    const raw = (localStorage.getItem('dora_user') || sessionStorage.getItem('dora_user'));
    if (raw) {
      const u = JSON.parse(raw);
      if (u && u.room_id) return String(u.room_id);
    }
  } catch {}
  return 'demo';
}

function buildUrl(base, room) {
  if (base.startsWith('ws://') || base.startsWith('wss://')) {
    const q = base.includes('?') ? '&' : '?';
    return `${base}${q}room=${encodeURIComponent(room)}`;
  }
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${location.host}${base}?room=${encodeURIComponent(room)}`;
}

export default function WsProvider({ base = '/ws', defaultRoom = 'demo', children }) {
  const [status, setStatus] = useState('disconnected');
  const [room, setRoom] = useState(pickRoom() || defaultRoom);
  const [lastMessage, setLastMessage] = useState(null);
  const wsRef = useRef(null);
  const retryRef = useRef(0);

  useEffect(() => {
    let alive = true;

    function connect() {
      if (!alive) return;
      setStatus('connecting');
      const url = buildUrl(base, room || defaultRoom);
      try {
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!alive) return;
          retryRef.current = 0;
          setStatus('connected');
        };

        ws.onmessage = (evt) => {
          if (!alive) return;
          try {
            const msg = JSON.parse(evt.data);
            setLastMessage(msg);
            const t = String(msg?.type || '');
            const data = msg.data || msg;

            if (t === 'vitals/ingest') {
              try { window.dispatchEvent(new CustomEvent('dora:vitals', { detail: data })); } catch {}
            }
            if (t === 'fall/detected') {
              try {
                window.dispatchEvent(new CustomEvent('dora:fall', { detail: data }));
                window.dispatchEvent(new CustomEvent('dora:alert', {
                  detail: {
                    level: 'high',
                    title: 'Fall detected',
                    message: data?.location ? `Location: ${data.location}` : 'Please check immediately.',
                    at: Date.now()
                  }
                }));
              } catch {}
            }

            // environment events -> one channel
            if (t.startsWith('env/')) {
              try { window.dispatchEvent(new CustomEvent('dora:env', { detail: { type: t, data } })); } catch {}
            }
          } catch {}
        };

        ws.onclose = () => {
          if (!alive) return;
          setStatus('disconnected');
          const delay = Math.min(30000, 1000 * Math.pow(2, retryRef.current++));
          setTimeout(connect, delay);
        };

        ws.onerror = () => {};
      } catch {
        setStatus('disconnected');
        setTimeout(connect, 2000);
      }
    }

    connect();
    return () => {
      alive = false;
      try { wsRef.current && wsRef.current.close(); } catch {}
    };
  }, [base, room, defaultRoom]);

  const api = useMemo(() => {
    return {
      status,
      room,
      lastMessage,
      send: (payload) => {
        try { wsRef.current?.send(JSON.stringify(payload)); } catch {}
      },
      setRoom,
    };
  }, [status, room, lastMessage]);

  return <WsCtx.Provider value={api}>{children}</WsCtx.Provider>;
}
