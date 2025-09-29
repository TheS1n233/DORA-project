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
  roomId,             // 房间ID，用于通知服务器通话结束
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
          onDisconnected={async (reason) => {
            console.log('LiveKit disconnected, reason:', reason);
            console.log('🔍 LiveKitPanel roomId:', roomId);
            
            // 通知服务器通话结束
            if (roomId) {
              console.log('📞 准备通知服务器通话结束，房间ID:', roomId);
              try {
                await fetch('http://127.0.0.1:8300/api/calls/end', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    room_id: roomId
                  }),
                });
                console.log('📞 已通知服务器通话结束');
              } catch (error) {
                console.error('通知服务器通话结束失败:', error);
              }
            }
            
            onClose();
          }}
          onConnected={() => {
            console.log('LiveKit connected successfully');
          }}
          onError={(error) => {
            console.error('LiveKit error:', error);
            onClose();
          }}
          onParticipantConnected={(participant) => {
            console.log('Participant connected:', participant.identity);
          }}
          onParticipantDisconnected={async (participant) => {
            console.log('Participant disconnected:', participant.identity);
            // When the remote party leaves, we also mark the call as ended on the server
            if (roomId) {
              try {
                await fetch('http://127.0.0.1:8300/api/calls/end', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    room_id: roomId
                  }),
                });
                console.log('📞 已在对方离开时通知服务器通话结束');
              } catch (error) {
                console.error('在对方离开时通知服务器失败:', error);
              }
            }
            // Close panel
            onClose();
          }}
          onTrackSubscribed={(track, publication, participant) => {
            console.log('Track subscribed:', track.kind, 'from', participant.identity);
          }}
          onTrackUnsubscribed={(track, publication, participant) => {
            console.log('Track unsubscribed:', track.kind, 'from', participant.identity);
          }}
          style={{ width: '100%', height: '100%' }}
        >
          <VideoConference 
            onDisconnected={(reason) => {
              console.log('VideoConference disconnected, reason:', reason);
              onClose();
            }}
            onParticipantDisconnected={(participant) => {
              console.log('VideoConference participant disconnected:', participant.identity);
              onClose();
            }}
          />
        </LiveKitRoom>
      </div>
    </div>
  );
}
