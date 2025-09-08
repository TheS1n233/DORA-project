// src/components/AlertsPanel.jsx
import React from "react";

export default function AlertsPanel({
  items,
  onAck = () => {},
  onEscalate = () => {},
}) {
  // 统一兜底：保证 list 一定是数组
  const list = Array.isArray(items)
    ? items
    : items == null
    ? []
    : Array.isArray(items?.list)
    ? items.list
    : Array.isArray(items?.data)
    ? items.data
    : typeof items === "object"
    ? Object.values(items)
    : [];

  if (!list.length) {
    return <div className="card p-4 text-slate-500">No alerts.</div>;
  }

  return (
    <div className="space-y-3">
      {list.map((a, idx) => (
        <div key={a.id ?? idx} className="card flex items-center justify-between">
          <div>
            <div className="font-medium">
              {a.type ?? a.title ?? "alert"} · {a.level ?? a.severity ?? "info"}
            </div>
            <div className="text-sm text-slate-500">
              {a.desc ?? a.description ?? a.message ?? "-"}
            </div>
          </div>

          <div className="flex gap-2">
            <button className="btn" onClick={() => onAck(a)}>Acknowledge</button>
            <button className="btn btn-secondary" onClick={() => onEscalate(a)}>
              Escalate
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
