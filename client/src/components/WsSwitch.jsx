// /src/components/WsSwitch.jsx
import { useState } from 'react';
import { connectWs, disconnectWs, send, __ws } from '/src/lib/ws_client.js';

export default function WsSwitch({ defaultRoom = 'demo' }) {
  const [status, setStatus] = useState(__ws.state.status || 'idle');

  const doConnect = async () => {
    setStatus('connecting');
    try {
      await connectWs({
        room: defaultRoom,
        onMessage: (msg) => console.debug('[WS] msg:', msg),
      });
      setStatus('connected');
    } catch (e) {
      console.error('WS connect failed:', e);
      setStatus('disconnected');
    }
  };

  const doDisconnect = () => {
    disconnectWs();
    setStatus('disconnected');
  };

  const doPing = () => {
    try {
      send({ type: 'ping', from: 'button', at: Date.now() });
    } catch (e) {
      console.warn(e.message);
    }
  };

  return (
    <div className="inline-flex items-center gap-2">
      <button onClick={status === 'connected' ? doDisconnect : doConnect}>
        WS {status === 'connected' ? 'disconnect' : 'connect'}
      </button>
      <button onClick={doPing} disabled={status !== 'connected'}>
        Ping
      </button>
      <small>state: {status} · room: {defaultRoom}</small>
    </div>
  );
}
