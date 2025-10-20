# -*- coding: utf-8 -*-
# influx.py
# InfluxDB client wrapper.

import os
from typing import Dict, Any, List
from influxdb_client import InfluxDBClient, Point, WritePrecision
from influxdb_client.client.write_api import SYNCHRONOUS

INFLUX_URL = os.getenv("INFLUX_URL", "http://localhost:8086")
INFLUX_TOKEN = os.getenv("INFLUX_TOKEN", "dev-token")
INFLUX_ORG = os.getenv("INFLUX_ORG", "dora")
INFLUX_BUCKET = os.getenv("INFLUX_BUCKET", "vitals")

_client = InfluxDBClient(url=INFLUX_URL, token=INFLUX_TOKEN, org=INFLUX_ORG)
_write_api = _client.write_api(write_options=SYNCHRONOUS)
_query_api = _client.query_api()

def write_vital(measurement: str, tags: Dict[str, str], fields: Dict[str, Any], ts=None):
    p = Point(measurement)
    for k, v in tags.items():
        p = p.tag(k, v)
    for k, v in fields.items():
        p = p.field(k, v)
    if ts is not None:
        p = p.time(ts, WritePrecision.NS)
    _write_api.write(bucket=INFLUX_BUCKET, record=p)

def query_table(flux: str) -> List[Dict[str, Any]]:
    tables = _query_api.query(org=INFLUX_ORG, query=flux)
    rows = []
    for table in tables:
        for record in table.records:
            # Safely get values with defaults
            values = record.values or {}
            rows.append({
                "measurement": values.get("_measurement", ""),
                "field": values.get("_field", ""),
                "value": values.get("_value"),
                "time": values.get("_time"),
                **{k: v for k, v in values.items() if not k.startswith("_")}
            })
    return rows
