#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# ha_mqtt_bridge.py
# Home Assistant MQTT Bridge for Health Monitoring
# Subscribes to HA MQTT topics and forwards to DORA health monitoring service

import os
import json
import time
import logging
from datetime import datetime
from typing import Dict, Any, Optional

import paho.mqtt.client as mqtt
import requests

# Configuration
MQTT_BROKER = os.getenv("MQTT_BROKER", "localhost")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
MQTT_USERNAME = os.getenv("MQTT_USERNAME", "")
MQTT_PASSWORD = os.getenv("MQTT_PASSWORD", "")

HM_SERVICE_URL = os.getenv("HM_SERVICE_URL", "http://localhost:8088")
USER_ID = os.getenv("USER_ID", "user-001")

# Home Assistant MQTT topics for health devices
TOPICS = {
    "blood_pressure": "homeassistant/sensor/+/blood_pressure/state",
    "heart_rate": "homeassistant/sensor/+/heart_rate/state", 
    "spo2": "homeassistant/sensor/+/spo2/state",
    "temperature": "homeassistant/sensor/+/temperature/state",
    "weight": "homeassistant/sensor/+/weight/state",
    "steps": "homeassistant/sensor/+/steps/state"
}

# Device mapping (device_id -> device_name)
DEVICE_MAPPING = {
    "omron_bp": "Omron Blood Pressure Monitor",
    "fitbit_hr": "Fitbit Heart Rate",
    "apple_watch": "Apple Watch",
    "xiaomi_scale": "Xiaomi Smart Scale"
}

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class HAMQTTBridge:
    def __init__(self):
        self.client = mqtt.Client()
        self.client.on_connect = self.on_connect
        self.client.on_message = self.on_message
        self.client.on_disconnect = self.on_disconnect
        
        if MQTT_USERNAME and MQTT_PASSWORD:
            self.client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)
    
    def on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            logger.info("Connected to MQTT broker")
            # Subscribe to all health device topics
            for topic in TOPICS.values():
                client.subscribe(topic)
                logger.info(f"Subscribed to {topic}")
        else:
            logger.error(f"Failed to connect to MQTT broker: {rc}")
    
    def on_disconnect(self, client, userdata, rc):
        logger.warning(f"Disconnected from MQTT broker: {rc}")
    
    def on_message(self, client, userdata, msg):
        try:
            topic = msg.topic
            payload = msg.payload.decode('utf-8')
            
            logger.info(f"Received from {topic}: {payload}")
            
            # Parse Home Assistant MQTT message
            data = self.parse_ha_message(topic, payload)
            if data:
                # Forward to DORA health monitoring service
                self.forward_to_hm_service(data)
                
        except Exception as e:
            logger.error(f"Error processing message: {e}")
    
    def parse_ha_message(self, topic: str, payload: str) -> Optional[Dict[str, Any]]:
        """Parse Home Assistant MQTT message and convert to DORA format"""
        try:
            # Extract device info from topic
            # Format: homeassistant/sensor/{device_id}/{metric}/state
            parts = topic.split('/')
            if len(parts) < 5:
                return None
            
            device_id = parts[2]
            metric = parts[3]
            
            # Parse payload (could be JSON or simple value)
            try:
                value_data = json.loads(payload)
                if isinstance(value_data, dict):
                    value = value_data.get('value', value_data.get('state'))
                else:
                    value = value_data
            except json.JSONDecodeError:
                value = payload
            
            # Convert metric names to DORA format
            metric_mapping = {
                "blood_pressure": "blood_pressure",
                "heart_rate": "heart_rate", 
                "spo2": "spo2",
                "temperature": "temperature",
                "weight": "weight",
                "steps": "steps"
            }
            
            dora_metric = metric_mapping.get(metric)
            if not dora_metric:
                return None
            
            # Special handling for blood pressure
            if metric == "blood_pressure":
                return self.parse_blood_pressure(device_id, value)
            else:
                return {
                    "device_id": device_id,
                    "user_id": USER_ID,
                    "metric": dora_metric,
                    "value": float(value) if value else None,
                    "unit": self.get_unit_for_metric(dora_metric),
                    "timestamp": datetime.now().isoformat()
                }
                
        except Exception as e:
            logger.error(f"Error parsing HA message: {e}")
            return None
    
    def parse_blood_pressure(self, device_id: str, value) -> Optional[Dict[str, Any]]:
        """Parse blood pressure data from Home Assistant"""
        try:
            if isinstance(value, dict):
                # Handle structured BP data
                systolic = value.get('systolic')
                diastolic = value.get('diastolic')
                pulse = value.get('pulse')
            elif isinstance(value, str) and '/' in value:
                # Handle "120/80" format
                parts = value.split('/')
                systolic = float(parts[0])
                diastolic = float(parts[1])
                pulse = None
            else:
                logger.warning(f"Unknown blood pressure format: {value}")
                return None
            
            return {
                "device_id": device_id,
                "user_id": USER_ID,
                "metric": "blood_pressure",
                "systolic": float(systolic),
                "diastolic": float(diastolic),
                "pulse": float(pulse) if pulse is not None else None,
                "unit": "mmHg",
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"Error parsing blood pressure: {e}")
            return None
    
    def get_unit_for_metric(self, metric: str) -> str:
        """Get appropriate unit for metric"""
        units = {
            "heart_rate": "bpm",
            "spo2": "%",
            "temperature": "°C",
            "weight": "kg",
            "steps": "count"
        }
        return units.get(metric, "")
    
    def forward_to_hm_service(self, data: Dict[str, Any]):
        """Forward data to DORA health monitoring service"""
        try:
            response = requests.post(
                f"{HM_SERVICE_URL}/v1/vitals",
                json=data,
                timeout=10
            )
            response.raise_for_status()
            
            result = response.json()
            logger.info(f"Forwarded to HM service: {result}")
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to forward to HM service: {e}")
        except Exception as e:
            logger.error(f"Error forwarding data: {e}")
    
    def run(self):
        """Start the MQTT bridge"""
        try:
            logger.info(f"Connecting to MQTT broker: {MQTT_BROKER}:{MQTT_PORT}")
            self.client.connect(MQTT_BROKER, MQTT_PORT, 60)
            self.client.loop_forever()
        except KeyboardInterrupt:
            logger.info("Shutting down...")
            self.client.disconnect()
        except Exception as e:
            logger.error(f"Error running bridge: {e}")

if __name__ == "__main__":
    bridge = HAMQTTBridge()
    bridge.run()


