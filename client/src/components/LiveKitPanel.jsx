// client/src/components/LiveKitPanel.jsx
import React, { useEffect, useState } from 'react';
import { LiveKitRoom, VideoConference } from '@livekit/components-react';
import '@livekit/components-styles';
import { getLiveKitInfo } from '../lib/services/teleassist';

export default function LiveKitPanel({
  open,
  onClose,
  role = 'elder',     // TV 端默认 elder；Care 端传 caregiver
  room = 'demo',
  identity,           // 调用处传一个 identity（如 "care-1" / "elder-1"）
}) {
  const [state, setState] = useState({ url: '', token: '', loading: false, err: '' });

  useEffect(() => {
    let abort = false;
    async function go() {
      if (!open) return;
      setState(s => ({ ...s, loading: true, err: '' }));
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
    return () => { abort = true; };
  }, [open, room, role, identity]);

  if (!open) return null;

  // Loading / Error 覆盖层
  if (state.loading || state.err || !state.token) {
    const text = state.loading
      ? 'Requesting LiveKit token...'
      : (state.err || 'LiveKit is offline\nBackend did not return a token. Please check /tele/livekit/token or VITE_LK_URL.');
    return (
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-xl p-6 w-[80vw] max-w-[960px]">
          <div className="text-center whitespace-pre-wrap text-gray-700">{text}</div>
          <div className="mt-6 flex justify-center">
            <button className="px-4 py-2 rounded-md bg-slate-100 hover:bg-slate-200"
              onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-2 w-[92vw] h-[86vh] max-w-[1200px]">
        <LiveKitRoom
          video={true}
          audio={true}
          token={state.token}
          serverUrl={state.url}
          data-lk-theme="default"
          onDisconnected={onClose}
          style={{ width: '100%', height: '100%' }}
        >
          <VideoConference />
        </LiveKitRoom>
      </div>
    </div>
  );
}
