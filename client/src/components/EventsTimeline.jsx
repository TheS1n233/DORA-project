// client/src/components/EventsTimeline.jsx
// English comments only
import React, { useEffect, useMemo, useRef, useState } from "react";

function hmBase() {
  // Prefer explicit env; fall back to same-origin /hm proxy if present; lastly localhost:8100
  return import.meta.env.VITE_HM_API || window.__HM_API || "http://127.0.0.1:8100";
}

function fmtTime(ts) {
  try {
    const d = new Date((Number(ts) || 0) * 1000);
    return d.toLocaleString();
  } catch {
    return String(ts);
  }
}

function KindBadge({ kind }) {
  const cls =
    kind === "emergency"
      ? "bg-red-600 text-white"
      : kind === "hazard"
      ? "bg-amber-500 text-white"
      : "bg-slate-700 text-white";
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${cls}`}>{kind}</span>
  );
}

function ItemBody({ item }) {
  const k = item?.kind || "event";
  const d = item?.data || {};
  if (k === "vitals") {
    const metric = d.metric || d.code || "vitals";
    const value = d.value ?? d.val ?? "";
    const unit = d.unit || "";
    return (
      <div className="text-sm">
        <div className="font-semibold">{metric}</div>
        <div className="opacity-80">{`${value}${unit ? " " + unit : ""}`}</div>
      </div>
    );
  }
  if (k === "hazard") {
    const t = d.type || "hazard";
    const level = d.level;
    const state = d.state;
    return (
      <div className="text-sm">
        <div className="font-semibold capitalize">{t}</div>
        <div className="opacity-80">
          {level != null ? `level: ${level}` : state ? `state: ${state}` : ""}
        </div>
      </div>
    );
  }
  if (k === "emergency") {
    return (
      <div className="text-sm">
        <div className="font-semibold">Emergency</div>
        <div className="opacity-80">{d.message || "triggered"}</div>
      </div>
    );
  }
  return (
    <pre className="text-xs whitespace-pre-wrap opacity-80">
      {JSON.stringify(d, null, 2)}
    </pre>
  );
}

export default function EventsTimeline({
  kinds = "vitals,hazard,emergency",
  since = "24h",
  limit = 200,
  pollMs = 8000,
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const timerRef = useRef(null);

  const url = useMemo(() => {
    const base = hmBase();
    const qs = new URLSearchParams({ kinds, since, limit: String(limit) });
    return `${base}/events?${qs.toString()}`;
  }, [kinds, since, limit]);

  async function fetchOnce(signal) {
    try {
      setErr(null);
      const res = await fetch(url, { signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      const list = Array.isArray(body?.entry) ? body.entry : [];
      setItems(list.reverse()); // newest last for timeline
    } catch (e) {
      if (e.name !== "AbortError") setErr(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const ac = new AbortController();
    fetchOnce(ac.signal);
    if (pollMs > 0) {
      timerRef.current = setInterval(() => fetchOnce(ac.signal), pollMs);
    }
    return () => {
      ac.abort();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [url, pollMs]);

  if (loading && items.length === 0) {
    return <div className="p-3 rounded-md border border-slate-200 bg-white">Loading…</div>;
  }
  if (err) {
    return (
      <div className="p-3 rounded-md border border-red-200 bg-red-50 text-red-700">
        Failed to load events: {err}
      </div>
    );
  }

  if (!items.length) {
    return <div className="p-3 rounded-md border border-slate-200 bg-white">No recent events.</div>;
  }

  return (
    <div className="space-y-3">
      {items.map((it) => (
        <div
          key={it.id || `${it.kind}-${it.ts}`}
          className="p-3 rounded-md border border-slate-200 bg-white flex items-start gap-3"
          role="article"
          aria-label={`${it.kind} at ${fmtTime(it.ts)}`}
        >
          <div className="shrink-0">
            <KindBadge kind={it.kind} />
          </div>
          <div className="grow">
            <div className="text-sm opacity-60">{fmtTime(it.ts)}</div>
            <ItemBody item={it} />
          </div>
        </div>
      ))}
    </div>
  );
}
