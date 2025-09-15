// client/src/components/TvEventsTicker.jsx
// English comments only (code comments are in English to avoid i18n noise)
import React, { useEffect, useRef, useState } from "react";

// Prefer VITE_* envs, then window.__*_API, then localhost
function hmBase() {
  const envBase =
    (typeof import.meta !== "undefined" &&
      import.meta.env &&
      import.meta.env.VITE_HM_API) ||
    (typeof window !== "undefined" && window.__HM_API);
  return envBase || "http://127.0.0.1:8100";
}
function taBase() {
  const envBase =
    (typeof import.meta !== "undefined" &&
      import.meta.env &&
      import.meta.env.VITE_TA_API) ||
    (typeof window !== "undefined" && window.__TA_API);
  return envBase || "http://127.0.0.1:8300";
}

// Optional browser TTS (off by default). Enable by:
//   localStorage.setItem('__TTS_AUTO__','1')
// or set window.__TTS_AUTO__ = true in devtools.
function speak(text) {
  try {
    const enabled =
      typeof window !== "undefined" &&
      window.speechSynthesis &&
      (window.__TTS_AUTO__ || localStorage.getItem("__TTS_AUTO__") === "1");
    if (!enabled) return;

    // avoid stacking utterances
    try {
      window.speechSynthesis.cancel();
    } catch {}

    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1;
    u.pitch = 1;
    u.lang = "en-US";
    window.speechSynthesis.speak(u);
  } catch {
    // no-op
  }
}

export default function TvEventsTicker({
  pollMs = 5000,        // poll HM /events
  summaryEvery = 30000, // fallback TA summary interval
  maxChips = 3,         // maximum hazard chips displayed
  dedupeTtlSec = 120,   // TTL for de-duplication
}) {
  const [chips, setChips] = useState([]);
  const [banner, setBanner] = useState(null);

  // seen map: key -> lastTs (seconds)
  const seenRef = useRef(new Map());
  const lastTsRef = useRef(0);
  const lastSummaryTs = useRef(0);

  const getKey = (e) => {
    // compose a stable key for de-duplication across refreshes
    const parts = [
      e.id || "",
      e.ts || "",
      e.kind || "",
      e.data?.type || "",
      e.data?.message || "",
      e.data?.level ?? "",
    ];
    return parts.join("|");
  };

  const pruneSeen = (nowSec) => {
    const limit = nowSec - dedupeTtlSec;
    for (const [k, ts] of seenRef.current.entries()) {
      if (ts < limit) seenRef.current.delete(k);
    }
    // bound the map to a reasonable size
    if (seenRef.current.size > 1000) {
      const drop = seenRef.current.size - 1000;
      let i = 0;
      for (const k of seenRef.current.keys()) {
        seenRef.current.delete(k);
        if (++i >= drop) break;
      }
    }
  };

  useEffect(() => {
    let stop = false;

    const pollEvents = async () => {
      if (stop) return;
      try {
        const sinceParam =
          lastTsRef.current > 0 ? `since=${lastTsRef.current + 1}` : "since=5m";
        const url = `${hmBase()}/events?kinds=hazard,emergency&${sinceParam}&limit=100`;
        const r = await fetch(url, { headers: { Accept: "application/json" } });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const body = await r.json();
        const list = Array.isArray(body.entry) ? body.entry : [];

        if (list.length) {
          // advance high-water mark
          const maxTs = list.reduce(
            (m, e) => Math.max(m, e.ts || 0),
            lastTsRef.current
          );
          lastTsRef.current = Math.max(lastTsRef.current, maxTs);

          const nowSec = Math.floor(Date.now() / 1000);
          pruneSeen(nowSec);

          for (const e of list) {
            const key = getKey(e);
            if (seenRef.current.has(key)) continue; // de-dup by key within TTL
            seenRef.current.set(key, e.ts || nowSec);

            if (e.kind === "emergency") {
              const text = `Emergency: ${e.data?.message || "Emergency triggered"}`;
              setBanner({ ts: e.ts, text, tone: "crit" });
              speak(text);
              // auto hide after 4s
              setTimeout(() => setBanner(null), 4000);
            } else if (e.kind === "hazard") {
              const t = (e.data?.type || "hazard").toUpperCase();
              const lvl =
                typeof e.data?.level === "number"
                  ? Math.round(Number(e.data.level))
                  : e.data?.level;
              const label = lvl != null ? `${t} • L${lvl}` : t;

              setChips((prev) => {
                const next = [...prev, { key, label }];
                return next.slice(-maxChips);
              });
              // remove this chip after a while
              setTimeout(
                () =>
                  setChips((prev) => prev.filter((c) => c.key !== key)),
                12000
              );
            }
          }
        }
      } catch {
        // silent in TV mode
      }
    };

    // regular polling for fresh events
    const h = setInterval(pollEvents, pollMs);
    pollEvents();

    // summary fallback (via TA)
    const h2 = setInterval(async () => {
      const now = Date.now();
      if (now - lastSummaryTs.current < summaryEvery) return;
      lastSummaryTs.current = now;
      try {
        const r = await fetch(`${taBase()}/api/summary/events`, {
          headers: { Accept: "application/json" },
        });
        if (!r.ok) return;
        const data = await r.json();
        if (data?.ok && data?.text) {
          setBanner({ ts: Math.floor(now / 1000), text: data.text, tone: "info" });
          speak(data.text);
          setTimeout(() => setBanner(null), 5000);
        }
      } catch {
        // ignore
      }
    }, Math.max(10000, summaryEvery));

    return () => {
      stop = true;
      clearInterval(h);
      clearInterval(h2);
    };
  }, [pollMs, summaryEvery, maxChips, dedupeTtlSec]);

  if (!banner && chips.length === 0) return null;

  return (
    <>
      {/* hazard chips (stacked) */}
      <div
        className="fixed top-4 left-4 z-40 flex gap-2 flex-col"
        style={{ pointerEvents: "none" }}
      >
        {chips.map((c) => (
          <div
            key={c.key}
            className="px-3 py-1.5 rounded-lg shadow border text-sm bg-white"
            style={{ borderColor: "#fde68a", background: "#fff7ed" }} // amber/rose
          >
            <span className="font-semibold text-amber-700">{c.label}</span>
          </div>
        ))}
      </div>

      {/* emergency / summary banner */}
      {banner && (
        <div className="fixed left-0 right-0 bottom-6 z-40 flex justify-center">
          <div
            className="px-6 py-3 rounded-md shadow text-white text-sm md:text-base"
            style={{
              background:
                banner.tone === "crit" ? "#b91c1c" /* red-700 */ : "#374151" /* gray-700 */,
            }}
          >
            {banner.text}
          </div>
        </div>
      )}
    </>
  );
}
