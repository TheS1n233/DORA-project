// English comments only
import React, { useEffect, useState } from 'react';

function checkWebRTC() {
  const hasPeer = typeof window !== 'undefined' && ('RTCPeerConnection' in window);
  const hasMedia = !!(navigator && navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  return hasPeer && hasMedia;
}

async function checkMicPermission() {
  try {
    if (!navigator?.permissions) return 'unknown';
    const s = await navigator.permissions.query({ name: 'microphone' });
    return s.state; // 'granted' | 'denied' | 'prompt'
  } catch {
    return 'unknown';
  }
}

export default function TvCompatBanner() {
  const [rtc, setRtc] = useState(true);
  const [mic, setMic] = useState('unknown');

  useEffect(() => {
    setRtc(checkWebRTC());
    checkMicPermission().then(setMic);
  }, []);

  const issues = [];
  if (!rtc) issues.push('WebRTC is not supported in this browser.');
  if (mic === 'denied') issues.push('Microphone permission is denied.');
  if (mic === 'prompt') issues.push('Microphone permission is not granted yet.');

  if (!issues.length) return null;

  return (
    <div className="p-3 rounded-md border border-amber-300 bg-amber-50 text-amber-800">
      <div className="font-semibold mb-1">TV compatibility notice</div>
      <ul className="list-disc pl-5 text-sm">
        {issues.map((t, i) => <li key={i}>{t}</li>)}
      </ul>
      <div className="text-xs mt-2 opacity-70">
        Tip: use latest Chrome/Edge and allow microphone access.
      </div>
    </div>
  );
}
