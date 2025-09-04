// client/src/components/WsSwitch.jsx
import React from 'react';
import { wsState, connectWs, disconnectWs } from '../lib/ws_client';

export default function WsSwitch({ room = 'demo' }) {
  const [state, setState] = React.useState(wsState.get());
  React.useEffect(() => wsState.subscribe(setState), []);

  const toggle = () => (state.connected ? disconnectWs() : connectWs(room));
  return (
    <button
      onClick={toggle}
      className={`px-2 py-1 rounded border ${state.connected ? 'bg-green-50' : 'bg-yellow-50'}`}
      title={`room: ${room}`}
    >
      {state.connected ? 'WS connected' : 'WS connect'}
    </button>
  );
}
