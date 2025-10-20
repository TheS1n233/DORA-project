import React, { useState, useEffect, useCallback } from 'react';

/**
 * Home Assistant 血压监控组件
 * 从HA读取血压数据并实时显示
 */

const HABloodPressureMonitor = () => {
  // 状态管理
  const [bpData, setBpData] = useState({
    systolic: null,
    diastolic: null,
    pulse: null,
    lastUpdate: null
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  // HA数据读取服务配置
  const HA_READER_URL = 'http://localhost:9098';

  // 获取血压数据
  const fetchBPData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📊 从HA获取血压数据...');
      const response = await fetch(`${HA_READER_URL}/api/bp-data`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setBpData({
          systolic: result.data.systolic,
          diastolic: result.data.diastolic,
          pulse: result.data.pulse,
          lastUpdate: new Date().toISOString()
        });
        setConnectionStatus('connected');
        console.log('✅ 血压数据获取成功:', result.data);
      } else {
        throw new Error(result.error || '获取数据失败');
      }
    } catch (err) {
      console.error('❌ 获取血压数据失败:', err);
      setError(err.message);
      setConnectionStatus('error');
    } finally {
      setLoading(false);
    }
  }, []);

  // 测试HA连接
  const testHAConnection = useCallback(async () => {
    try {
      console.log('🧪 测试HA连接...');
      const response = await fetch(`${HA_READER_URL}/api/test-ha`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ HA连接正常:', result.message);
        setConnectionStatus('connected');
        return true;
      } else {
        throw new Error(result.error || 'HA连接失败');
      }
    } catch (err) {
      console.error('❌ HA连接测试失败:', err);
      setConnectionStatus('error');
      return false;
    }
  }, []);

  // 获取单个血压参数
  const fetchSingleParam = useCallback(async (param) => {
    try {
      console.log(`📊 获取${param}数据...`);
      const response = await fetch(`${HA_READER_URL}/api/bp-data/${param}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setBpData(prev => ({
          ...prev,
          [param]: result.data,
          lastUpdate: new Date().toISOString()
        }));
        console.log(`✅ ${param}数据获取成功:`, result.data);
      } else {
        throw new Error(result.error || `获取${param}数据失败`);
      }
    } catch (err) {
      console.error(`❌ 获取${param}数据失败:`, err);
      setError(err.message);
    }
  }, []);

  // 初始化
  useEffect(() => {
    testHAConnection();
  }, [testHAConnection]);

  // 自动刷新数据（每30秒）
  useEffect(() => {
    const interval = setInterval(() => {
      if (connectionStatus === 'connected') {
        fetchBPData();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchBPData, connectionStatus]);

  // 渲染血压数据
  const renderBPValue = (data, label, unit = '') => {
    if (!data) {
      return (
        <div className="bp-value">
          <span className="label">{label}:</span>
          <span className="value no-data">无数据</span>
        </div>
      );
    }

    return (
      <div className="bp-value">
        <span className="label">{label}:</span>
        <span className="value">
          {data.state || data.value || 'N/A'}
          {unit && <span className="unit">{unit}</span>}
        </span>
        <div className="meta">
          <small>更新时间: {new Date(data.last_updated || data.lastUpdate).toLocaleString()}</small>
        </div>
      </div>
    );
  };

  // 连接状态指示器
  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return '#4CAF50';
      case 'error': return '#F44336';
      case 'disconnected': return '#FF9800';
      default: return '#9E9E9E';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return '已连接';
      case 'error': return '连接错误';
      case 'disconnected': return '未连接';
      default: return '未知状态';
    }
  };

  return (
    <div className="ha-bp-monitor">
      <div className="monitor-header">
        <h2>🏥 血压监控 (Home Assistant)</h2>
        <div className="connection-status">
          <div 
            className="status-indicator" 
            style={{ backgroundColor: getStatusColor() }}
          ></div>
          <span>{getStatusText()}</span>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <strong>❌ 错误:</strong> {error}
        </div>
      )}

      <div className="bp-data">
        {renderBPValue(bpData.systolic, '收缩压', 'mmHg')}
        {renderBPValue(bpData.diastolic, '舒张压', 'mmHg')}
        {renderBPValue(bpData.pulse, '脉搏', 'bpm')}
      </div>

      <div className="monitor-controls">
        <button 
          onClick={fetchBPData} 
          disabled={loading}
          className="refresh-btn"
        >
          {loading ? '🔄 获取中...' : '📊 刷新数据'}
        </button>
        
        <button 
          onClick={testHAConnection}
          className="test-btn"
        >
          🧪 测试连接
        </button>

        <div className="individual-controls">
          <button 
            onClick={() => fetchSingleParam('systolic')}
            className="param-btn"
          >
            📈 收缩压
          </button>
          <button 
            onClick={() => fetchSingleParam('diastolic')}
            className="param-btn"
          >
            📉 舒张压
          </button>
          <button 
            onClick={() => fetchSingleParam('pulse')}
            className="param-btn"
          >
            💓 脉搏
          </button>
        </div>
      </div>

      {bpData.lastUpdate && (
        <div className="last-update">
          <small>最后更新: {new Date(bpData.lastUpdate).toLocaleString()}</small>
        </div>
      )}

      <style jsx>{`
        .ha-bp-monitor {
          max-width: 600px;
          margin: 20px auto;
          padding: 20px;
          border: 1px solid #ddd;
          border-radius: 8px;
          background: #f9f9f9;
        }

        .monitor-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .connection-status {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .status-indicator {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }

        .error-message {
          background: #ffebee;
          color: #c62828;
          padding: 10px;
          border-radius: 4px;
          margin-bottom: 20px;
        }

        .bp-data {
          display: grid;
          gap: 15px;
          margin-bottom: 20px;
        }

        .bp-value {
          background: white;
          padding: 15px;
          border-radius: 6px;
          border-left: 4px solid #2196F3;
        }

        .bp-value .label {
          font-weight: bold;
          color: #333;
          display: block;
          margin-bottom: 5px;
        }

        .bp-value .value {
          font-size: 24px;
          font-weight: bold;
          color: #1976D2;
        }

        .bp-value .value.no-data {
          color: #999;
          font-size: 16px;
        }

        .bp-value .unit {
          font-size: 14px;
          color: #666;
          margin-left: 5px;
        }

        .bp-value .meta {
          margin-top: 5px;
          color: #666;
        }

        .monitor-controls {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .refresh-btn, .test-btn {
          padding: 10px 20px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          transition: background-color 0.3s;
        }

        .refresh-btn {
          background: #2196F3;
          color: white;
        }

        .refresh-btn:hover:not(:disabled) {
          background: #1976D2;
        }

        .refresh-btn:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .test-btn {
          background: #4CAF50;
          color: white;
        }

        .test-btn:hover {
          background: #45a049;
        }

        .individual-controls {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .param-btn {
          flex: 1;
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          background: white;
          cursor: pointer;
          font-size: 12px;
          transition: background-color 0.3s;
        }

        .param-btn:hover {
          background: #f0f0f0;
        }

        .last-update {
          text-align: center;
          color: #666;
          margin-top: 15px;
        }
      `}</style>
    </div>
  );
};

export default HABloodPressureMonitor;






