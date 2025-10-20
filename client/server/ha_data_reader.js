#!/usr/bin/env node
/**
 * Home Assistant Data Reader Service
 * 独立服务：读取HA中的血压数据并提供API接口
 */

const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

// ----- 配置 -----
const HA_BASE_URL = process.env.HA_BASE_URL || 'http://localhost:8123';
const HA_TOKEN = process.env.HA_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiI4YjFlYjUwMTlkYjI0MTM2YjAwYjc2ZTVlNjRjZDBkNyIsImlhdCI6MTc1OTI4NzYwOSwiZXhwIjoyMDc0NjQ3NjA5fQ.BeX8HQ5nFLEfbe4AquNth4DfRJEFDmzvxa-6GIk2VaE';
const PORT = process.env.HA_READER_PORT || 9098;

// 血压相关实体ID
const BP_ENTITIES = {
  systolic: 'input_number.bp_systolic',
  diastolic: 'input_number.bp_diastolic', 
  pulse: 'input_number.pulse'
};

// 所有健康数据实体ID
const HEALTH_ENTITIES = {
  // 健康监测数据
  bodyTemperature: 'input_number.dora_body_temperature_c',
  eda: 'input_number.dora_eda_usiemens',
  glucose: 'input_number.input_number_dora_glucose_mgdl',
  heartRate: 'input_number.dora_heart_rate_bpm',
  hrv: 'input_number.dora_hrv_rmssd_ms',
  spo2: 'input_number.dora_spo2_percent',
  sleepScore: 'input_number.dora_sleep_score',
  steps: 'input_number.dora_steps_today',
  
  // 环境监测数据
  indoorTemp: 'input_number.dora_indoor_temp_c',
  indoorHumidity: 'input_number.dora_indoor_humidity_percent',
  gasConcentration: 'input_number.dora_gas_ppm',
  
  // 血压数据
  systolic: 'input_number.bp_systolic',
  diastolic: 'input_number.bp_diastolic',
  pulse: 'input_number.pulse'
};

// ----- Express应用 -----
const app = express();

// 中间件
app.use(cors());
app.use(express.json());

// ----- HA API 客户端 -----
const haClient = axios.create({
  baseURL: HA_BASE_URL,
  headers: {
    'Authorization': `Bearer ${HA_TOKEN}`,
    'Content-Type': 'application/json'
  },
  timeout: 5000
});

// ----- 工具函数 -----
async function fetchHAEntity(entityId) {
  try {
    const response = await haClient.get(`/api/states/${entityId}`);
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error(`❌ 获取实体 ${entityId} 失败:`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

async function fetchAllBPData() {
  console.log('📊 获取所有血压数据...');
  
  const results = {};
  const promises = Object.entries(BP_ENTITIES).map(async ([key, entityId]) => {
    const result = await fetchHAEntity(entityId);
    results[key] = result;
  });
  
  await Promise.all(promises);
  return results;
}

// ----- API 路由 -----

// 健康检查
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'HA Data Reader',
    timestamp: new Date().toISOString()
  });
});

// 获取所有血压数据
app.get('/api/bp-data', async (req, res) => {
  try {
    console.log('📊 请求血压数据...');
    const bpData = await fetchAllBPData();
    
    // 检查是否有失败的请求
    const failedEntities = Object.entries(bpData)
      .filter(([key, result]) => !result.success)
      .map(([key, result]) => key);
    
    if (failedEntities.length > 0) {
      console.warn(`⚠️ 部分实体获取失败: ${failedEntities.join(', ')}`);
    }
    
    // 构建响应数据
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        systolic: bpData.systolic.success ? bpData.systolic.data : null,
        diastolic: bpData.diastolic.success ? bpData.diastolic.data : null,
        pulse: bpData.pulse.success ? bpData.pulse.data : null
      },
      errors: failedEntities.length > 0 ? failedEntities : null
    };
    
    res.json(response);
  } catch (error) {
    console.error('❌ 获取血压数据失败:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 获取单个血压参数
app.get('/api/bp-data/:param', async (req, res) => {
  const { param } = req.params;
  
  if (!BP_ENTITIES[param]) {
    return res.status(400).json({
      success: false,
      error: `无效参数: ${param}. 支持: ${Object.keys(BP_ENTITIES).join(', ')}`
    });
  }
  
  try {
    const entityId = BP_ENTITIES[param];
    const result = await fetchHAEntity(entityId);
    
    if (result.success) {
      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        data: result.data
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error(`❌ 获取 ${param} 数据失败:`, error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 测试HA连接
app.get('/api/test-ha', async (req, res) => {
  try {
    console.log('🧪 测试HA连接...');
    const response = await haClient.get('/api/');
    
    res.json({
      success: true,
      message: 'HA连接正常',
      ha_version: response.headers['x-home-assistant-version'] || 'unknown',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ HA连接测试失败:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 获取所有可用实体（调试用）
app.get('/api/entities', async (req, res) => {
  try {
    const response = await haClient.get('/api/states');
    const entities = response.data
      .filter(state => state.entity_id.startsWith('input_number.'))
      .map(state => ({
        entity_id: state.entity_id,
        name: state.attributes.friendly_name || state.entity_id,
        state: state.state,
        unit: state.attributes.unit_of_measurement || null
      }));
    
    res.json({
      success: true,
      entities,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ 获取实体列表失败:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ----- 获取所有健康数据 -----
app.get('/api/health-data', async (req, res) => {
  try {
    console.log('📊 获取所有健康数据...');
    
    const healthData = {};
    const errors = [];
    
    // 并行获取所有健康数据
    const promises = Object.entries(HEALTH_ENTITIES).map(async ([key, entityId]) => {
      try {
        const response = await haClient.get(`/api/states/${entityId}`);
        
        healthData[key] = {
          state: response.data.state,
          attributes: response.data.attributes,
          last_changed: response.data.last_changed,
          last_updated: response.data.last_updated
        };
        
        console.log(`✅ ${key}: ${response.data.state}`);
      } catch (error) {
        console.error(`❌ ${key} (${entityId}):`, error.message);
        errors.push(key);
        healthData[key] = null;
      }
    });
    
    await Promise.all(promises);
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: healthData,
      errors: errors
    });
    
  } catch (error) {
    console.error('❌ 获取健康数据失败:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ----- 启动服务 -----
app.listen(PORT, () => {
  console.log('🚀 HA数据读取服务启动成功!');
  console.log(`📡 服务地址: http://localhost:${PORT}`);
  console.log(`🏠 HA地址: ${HA_BASE_URL}`);
  console.log(`🔑 Token: ${HA_TOKEN ? '已配置' : '❌ 未配置'}`);
  console.log('');
  console.log('📋 可用接口:');
  console.log(`  GET  /health          - 健康检查`);
  console.log(`  GET  /api/bp-data     - 获取所有血压数据`);
  console.log(`  GET  /api/bp-data/:param - 获取单个血压参数 (systolic/diastolic/pulse)`);
  console.log(`  GET  /api/health-data - 获取所有健康数据`);
  console.log(`  GET  /api/test-ha     - 测试HA连接`);
  console.log(`  GET  /api/entities    - 获取所有input_number实体`);
  console.log('');
  console.log('🔧 环境变量:');
  console.log(`  HA_BASE_URL=${HA_BASE_URL}`);
  console.log(`  HA_TOKEN=${HA_TOKEN ? '已设置' : '未设置'}`);
  console.log(`  HA_READER_PORT=${PORT}`);
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n🛑 正在关闭HA数据读取服务...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 正在关闭HA数据读取服务...');
  process.exit(0);
});


