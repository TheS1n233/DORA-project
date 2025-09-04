// English comments only
import React, { useEffect, useState } from 'react';
import { fetchRecommendations } from '../lib/services/recommendations.js';

export default function Recommendations() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = await fetchRecommendations();
        if (alive) setItems(list);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  if (loading) {
    return <div className="text-slate-500 text-sm">Loading recommendations…</div>;
  }

  if (!items.length) {
    return <div className="text-slate-500 text-sm">No recommendations.</div>;
  }

  return (
    <div className="space-y-2">
      {items.map((r) => (
        <div key={r.id || r.title} className="p-3 rounded-md border border-slate-200 bg-white">
          {r.title || r.text}
        </div>
      ))}
    </div>
  );
}
