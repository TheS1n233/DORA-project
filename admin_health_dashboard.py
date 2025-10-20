#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# admin_health_dashboard.py
# 管理员健康数据查看仪表板

import requests
import json
from datetime import datetime, timedelta
import sys

# 配置
HM_BASE = "http://localhost:8088"
INFLUX_URL = "http://localhost:8086"

def get_daily_summary(user_id="user-001"):
    """获取日总结报告"""
    try:
        response = requests.get(f"{HM_BASE}/v1/vitals/summary/daily?user_id={user_id}")
        response.raise_for_status()
        return response.json()
    except Exception as e:
        return {"error": str(e)}

def get_fhir_data(user_id="user-001"):
    """获取FHIR格式数据"""
    try:
        response = requests.get(f"{HM_BASE}/v1/export/fhir/bp?user_id={user_id}")
        response.raise_for_status()
        return response.json()
    except Exception as e:
        return {"error": str(e)}

def simulate_blood_pressure(systolic, diastolic, pulse=72):
    """模拟血压数据"""
    try:
        payload = {
            "device_id": "admin-test-01",
            "user_id": "user-001",
            "metric": "blood_pressure",
            "systolic": systolic,
            "diastolic": diastolic,
            "pulse": pulse,
            "unit": "mmHg"
        }
        response = requests.post(f"{HM_BASE}/v1/vitals", json=payload)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        return {"error": str(e)}

def print_dashboard():
    """打印管理员仪表板"""
    print("=" * 60)
    print("🏥 DORA 健康监测系统 - 管理员仪表板")
    print("=" * 60)
    print(f"⏰ 时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # 获取日总结
    print("📊 今日健康总结:")
    summary = get_daily_summary()
    if "error" not in summary:
        if summary.get("blood_pressure"):
            bp = summary["blood_pressure"]
            print(f"   💓 血压: {bp.get('systolic_avg', 'N/A')}/{bp.get('diastolic_avg', 'N/A')} mmHg")
            print(f"   📈 测量次数: {bp.get('count', 0)}")
            if bp.get('pulse_avg'):
                print(f"   ❤️  平均心率: {bp.get('pulse_avg')} bpm")
        else:
            print("   📝 今日暂无血压数据")
    else:
        print(f"   ❌ 获取数据失败: {summary['error']}")
    
    print()
    print("🔧 管理员操作:")
    print("   1. 查看API文档: http://localhost:8088/docs")
    print("   2. 查看Home Assistant: http://localhost:8123")
    print("   3. 查看InfluxDB: http://localhost:8086")
    print("   4. 模拟血压数据 (见下方命令)")
    print()
    
    # 显示FHIR数据统计
    fhir_data = get_fhir_data()
    if "error" not in fhir_data and "entry" in fhir_data:
        print(f"📋 FHIR数据记录: {len(fhir_data['entry'])} 条")
        if fhir_data["entry"]:
            latest = fhir_data["entry"][-1]["resource"]
            components = latest.get("component", [])
            for comp in components:
                code = comp.get("code", {}).get("coding", [{}])[0].get("display", "")
                value = comp.get("valueQuantity", {}).get("value", "")
                unit = comp.get("valueQuantity", {}).get("unit", "")
                if code and value:
                    print(f"   {code}: {value} {unit}")
    else:
        print("   📝 暂无FHIR数据")
    
    print()
    print("🧪 测试命令:")
    print("   # 模拟正常血压")
    print("   python admin_health_dashboard.py test 120 80")
    print("   # 模拟高血压")
    print("   python admin_health_dashboard.py test 160 100")
    print("   # 模拟临界血压")
    print("   python admin_health_dashboard.py test 185 115")

def test_blood_pressure(systolic, diastolic, pulse=72):
    """测试血压数据"""
    print(f"🧪 测试血压数据: {systolic}/{diastolic} mmHg")
    result = simulate_blood_pressure(int(systolic), int(diastolic), int(pulse))
    
    if "error" not in result:
        print(f"✅ 数据已记录")
        print(f"   分类: {result.get('classification', 'N/A')}")
        print(f"   原因: {result.get('reason', 'N/A')}")
        
        # 根据分类显示警告
        classification = result.get('classification')
        if classification == 'critical':
            print("🚨 警告: 检测到临界血压值!")
        elif classification == 'warning':
            print("⚠️  注意: 检测到血压偏高")
        else:
            print("✅ 血压值正常")
    else:
        print(f"❌ 测试失败: {result['error']}")

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "test":
        if len(sys.argv) >= 4:
            test_blood_pressure(sys.argv[2], sys.argv[3], sys.argv[4] if len(sys.argv) > 4 else 72)
        else:
            print("用法: python admin_health_dashboard.py test <systolic> <diastolic> [pulse]")
    else:
        print_dashboard()


