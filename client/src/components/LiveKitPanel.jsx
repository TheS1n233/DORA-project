// client/src/components/LiveKitPanel.jsx
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { LiveKitRoom, VideoConference, RoomAudioRenderer } from '@livekit/components-react';
import '@livekit/components-styles';
import { getLiveKitInfo } from '../lib/services/teleassist';

export default function LiveKitPanel({
  open,
  onClose,
  role = 'elder', // "caregiver" | "elder"
  room = 'demo',
  identity,
  roomId,
}) {
  const [state, setState] = useState({ url: '', token: '', loading: false, err: '' });
  const roomRef = useRef(null);

  // Ensure local mic/cam are enabled on connect
  const onConnected = useCallback(
    async (room) => {
      roomRef.current = room;
      try {
        await room.localParticipant.setMicrophoneEnabled(true);
        await room.localParticipant.setCameraEnabled(true);
        
        if (role === 'caregiver') {
          // Enable screen sharing for caregivers
          try {
            await room.localParticipant.setScreenShareEnabled(true, { audio: true });
          } catch (e) {
            console.warn('Screen share not available:', e);
          }
        }
      } catch (err) {
        console.error('setup tracks failed:', err);
      }
    },
    [role]
  );

  useEffect(() => {
    let abort = false;
    async function go() {
      if (!open) return;
      setState((s) => ({ ...s, loading: true, err: '' }));
      try {
        const info = await getLiveKitInfo({
          room,
          identity: identity || (role === 'caregiver' ? 'care-1' : 'elder-1'),
          role,
        });
        if (!abort) setState({ url: info.url, token: info.token, loading: false, err: '' });
      } catch (e) {
        if (!abort) setState({ url: '', token: '', loading: false, err: e.message || String(e) });
      }
    }
    go();
    return () => {
      abort = true;
    };
  }, [open, room, role, identity]);

  if (!open) return null;

  if (state.loading || state.err || !state.token) {
    const text = state.loading
      ? 'Requesting LiveKit token...'
      : state.err || 'LiveKit is offline\nBackend did not return a token. Please check /tele/livekit/token or VITE_LK_URL.';
    return (
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-xl p-6 w-[80vw] max-w-[960px]">
          <div className="text-center whitespace-pre-wrap text-gray-700">{text}</div>
          <div className="mt-6 flex justify-center">
            <button className="px-4 py-2 rounded-md bg-slate-100 hover:bg-slate-200" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-2" style={{ width: '92vw', height: '86vh', maxWidth: 1200 }}>
        <LiveKitRoom
          connect
          video
          audio
          token={state.token}
          serverUrl={state.url}
          data-lk-theme="default"
          onConnected={onConnected}
          onDisconnected={async () => {
            if (roomId) {
              try {
                await fetch('http://127.0.0.1:8300/api/calls/end', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ room_id: roomId }),
                });
              } catch {}
            }
            onClose();
          }}
          onError={(error) => {
            console.error('LiveKit error:', error);
            onClose();
          }}
          options={{
            dynacast: true,
            adaptiveStream: { pixelDensity: 'screen' },
          }}
          style={{ width: '100%', height: '100%' }}
        >
          <RoomAudioRenderer />
          <VideoConference />
        </LiveKitRoom>
      </div>
    </div>
  );
}
