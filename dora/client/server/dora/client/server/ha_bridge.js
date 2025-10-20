/**
 * DORA HA Bridge - Proxy Home Assistant REST API to Admin frontend
 * - Avoid exposing HA token to the browser.
 * - Provide simple GET endpoints for entity states and a health summary.
 * - No change to your existing server; run this file standalone.
 */

const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load .env then overlay .env.ha (if exists)
dotenv.config();
const haEnvPath = path.resolve(process.cwd(), '.env.ha');
if (fs.existsSync(haEnvPath)) {
  dotenv.config({ path: haEnvPath });
}

const app = express();
app.use(cors()); // Allow cross-origin by default; restrict in production if needed

// ----- Config -----
const HA_BASE_URL = (process.env.HA_BASE_URL || 'http://localhost:8123').replace(/\/+$/, '');
const HA_TOKEN = process.env.HA_TOKEN || '';
const PORT = Number(process.env.HA_BRIDGE_PORT || 9099);

// Default entity ids (you can override via HA_ENTITIES env in CSV)
const DEFAULT_ENTITIES = [
  'sensor.heart_rate',
  'sensor.glucose',
  'sensor.spo2',
  'sensor.body_temperature',
];

// Parse CSV from env or use defaults
const HA_ENTITIES = (process.env.HA_ENTITIES || DEFAULT_ENTITIES.join(','))
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

// ----- Helpers -----
function requireToken(req, res) {
  if (!HA_TOKEN) {
    res.status(500).json({ error: 'HA_TOKEN not set. Create a Home Assistant long-lived access token and put it in .env or .env.ha' });
    return false;
  }
  return true;
}

async function haGet(apiPath) {
  // Use global fetch (Node 18+)
  const url = `${HA_BASE_URL}${apiPath}`;
  const r = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${HA_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });
  if (!r.ok) {
    const text = await r.text().catch(() => '');
    const err = new Error(`HA request failed: ${r.status} ${r.statusText} ${text}`);
    err.status = r.status;
    throw err;
  }
  return r.json();
}

function pickState(obj) {
  // Normalize Home Assistant state object
  return {
    entity_id: obj.entity_id,
    state: obj.state,
    last_changed: obj.last_changed || obj.time || null,
    unit: obj.attributes && obj.attributes.unit_of_measurement || null,
    friendly_name: obj.attributes && obj.attributes.friendly_name || obj.entity_id,
    attributes: obj.attributes || {},
  };
}

// ----- Routes -----
// Health check
app.get('/ha/health', (_req, res) => {
  res.json({ ok: true, ha_base_url: HA_BASE_URL, entities: HA_ENTITIES });
});

// Proxy: GET /ha/states  -> HA /api/states
app.get('/ha/states', async (req, res) => {
  if (!requireToken(req, res)) return;
  try {
    const data = await haGet('/api/states');
    res.json(data.map(pickState));
  } catch (e) {
    res.status(e.status || 500).json({ error: String(e.message || e) });
  }
});

// Proxy: GET /ha/states/:entity_id  -> HA /api/states/<entity_id>
app.get('/ha/states/:entity_id', async (req, res) => {
  if (!requireToken(req, res)) return;
  // Support dots in :entity_id (e.g., sensor.heart_rate)
  const entityId = req.params.entity_id;
  try {
    const data = await haGet(`/api/states/${encodeURIComponent(entityId)}`);
    res.json(pickState(data));
  } catch (e) {
    res.status(e.status || 500).json({ error: String(e.message || e) });
  }
});

// Convenience: GET /ha/state?entity_id=sensor.heart_rate
app.get('/ha/state', async (req, res) => {
  if (!requireToken(req, res)) return;
  const entityId = String(req.query.entity_id || '').trim();
  if (!entityId) return res.status(400).json({ error: 'missing entity_id' });
  try {
    const data = await haGet(`/api/states/${encodeURIComponent(entityId)}`);
    res.json(pickState(data));
  } catch (e) {
    res.status(e.status || 500).json({ error: String(e.message || e) });
  }
});

// Aggregated summary for typical vital signs
// GET /ha/health/summary
app.get('/ha/health/summary', async (req, res) => {
  if (!requireToken(req, res)) return;
  // Entities can be overridden by query: ?entities=sensor.a,sensor.b
  const q = String(req.query.entities || '').trim();
  const list = q ? q.split(',').map(s => s.trim()).filter(Boolean) : HA_ENTITIES;

  try {
    const results = await Promise.allSettled(
      list.map(eid => haGet(`/api/states/${encodeURIComponent(eid)}`))
    );

    const summary = {};
    results.forEach((r, idx) => {
      const key = list[idx];
      if (r.status === 'fulfilled') {
        const st = pickState(r.value);
        summary[key] = {
          value: st.state,
          unit: st.unit,
          friendly_name: st.friendly_name,
          last_changed: st.last_changed,
          attributes: st.attributes,
        };
      } else {
        summary[key] = { error: String(r.reason && r.reason.message || r.reason || 'unknown') };
      }
    });

    res.json({
      ts: new Date().toISOString(),
      entities: list,
      summary,
    });
  } catch (e) {
    res.status(e.status || 500).json({ error: String(e.message || e) });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`[dora-ha-bridge] listening on http://0.0.0.0:${PORT}`);
  console.log(`[dora-ha-bridge] HA_BASE_URL=${HA_BASE_URL}`);
  console.log(`[dora-ha-bridge] Entities=${HA_ENTITIES.join(', ')}`);
});
