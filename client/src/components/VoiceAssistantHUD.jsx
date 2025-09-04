// English comments only
import React, { useEffect, useState } from 'react';
import VoiceAssistantIcon from './VoiceAssistantIcon';

const STATE = {
  idle: { text: 'Ready', bg: '#e2e8f0', fg: '#0f172a' },
  listening: { text: 'Listening…', bg: '#dcfce7', fg: '#166534' },
  processing: { text: 'Processing…', bg: '#fef9c3', fg: '#92400e' },
  error: { text: 'Try again', bg: '#fee2e2', fg: '#991b1b' },
};

export default function VoiceAssistantHUD() {
  const [s, setS] = useState('idle');

  useEffect(() => {
    // Listen to custom events to update the HUD without touching existing icon component
    function onVui(e) {
      const next = e?.detail?.state;
      if (next && STATE[next]) setS(next);
    }
    window.addEventListener('dora:vui', onVui);
    return () => window.removeEventListener('dora:vui', onVui);
  }, []);

  const st = STATE[s] || STATE.idle;

  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        {/* pulsing ring when listening */}
        {s === 'listening' ? (
          <span
            aria-hidden
            style={{
              position: 'absolute',
              inset: -6,
              borderRadius: '999px',
              boxShadow: '0 0 0 0 rgba(16,185,129,0.7)',
              animation: 'dora-pulse 1.5s infinite',
            }}
          />
        ) : null}
        <VoiceAssistantIcon />
      </div>
      <span
        className="px-2 py-1 rounded-full text-xs"
        style={{ background: st.bg, color: st.fg, border: '1px solid rgba(0,0,0,0.05)' }}
      >
        {st.text}
      </span>
      {/* inline keyframes to avoid touching global css files */}
      <style>{`@keyframes dora-pulse{0%{box-shadow:0 0 0 0 rgba(16,185,129,0.7)}70%{box-shadow:0 0 0 16px rgba(16,185,129,0)}100%{box-shadow:0 0 0 0 rgba(16,185,129,0)}}`}</style>
    </div>
  );
}
