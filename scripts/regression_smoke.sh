#!/usr/bin/env bash
# English comments only
set -euo pipefail

HS="http://127.0.0.1:8000"
HM="http://127.0.0.1:8100"

pass=0; fail=0
_ok()  { echo "[OK] $*";   pass=$((pass+1)); }
_bad() { echo "[FAIL] $*" >&2; fail=$((fail+1)); }

json_get() { jq -r "$1" 2>/dev/null || echo ""; }

echo "[smoke] ping hs/hm"
curl -sf "$HS/ping" >/dev/null && _ok hs-ping || _bad hs-ping
curl -sf "$HM/ping" >/dev/null && _ok hm-ping || _bad hm-ping

echo
echo "[smoke] HS falls (angles) -> metrics"
before="$(curl -s "$HS/health/ready" | json_get '.metrics.falls_detected // 0')"
resp="$(curl -s -X POST "$HS/falls" -H 'Content-Type: application/json' \
  -d '{"angles":[150,150,130,104,100,95,90,85,80,75,70]}')"
echo "$resp" | jq . >/dev/null 2>&1 || true
if echo "$resp" | grep -q '"fall":true'; then
  _ok hs-falls-angles
else
  _bad hs-falls-angles
fi
sleep 1
after="$(curl -s "$HS/health/ready" | json_get '.metrics.falls_detected // 0')"
if [ "${after:-0}" -ge $(( ${before:-0} + 1 )) ]; then
  _ok hs-metrics-falls-increment
else
  _bad hs-metrics-falls-increment
fi

echo
echo "[smoke] HM vitals -> subscriber (and emergency if not cooled down)"
hm_ready="$(curl -s "$HM/health/ready")"
emg_before="$(echo "$hm_ready" | json_get '.metrics.emergencies_sent // 0')"
last_before="$(echo "$hm_ready" | json_get '.last_msg_ts // 0')"

python scripts/publish_vitals.py --metric hr --value 140 --unit bpm >/dev/null || true

emg_after="$emg_before"; last_after="$last_before"; seen=""
for i in $(seq 1 15); do
  hm_ready="$(curl -s "$HM/health/ready")"
  emg_after="$(echo "$hm_ready" | json_get '.metrics.emergencies_sent // 0')"
  last_after="$(echo "$hm_ready" | json_get '.last_msg_ts // 0')"
  if [ "$emg_after" != "$emg_before" ] || [ "$last_after" != "$last_before" ]; then
    seen="1"; break
  fi
  sleep 1
done
if [ -n "$seen" ]; then
  if [ "$emg_after" != "$emg_before" ]; then
    _ok hm-emergency-increment
  else
    _ok hm-subscriber-seen   # under cooldown, but subscriber updated last_msg_ts
  fi
else
  _bad hm-vitals-path
fi

echo
echo "[smoke] summary"
echo "PASS: $pass"
echo "FAIL: $fail"
test "$fail" -eq 0
