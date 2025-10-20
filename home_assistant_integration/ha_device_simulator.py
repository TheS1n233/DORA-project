#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# ha_device_simulator.py
# Simulate Home Assistant health devices for testing

import os
import json
import time
import random
import logging
from datetime import datetime
from typing import Dict, Any

import paho.mqtt.client as mqtt

# Configuration
MQTT_BROKER = os.getenv("MQTT_BROKER", "compose-mosquitto-ha")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
MQTT_USERNAME = os.getenv("MQTT_USERNAME", "")
MQTT_PASSWORD = os.getenv("MQTT_PASSWORD", "")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class HADeviceSimulator:
    def __init__(self):
        self.client = mqtt.Client()
        self.client.on_connect = self.on_connect
        self.client.on_disconnect = self.on_disconnect
        
        if MQTT_USERNAME and MQTT_PASSWORD:
            self.client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)
    
    def on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            logger.info("Connected to MQTT broker")
        else:
            logger.error(f"Failed to connect to MQTT broker: {rc}")
    
    def on_disconnect(self, client, userdata, rc):
        logger.warning(f"Disconnected from MQTT broker: {rc}")
    
    def simulate_blood_pressure(self):
        """Simulate Omron blood pressure monitor"""
        device_id = "omron_bp"
        
        # Simulate normal, warning, and critical readings
        scenarios = [
            {"systolic": 120, "diastolic": 80, "pulse": 72},  # Normal
            {"systolic": 145, "diastolic": 95, "pulse": 78},  # Warning
            {"systolic": 185, "diastolic": 115, "pulse": 85}, # Critical
            {"systolic": 110, "diastolic": 70, "pulse": 68},  # Normal
            {"systolic": 155, "diastolic": 100, "pulse": 82}, # Warning
        ]
        
        for i, reading in enumerate(scenarios):
            topic = f"homeassistant/sensor/{device_id}/blood_pressure/state"
            payload = json.dumps(reading)
            
            self.client.publish(topic, payload)
            logger.info(f"Published BP reading {i+1}: {reading}")
            time.sleep(5)  # Wait 5 seconds between readings
    
    def simulate_heart_rate(self):
        """Simulate Fitbit heart rate monitor"""
        device_id = "fitbit_hr"
        
        # Simulate heart rate readings
        heart_rates = [72, 78, 85, 68, 92, 75, 88, 70]
        
        for i, hr in enumerate(heart_rates):
            topic = f"homeassistant/sensor/{device_id}/heart_rate/state"
            payload = str(hr)
            
            self.client.publish(topic, payload)
            logger.info(f"Published HR reading {i+1}: {hr} bpm")
            time.sleep(3)
    
    def simulate_spo2(self):
        """Simulate Apple Watch SpO2 sensor"""
        device_id = "apple_watch"
        
        # Simulate SpO2 readings
        spo2_values = [98, 97, 96, 99, 95, 98, 97, 96]
        
        for i, spo2 in enumerate(spo2_values):
            topic = f"homeassistant/sensor/{device_id}/spo2/state"
            payload = str(spo2)
            
            self.client.publish(topic, payload)
            logger.info(f"Published SpO2 reading {i+1}: {spo2}%")
            time.sleep(4)
    
    def simulate_temperature(self):
        """Simulate body temperature sensor"""
        device_id = "apple_watch"
        
        # Simulate temperature readings
        temps = [36.5, 36.8, 37.1, 36.3, 37.2, 36.7, 36.9, 36.4]
        
        for i, temp in enumerate(temps):
            topic = f"homeassistant/sensor/{device_id}/temperature/state"
            payload = str(temp)
            
            self.client.publish(topic, payload)
            logger.info(f"Published temperature reading {i+1}: {temp}°C")
            time.sleep(6)
    
    def simulate_weight(self):
        """Simulate Xiaomi smart scale"""
        device_id = "xiaomi_scale"
        
        # Simulate weight readings
        weights = [70.5, 70.2, 70.8, 69.9, 71.1, 70.3, 70.7, 70.0]
        
        for i, weight in enumerate(weights):
            topic = f"homeassistant/sensor/{device_id}/weight/state"
            payload = str(weight)
            
            self.client.publish(topic, payload)
            logger.info(f"Published weight reading {i+1}: {weight} kg")
            time.sleep(8)
    
    def simulate_steps(self):
        """Simulate step counter"""
        device_id = "fitbit_hr"
        
        # Simulate step counts
        steps = [2500, 3200, 4100, 1800, 5500, 2800, 4700, 2200]
        
        for i, step_count in enumerate(steps):
            topic = f"homeassistant/sensor/{device_id}/steps/state"
            payload = str(step_count)
            
            self.client.publish(topic, payload)
            logger.info(f"Published steps reading {i+1}: {step_count} steps")
            time.sleep(10)
    
    def run_simulation(self):
        """Run complete health device simulation"""
        try:
            logger.info(f"Connecting to MQTT broker: {MQTT_BROKER}:{MQTT_PORT}")
            self.client.connect(MQTT_BROKER, MQTT_PORT, 60)
            self.client.loop_start()
            
            # Wait for connection
            time.sleep(2)
            
            logger.info("Starting health device simulation...")
            
            # Simulate all devices
            self.simulate_blood_pressure()
            time.sleep(2)
            self.simulate_heart_rate()
            time.sleep(2)
            self.simulate_spo2()
            time.sleep(2)
            self.simulate_temperature()
            time.sleep(2)
            self.simulate_weight()
            time.sleep(2)
            self.simulate_steps()
            
            logger.info("Simulation completed!")
            
        except KeyboardInterrupt:
            logger.info("Simulation stopped by user")
        except Exception as e:
            logger.error(f"Error in simulation: {e}")
        finally:
            self.client.loop_stop()
            self.client.disconnect()

if __name__ == "__main__":
    simulator = HADeviceSimulator()
    simulator.run_simulation()
