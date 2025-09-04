// English comments only
import React, { useEffect, useState } from 'react';

export default function AlertOverlay() {
  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState(null);

  useEffect(() => {
    function onAlert(e) {
      setPayload(e.detail || {});
      setOpen(true);
      // auto hide in 8s
      setTimeout(() => setOpen(false), 8000);
    }
    window.addEventListener('dora:alert', onAlert);
    return () => window.removeEventListener('dora:alert', onAlert);
  }, []);

  if (!open || !payload) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pointer-events-none">
      <div className="mt-8 mx-4 w-full max-w-2xl pointer-events-auto">
        <div className="p-4 rounded-lg border border-red-300 bg-red-50 text-red-800 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="font-bold text-lg">{payload.title || 'Alert'}</div>
            <button className="btn" onClick={() => setOpen(false)}>Dismiss</button>
          </div>
          <div className="mt-2 text-sm">{payload.message || ''}</div>
          <div className="text-xs opacity-70 mt-1">{new Date(payload.at || Date.now()).toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
}
