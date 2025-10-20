import React, { useState, useEffect } from 'react';

export default function HealthDataMonitor() {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Entity mapping
  const HEALTH_ENTITIES = {
    // health
    bodyTemperature: 'input_number.dora_body_temperature_c',
    eda: 'input_number.dora_eda_usiemens',
    glucose: 'input_number.dora_glucose_mgdl',
    heartRate: 'input_number.dora_heart_rate_bpm',
    hrv: 'input_number.dora_hrv_rmssd_ms',
    spo2: 'input_number.dora_spo2_percent',
    sleepScore: 'input_number.dora_sleep_score',
    steps: 'input_number.dora_steps_today',
    
    // environment
    indoorTemp: 'input_number.dora_indoor_temp_c',
    indoorHumidity: 'input_number.dora_indoor_humidity_percent',
    gasConcentration: 'input_number.dora_gas_ppm',
    
    // blood pressure
    systolic: 'input_number.bp_systolic',
    diastolic: 'input_number.bp_diastolic',
    pulse: 'input_number.pulse'
  };

  // fetch all health data
  const fetchHealthData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/health-data');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Fetched health data:', result);
      setHealthData(result);
    } catch (err) {
      console.error('❌ Failed to fetch health data:', err);
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  // simulate
  const simulateHealthData = async () => {
    setLoading(true);
    setError(null);

    try {
      const simulatedData = {
        bodyTemperature: (30 + Math.random() * 15).toFixed(1),
        eda: (Math.random() * 20).toFixed(1),
        glucose: Math.floor(Math.random() * 100) + 40,
        heartRate: Math.floor(Math.random() * 40) + 60,
        hrv: Math.floor(Math.random() * 100) + 10,
        spo2: Math.floor(Math.random() * 10) + 90,
        sleepScore: Math.floor(Math.random() * 30) + 60,
        steps: Math.floor(Math.random() * 5000),
        indoorTemp: (15 + Math.random() * 25).toFixed(1),
        indoorHumidity: Math.floor(Math.random() * 100),
        gasConcentration: Math.floor(Math.random() * 500),
        systolic: Math.floor(Math.random() * 60) + 120,
        diastolic: Math.floor(Math.random() * 30) + 80,
        pulse: Math.floor(Math.random() * 20) + 70
      };

      const response = await fetch('/v1/vitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: 'admin-simulator',
          user_id: 'user-001',
          metric: 'comprehensive_health',
          ...simulatedData,
          unit: 'mixed'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Simulated health data sent:', result);
      setTimeout(fetchHealthData, 1000);
    } catch (err) {
      setError(err.message);
      console.error('❌ Failed to simulate health data:', err);
    } finally {
      setLoading(false);
    }
  };

  // auto refresh
  useEffect(() => {
    fetchHealthData();
    let interval;
    if (autoRefresh) interval = setInterval(fetchHealthData, 5000);
    return () => { if (interval) clearInterval(interval); };
  }, [autoRefresh]);

  // classification labels
  const getDataClassification = (value, type) => {
    switch (type) {
      case 'bodyTemperature':
        if (value >= 37.5) return { class: 'warning', text: 'Fever', color: 'text-yellow-600' };
        if (value >= 36.0) return { class: 'normal', text: 'Normal', color: 'text-green-600' };
        return { class: 'critical', text: 'Low temperature', color: 'text-red-600' };
      case 'heartRate':
        if (value >= 100) return { class: 'warning', text: 'High heart rate', color: 'text-yellow-600' };
        if (value >= 60) return { class: 'normal', text: 'Normal', color: 'text-green-600' };
        return { class: 'warning', text: 'Low heart rate', color: 'text-yellow-600' };
      case 'spo2':
        if (value < 95) return { class: 'critical', text: 'Low SpO2', color: 'text-red-600' };
        if (value < 98) return { class: 'warning', text: 'Slightly low', color: 'text-yellow-600' };
        return { class: 'normal', text: 'Normal', color: 'text-green-600' };
      case 'glucose':
        if (value >= 140) return { class: 'warning', text: 'High glucose', color: 'text-yellow-600' };
        if (value >= 70) return { class: 'normal', text: 'Normal', color: 'text-green-600' };
        return { class: 'warning', text: 'Low glucose', color: 'text-yellow-600' };
      default:
        return { class: 'normal', text: 'Normal', color: 'text-green-600' };
    }
  };

  // data card
  const renderDataCard = (title, value, unit, type, icon) => {
    if (value === undefined || value === null || value === '') {
      return (
        <div key={title} className="bg-white rounded-lg shadow-md p-4 border-l-4 border-gray-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{icon}</span>
              <div>
                <h3 className="text-sm font-medium text-gray-600">{title}</h3>
                <p className="text-2xl font-bold text-gray-400">
                  No data <span className="text-sm text-gray-500">{unit}</span>
                </p>
              </div>
            </div>
            <div className="text-sm font-medium text-gray-500">
              ❌ No data
            </div>
          </div>
        </div>
      );
    }

    const classification = getDataClassification(parseFloat(value), type);
    
    return (
      <div key={title} className="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{icon}</span>
            <div>
              <h3 className="text-sm font-medium text-gray-600">{title}</h3>
              <p className="text-2xl font-bold text-gray-900">
                {value} <span className="text-sm text-gray-500">{unit}</span>
              </p>
            </div>
          </div>
          <div className={`text-sm font-medium ${classification.color}`}>
            {classification.text}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Health Dashboard</h2>
        <p className="text-gray-600">Real-time health and environment data</p>
      </div>

      {/* Controls */}
      <div className="mb-6 flex space-x-4">
        <button
          onClick={fetchHealthData}
          disabled={loading}
          className="btn btn-sm bg-blue-500 hover:bg-blue-600 text-white"
        >
          {loading ? 'Loading...' : 'Refresh Data'}
        </button>
        <button
          onClick={simulateHealthData}
          disabled={loading}
          className="btn btn-sm bg-green-500 hover:bg-green-600 text-white"
        >
          {loading ? 'Simulating...' : 'Simulate All Data'}
        </button>
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm text-gray-600">Auto Refresh (5s)</span>
        </label>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Data grids */}
      {healthData && healthData.data && (
        <div className="space-y-6">
          {/* health */}
          <div>
            <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              🏥 Health metrics
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {renderDataCard('Body temperature', healthData.data?.bodyTemperature?.state, '°C', 'bodyTemperature', '🌡️')}
              {renderDataCard('Heart rate', healthData.data?.heartRate?.state, 'bpm', 'heartRate', '💓')}
              {renderDataCard('SpO2', healthData.data?.spo2?.state, '%', 'spo2', '🫁')}
              {renderDataCard('Glucose', healthData.data?.glucose?.state, 'mg/dL', 'glucose', '🩸')}
              {renderDataCard('HRV', healthData.data?.hrv?.state, 'ms', 'hrv', '📊')}
              {renderDataCard('EDA', healthData.data?.eda?.state, 'μS', 'eda', '⚡')}
              {renderDataCard('Sleep score', healthData.data?.sleepScore?.state, '', 'sleepScore', '😴')}
              {renderDataCard('Steps today', healthData.data?.steps?.state, '', 'steps', '👟')}
            </div>
          </div>

          {/* blood pressure */}
          <div>
            <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              💓 Blood pressure
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {renderDataCard('Systolic', healthData.data?.systolic?.state, 'mmHg', 'systolic', '🔴')}
              {renderDataCard('Diastolic', healthData.data?.diastolic?.state, 'mmHg', 'diastolic', '🔵')}
              {renderDataCard('Pulse', healthData.data?.pulse?.state, 'bpm', 'pulse', '💗')}
            </div>
          </div>

          {/* environment */}
          <div>
            <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              🌡️ Environment
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {renderDataCard('Indoor temperature', healthData.data?.indoorTemp?.state, '°C', 'indoorTemp', '🌡️')}
              {renderDataCard('Indoor humidity', healthData.data?.indoorHumidity?.state, '%', 'indoorHumidity', '💧')}
              {renderDataCard('Gas concentration', healthData.data?.gasConcentration?.state, 'ppm', 'gasConcentration', '🌪️')}
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && !healthData && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <p className="mt-2 text-gray-600">Loading health data...</p>
        </div>
      )}
    </div>
  );
}

