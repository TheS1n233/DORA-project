// English comments only

import React, { useEffect, useMemo, useState } from "react";
import { fetchRecommendations } from "../lib/services/reco.js";

export default function RecommendationsCard({
  title = "Recommendations",
  limit = 5,
  pollMs = 60000, // refresh every 60s
}) {
  const [items, setItems] = useState([]);
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState("");

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, limit);
  }, [items, limit]);

  async function load() {
    setPending(true);
    setErr("");
    const res = await fetchRecommendations({ limit });
    if (Array.isArray(res)) {
      setItems(res);
    } else {
      setErr(res?.error || "unknown_error");
    }
    setPending(false);
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      await load();
      const t = setInterval(() => alive && load(), pollMs);
      return () => clearInterval(t);
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollMs, limit]);

  return (
    <div className="p-3 rounded-md bg-white border border-slate-200">
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold">{title}</div>
        <button
          className="text-sm opacity-70 hover:opacity-100"
          onClick={() => load()}
          disabled={pending}
          title="Refresh"
        >
          {pending ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {err && (
        <div className="text-sm text-red-600 mb-2">
          {err === "network_error" ? "Network error" : err}
        </div>
      )}

      {!err && pending && sorted.length === 0 && (
        <div className="text-sm opacity-60">Loading…</div>
      )}

      {!err && !pending && sorted.length === 0 && (
        <div className="text-sm opacity-60">No recommendations.</div>
      )}

      <ul className="space-y-2">
        {sorted.map((it) => (
          <li
            key={it.id}
            className="p-3 rounded-md bg-teal-50/50 border border-teal-100"
          >
            <div className="flex items-center justify-between">
              <div className="font-medium">{it.title}</div>
              {typeof it.score === "number" && (
                <div className="text-xs opacity-60">score {it.score}</div>
              )}
            </div>
            {it.subtitle && (
              <div className="text-sm opacity-70 mt-0.5">{it.subtitle}</div>
            )}
            {it.kind && (
              <div className="text-[11px] mt-1 inline-block px-2 py-0.5 rounded-full bg-slate-100">
                {it.kind}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
