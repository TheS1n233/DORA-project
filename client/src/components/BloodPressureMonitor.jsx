// English comments only
import React, { useState, useEffect } from 'react';
import HealthStatCard from './HealthStatCard.jsx';

export default function BloodPressureMonitor() {
  const [bpData, setBpData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // ---- Directly call Home Assistant REST API (ignore security in dev) ----
  // You can set these via:
  // 1) Vite env: VITE_HA_BASE_URL, VITE_HA_TOKEN
  // 2) Global window: window.__HA_BASE_URL, window.__HA_TOKEN
  // 3) LocalStorage (dev console): localStorage.setItem('HA_TOKEN','<token>')
  const HA_BASE_URL =
    (import.meta && import.meta.env && import.meta.env.VITE_HA_BASE_URL) ||
    (typeof window !== 'undefined' && window.__HA_BASE_URL) ||
    'http://localhost:8123';

  const HA_TOKEN =
    (import.meta && import.meta.env && import.meta.env.VITE_HA_TOKEN) ||
    (typeof window !== 'undefined' && window.__HA_TOKEN) ||
    (typeof localStorage !== 'undefined' && localStorage.getItem('HA_TOKEN')) ||
    '';

  // Candidate entity ids
  const DIRECT_BP_CANDIDATES = [
    'sensor.blood_pressure',
    'sensor.omron_blood_pressure',
    'sensor.bp_monitor',
  ];
  const SYS_CANDIDATES = [
    'sensor.dora_bp_sys',
    'sensor.bp_systolic',
    'sensor.blood_pressure_systolic',
    'sensor.systolic',
  ];
  const DIA_CANDIDATES = [
    'sensor.dora_bp_dia',
    'sensor.bp_diastolic',
    'sensor.blood_pressure_diastolic',
    'sensor.diastolic',
  ];
  const HR_CANDIDATES = [
    'sensor.dora_bp_hr',
    'sensor.blood_pressure_pulse',
    'sensor.pulse',
    'sensor.heart_rate',
  ];

  // Build list to fetch
  const ENTITY_LIST = [
    ...DIRECT_BP_CANDIDATES,
    ...SYS_CANDIDATES,
    ...DIA_CANDIDATES,
    ...HR_CANDIDATES,
  ];

  // Generic HA GET helper
  const haGetState = async (entityId) => {
    const url = `${String(HA_BASE_URL).replace(/\/+$/, '')}/api/states/${encodeURIComponent(entityId)}`;
    const headers = {
      'Content-Type': 'application/json',
    };
    if (HA_TOKEN) headers['Authorization'] = `Bearer ${HA_TOKEN}`;
    const res = await fetch(url, { method: 'GET', headers, cache: 'no-store' });
    if (!res.ok) {
      // 404 means entity not found; let caller handle
      const text = await res.text().catch(() => '');
      const err = new Error(`HA ${res.status} ${res.statusText} for ${entityId}: ${text}`);
      err.status = res.status;
      throw err;
    }
    return res.json();
  };

  // 使用HA数据读取服务获取数据
  const fetchBPData = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('🔍 从HA数据读取服务获取血压数据...');
      const response = await fetch('/api/bp-data');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('📊 HA数据读取服务响应:', result);
      
      if (!result.success) {
        throw new Error(result.error || '获取数据失败');
      }
      
      const { data } = result;
      
      // 构建summary格式以兼容现有解析逻辑
      const summary = {};
      
      if (data.systolic && data.systolic.state) {
        summary['sensor.bp_systolic'] = {
          value: data.systolic.state,
          unit: 'mmHg',
          friendly_name: data.systolic.attributes?.friendly_name || 'Systolic BP',
          last_changed: data.systolic.last_changed,
          attributes: data.systolic.attributes || {},
        };
      }
      
      if (data.diastolic && data.diastolic.state) {
        summary['sensor.bp_diastolic'] = {
          value: data.diastolic.state,
          unit: 'mmHg',
          friendly_name: data.diastolic.attributes?.friendly_name || 'Diastolic BP',
          last_changed: data.diastolic.last_changed,
          attributes: data.diastolic.attributes || {},
        };
      }
      
      if (data.pulse && data.pulse.state) {
        summary['sensor.pulse'] = {
          value: data.pulse.state,
          unit: data.pulse.attributes?.unit_of_measurement || 'bpm',
          friendly_name: data.pulse.attributes?.friendly_name || 'Pulse Rate',
          last_changed: data.pulse.last_changed,
          attributes: data.pulse.attributes || {},
        };
      }
      
      // 组合血压数据
      const sVal = data.systolic ? Number(data.systolic.state) : null;
      const dVal = data.diastolic ? Number(data.diastolic.state) : null;
      const pVal = data.pulse ? Number(data.pulse.state) : null;
      
      if (Number.isFinite(sVal) && Number.isFinite(dVal)) {
        summary['sensor.blood_pressure'] = {
          value: `${sVal}/${dVal}`,
          unit: 'mmHg',
          friendly_name: 'Blood Pressure (composed)',
          last_changed: data.systolic?.last_changed || data.diastolic?.last_changed || new Date().toISOString(),
          attributes: Object.assign({}, Number.isFinite(pVal) ? { pulse: pVal } : {}),
        };
      }

      setBpData({ ts: new Date().toISOString(), summary });
      console.log('✅ 血压数据更新成功:', { sVal, dVal, pVal });
      
    } catch (err) {
      console.error('❌ Failed to fetch BP data from HA service:', err);
      setError(err.message || String(err));
      alert(`获取健康数据失败: ${err.message || String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  // Simulate blood pressure data via health service; keep as-is
  const simulateBP = async () => {
    setLoading(true);
    setError(null);

    try {
      const systolic = Math.floor(Math.random() * 60) + 120; // 120-180
      const diastolic = Math.floor(Math.random() * 30) + 80;  // 80-110
      const pulse = Math.floor(Math.random() * 20) + 70;       // 70-90

      const response = await fetch('/v1/vitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: 'admin-simulator',
          user_id: 'user-001',
          metric: 'blood_pressure',
          systolic,
          diastolic,
          pulse,
          unit: 'mmHg'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Simulated BP data:', result);

      // Refresh data after simulation
      setTimeout(fetchBPData, 1000);
    } catch (err) {
      setError(err.message);
      console.error('Failed to simulate BP data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Auto refresh + initial fetch once on mount
  useEffect(() => {
    // initial load once
    fetchBPData();

    let interval;
    if (autoRefresh) {
      interval = setInterval(fetchBPData, 5000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh]);

  // Classification
  const getBPClassification = (systolic, diastolic) => {
    if (systolic >= 180 || diastolic >= 110) {
      return { class: 'critical', text: '🚨 Critical', color: 'text-red-600' };
    } else if (systolic >= 140 || diastolic >= 90) {
      return { class: 'warning', text: '⚠️ High', color: 'text-yellow-600' };
    } else {
      return { class: 'normal', text: '✅ Normal', color: 'text-green-600' };
    }
  };

  // Parse data from local summary
  const getBPData = () => {
    if (!bpData?.summary) return null;

    const sum = bpData.summary;

    // 1) direct blood pressure sensor like "120/80"
    const directKey = ['sensor.blood_pressure', 'sensor.omron_blood_pressure', 'sensor.bp_monitor']
      .find(k => sum[k] && sum[k].value != null);

    if (directKey) {
      const raw = String(sum[directKey].value);
      const [s, d] = raw.split('/').map(v => parseFloat(v));
      const pulseAttr = sum[directKey].attributes && sum[directKey].attributes.pulse;
      if (!Number.isNaN(s) && !Number.isNaN(d)) {
        return {
          systolic: s,
          diastolic: d,
          pulse: pulseAttr != null ? Number(pulseAttr) : null,
          unit: sum[directKey].unit || 'mmHg',
          last_changed: sum[directKey].last_changed
        };
      }
    }

    // 2) compose from separate systolic/diastolic
    const sysKey = ['sensor.bp_systolic', 'sensor.dora_bp_sys', 'sensor.bp_systolic', 'sensor.blood_pressure_systolic', 'sensor.systolic']
      .find(k => sum[k] && sum[k].value != null);
    const diaKey = ['sensor.bp_diastolic', 'sensor.dora_bp_dia', 'sensor.bp_diastolic', 'sensor.blood_pressure_diastolic', 'sensor.diastolic']
      .find(k => sum[k] && sum[k].value != null);
    const hrKey = ['sensor.pulse', 'sensor.dora_bp_hr', 'sensor.blood_pressure_pulse', 'sensor.pulse', 'sensor.heart_rate']
      .find(k => sum[k] && sum[k].value != null);

    const sVal = sysKey ? Number(sum[sysKey].value) : null;
    const dVal = diaKey ? Number(sum[diaKey].value) : null;
    const pVal = hrKey ? Number(sum[hrKey].value) : null;

    if (Number.isFinite(sVal) && Number.isFinite(dVal)) {
      return {
        systolic: sVal,
        diastolic: dVal,
        pulse: Number.isFinite(pVal) ? pVal : null,
        unit: 'mmHg',
        last_changed: sum[sysKey]?.last_changed || sum[diaKey]?.last_changed
      };
    }

    return null;
  };

  const bpDataParsed = getBPData();
  const classification = bpDataParsed ?
    getBPClassification(bpDataParsed.systolic, bpDataParsed.diastolic) :
    null;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-xl">💓 Blood Pressure Monitor</h2>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            Auto refresh
          </label>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={fetchBPData}
          disabled={loading}
          className="btn btn-sm"
        >
          {loading ? 'Loading...' : 'Refresh Data'}
        </button>
        <button
          onClick={simulateBP}
          disabled={loading}
          className="btn btn-sm bg-blue-500 hover:bg-blue-600 text-white"
        >
          Simulate BP
        </button>
      </div>

      {/* Error display */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          Error: {error}
        </div>
      )}

      {/* Blood pressure display */}
      {bpDataParsed ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <HealthStatCard
              title="Systolic"
              value={bpDataParsed.systolic}
              unit="mmHg"
              hint="Upper pressure"
            />
            <HealthStatCard
              title="Diastolic"
              value={bpDataParsed.diastolic}
              unit="mmHg"
              hint="Lower pressure"
            />
          </div>

          {bpDataParsed.pulse != null && (
            <HealthStatCard
              title="Pulse Rate"
              value={bpDataParsed.pulse}
              unit="bpm"
              hint="Heart rate"
            />
          )}

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
            <span className="font-medium">Data Source: Home Assistant (REST)</span>
            {classification && (
              <span className={`font-bold ${classification.color}`}>
                {classification.text}
              </span>
            )}
          </div>

          {bpDataParsed.last_changed && (
            <div className="text-xs text-gray-500 text-center">
              Last updated: {new Date(bpDataParsed.last_changed).toLocaleString()}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p>No blood pressure data available</p>
          <p className="text-sm mt-2">Click "Refresh Data" to fetch from Home Assistant</p>
        </div>
      )}

      {/* Raw data (collapsible) */}
      {bpData && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
            View Raw Data
          </summary>
          <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
            {JSON.stringify(bpData, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}
