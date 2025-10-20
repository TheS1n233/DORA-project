# -*- coding: utf-8 -*-
# collector.py
# BLE Blood Pressure collector: subscribes to 0x2A35 and forwards to HM service.
# Tested with standard GATT BP profile devices; some vendors may customize packets.

import os
import asyncio
from datetime import datetime, timezone
from typing import Optional

from bleak import BleakClient, BleakScanner
import httpx

HM_BASE = os.getenv("HM_BASE", "http://localhost:8088")
USER_ID = os.getenv("USER_ID", "user-001")
DEVICE_NAME = os.getenv("DEVICE_NAME", "")          # Prefer name or set MAC
DEVICE_MAC = os.getenv("DEVICE_MAC", "")            # e.g. "AA:BB:CC:DD:EE:FF"

# GATT UUIDs for Blood Pressure Service / Measurement
UUID_BPS = "00001810-0000-1000-8000-00805f9b34fb"
UUID_BP_MEAS = "00002a35-0000-1000-8000-00805f9b34fb"

def parse_sfloat(b1: int, b2: int) -> float:
    # IEEE-11073 16-bit SFLOAT (mantissa 12-bit, exponent 4-bit signed)
    raw = (b2 << 8) | b1
    mantissa = raw & 0x0FFF
    if mantissa >= 0x0800:
        mantissa = mantissa - 0x1000
    exp = (raw >> 12) & 0x0F
    if exp >= 0x08:
        exp = exp - 0x10
    return mantissa * (10 ** exp)

def parse_bp_measurement(data: bytes):
    # Returns dict with systolic, diastolic, map, pulse (optional)
    # Flags
    # bit0: unit (0=mmHg,1=kPa)
    # bit1: timestamp present
    # bit2: pulse present
    # bit3: userId present
    # bit4: measurement status present
    i = 0
    flags = data[i]; i += 1
    unit = "kPa" if (flags & 0x01) else "mmHg"

    systolic = parse_sfloat(data[i], data[i+1]); i += 2
    diastolic = parse_sfloat(data[i], data[i+1]); i += 2
    map_v = parse_sfloat(data[i], data[i+1]); i += 2

    # Optional timestamp (7 bytes) if present
    if flags & 0x02:
        i += 7  # year(2), month, day, hour, min, sec

    pulse = None
    if flags & 0x04:
        pulse = parse_sfloat(data[i], data[i+1]); i += 2

    # Optional user id
    if flags & 0x08:
        i += 1

    # Optional measurement status (2 bytes)
    if flags & 0x10:
        i += 2

    return {
        "systolic": float(systolic if unit == "mmHg" else systolic * 7.50062),
        "diastolic": float(diastolic if unit == "mmHg" else diastolic * 7.50062),
        "map": float(map_v if unit == "mmHg" else map_v * 7.50062),
        "pulse": float(pulse) if pulse is not None else None,
        "unit": "mmHg"
    }

async def send_to_hm(device_id: str, bp: dict):
    payload = {
        "device_id": device_id,
        "user_id": USER_ID,
        "metric": "blood_pressure",
        **bp,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    async with httpx.AsyncClient(timeout=10) as cli:
        r = await cli.post(f"{HM_BASE}/v1/vitals", json=payload)
        r.raise_for_status()
        return r.json()

async def run():
    target = DEVICE_MAC
    if not target:
        if not DEVICE_NAME:
            print("Please set DEVICE_NAME or DEVICE_MAC env.")
            return
        print(f"Scanning for device name: {DEVICE_NAME} ...")
        devs = await BleakScanner.discover(timeout=8.0)
        for d in devs:
            if d.name and DEVICE_NAME.lower() in d.name.lower():
                target = d.address
                break
        if not target:
            print("Device not found.")
            return

    print(f"Connecting to {target} ...")
    async with BleakClient(target) as client:
        await client.is_connected()
        print("Connected. Subscribing to BP measurement notifications...")

        def handle(_, data: bytearray):
            try:
                bp = parse_bp_measurement(bytes(data))
                print(f"BP: {bp}")
                asyncio.create_task(send_to_hm(target, bp))
            except Exception as e:
                print(f"Parse error: {e}")

        await client.start_notify(UUID_BP_MEAS, handle)
        # Keep running
        while True:
            await asyncio.sleep(1)

if __name__ == "__main__":
    asyncio.run(run())

