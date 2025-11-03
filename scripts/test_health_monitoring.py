#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# test_health_monitoring.py
# Test script for health monitoring service

import requests
import json
import time
from datetime import datetime

# Configuration
HM_BASE = "http://localhost:8088"
USER_ID = "user-001"

def test_ingest_bp():
    """Test blood pressure ingestion"""
    print("🧪 Testing blood pressure ingestion...")
    
    # Test normal BP
    payload = {
        "device_id": "demo-bp-01",
        "user_id": USER_ID,
        "metric": "blood_pressure",
        "systolic": 120,
        "diastolic": 80,
        "pulse": 72,
        "unit": "mmHg"
    }
    
    response = requests.post(f"{HM_BASE}/v1/vitals", json=payload)
    print(f"Normal BP response: {response.status_code} - {response.json()}")
    
    # Test warning BP
    payload["systolic"] = 145
    payload["diastolic"] = 95
    
    response = requests.post(f"{HM_BASE}/v1/vitals", json=payload)
    print(f"Warning BP response: {response.status_code} - {response.json()}")
    
    # Test critical BP
    payload["systolic"] = 185
    payload["diastolic"] = 115
    
    response = requests.post(f"{HM_BASE}/v1/vitals", json=payload)
    print(f"Critical BP response: {response.status_code} - {response.json()}")

def test_daily_summary():
    """Test daily summary"""
    print("\n📊 Testing daily summary...")
    
    response = requests.get(f"{HM_BASE}/v1/vitals/summary/daily?user_id={USER_ID}")
    print(f"Daily summary response: {response.status_code}")
    if response.status_code == 200:
        print(f"Summary: {json.dumps(response.json(), indent=2)}")

def test_fhir_export():
    """Test FHIR export"""
    print("\n🏥 Testing FHIR export...")
    
    response = requests.get(f"{HM_BASE}/v1/export/fhir/bp?user_id={USER_ID}")
    print(f"FHIR export response: {response.status_code}")
    if response.status_code == 200:
        fhir_data = response.json()
        print(f"FHIR Bundle type: {fhir_data.get('resourceType')}")
        print(f"Number of observations: {len(fhir_data.get('entry', []))}")

def test_redis_alerts():
    """Test Redis alert channel"""
    print("\n🚨 Testing Redis alerts...")
    try:
        import redis
        r = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
        
        # Subscribe to alerts channel
        pubsub = r.pubsub()
        pubsub.subscribe('alerts.health')
        
        print("Listening for alerts for 5 seconds...")
        for message in pubsub.listen():
            if message['type'] == 'message':
                print(f"Alert received: {message['data']}")
                break
    except ImportError:
        print("Redis client not available, skipping alert test")
    except Exception as e:
        print(f"Redis test failed: {e}")

def main():
    print("🏥 DORA Health Monitoring Service Test")
    print("=" * 50)
    
    # Wait a moment for services to be ready
    print("Waiting for services to be ready...")
    time.sleep(2)
    
    try:
        test_ingest_bp()
        test_daily_summary()
        test_fhir_export()
        test_redis_alerts()
        
        print("\n✅ All tests completed!")
        
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to health monitoring service.")
        print("Make sure the service is running on http://localhost:8088")
    except Exception as e:
        print(f"❌ Test failed: {e}")

if __name__ == "__main__":
    main()

