import React, { useState, useEffect } from 'react';

export default function HealthDataMonitor({ onPersonChange }) {
  const [selectedPerson, setSelectedPerson] = useState('ms-zhang'); // Default to MS.Zhang
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Hardcoded person data (not from HA)
  const personData = {
    'ms-zhang': {
      name: 'MS.Zhang',
      data: {
        bodyTemperature: { state: '38.2' },
        heartRate: { state: '105.0' },
        spo2: { state: '91.0' },
        glucose: { state: '6.5' },
        hrv: { state: '50.0' },
        eda: { state: '0.8' },
        sleepScore: { state: '70.0' },
        steps: { state: '2500.0' },
        systolic: { state: '145.0' },
        diastolic: { state: '95.0' },
        pulse: { state: '80.0' },
        indoorTemp: { state: '28.0' },
        indoorHumidity: { state: '75.0' },
        gasConcentration: { state: '100.0' }
      }
    },
    'mrs-ma': {
      name: 'MRS.Ma',
      data: {
        bodyTemperature: { state: '36.8' },
        heartRate: { state: '72.0' },
        spo2: { state: '98.0' },
        glucose: { state: '5.2' },
        hrv: { state: '65.0' },
        eda: { state: '0.5' },
        sleepScore: { state: '85.0' },
        steps: { state: '4500.0' },
        systolic: { state: '125.0' },
        diastolic: { state: '82.0' },
        pulse: { state: '75.0' },
        indoorTemp: { state: '23.0' },
        indoorHumidity: { state: '55.0' },
        gasConcentration: { state: '25.0' }
      }
    },
    'mr-li': {
      name: 'MR.Li',
      data: {
        bodyTemperature: { state: '37.1' },
        heartRate: { state: '88.0' },
        spo2: { state: '96.0' },
        glucose: { state: '5.8' },
        hrv: { state: '55.0' },
        eda: { state: '0.7' },
        sleepScore: { state: '78.0' },
        steps: { state: '3200.0' },
        systolic: { state: '135.0' },
        diastolic: { state: '88.0' },
        pulse: { state: '78.0' },
        indoorTemp: { state: '24.5' },
        indoorHumidity: { state: '60.0' },
        gasConcentration: { state: '45.0' }
      }
    }
  };

  // Fetch data from HA (for MS.Zhang only)
  const fetchHealthDataFromHA = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/health-data');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Fetched health data from HA:', result);
      setHealthData(result);
    } catch (err) {
      console.error('❌ Failed to fetch health data from HA:', err);
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  // Load data for selected person
  const loadPersonData = () => {
    if (selectedPerson === 'ms-zhang') {
      // MS.Zhang: fetch from HA
      fetchHealthDataFromHA();
    } else {
      // Others: use hardcoded data
      setLoading(true);
      setTimeout(() => {
        const person = personData[selectedPerson];
        if (person) {
          setHealthData({ data: person.data });
        }
        setLoading(false);
      }, 100);
    }
  };

  // Notify parent when person changes
  useEffect(() => {
    onPersonChange?.(selectedPerson);
  }, [selectedPerson, onPersonChange]);

  // Refresh when person changes
  useEffect(() => {
    loadPersonData();
    const interval = setInterval(loadPersonData, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [selectedPerson]);

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

      {/* Person Selection Dropdown */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Person
        </label>
        <select
          value={selectedPerson}
          onChange={(e) => setSelectedPerson(e.target.value)}
          className="w-64 p-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base bg-white shadow-sm"
        >
          <option value="ms-zhang">MS.Zhang</option>
          <option value="mrs-ma">MRS.Ma</option>
          <option value="mr-li">MR.Li</option>
        </select>
      </div>

      {/* Refresh Indicator */}
      <div className="mb-6">
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <span className="text-green-500">●</span>
          <span>Refresh (5s) - Enabled</span>
        </div>
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

