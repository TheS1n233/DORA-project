#!/usr/bin/env bash
set -euo pipefail

ROOM="${ROOM:-demo}"
TV_API="${TV_API:-http://127.0.0.1:8200}"
TA_API="${TA_API:-http://127.0.0.1:8300}"

post_json() {
  local url="$1"
  local body="$2"
  curl -sS -X POST "$url" \
       -H 'Content-Type: application/json' \
       --data-raw "$body"
}

echo "[1] tv-svc: POST /api/intent (room=$ROOM)"
post_json "$TV_API/api/intent?broadcast=1&cowatch=1" "{\"text\":\"load /static/sample.mp4\",\"room\":\"$ROOM\"}"; echo
post_json "$TV_API/api/intent?broadcast=1&cowatch=1" "{\"text\":\"play\",\"room\":\"$ROOM\"}"; echo
post_json "$TV_API/api/intent?broadcast=1&cowatch=1" "{\"text\":\"pause\",\"room\":\"$ROOM\"}"; echo

echo "[2] tele-assist-svc: forward /api/intent -> tv-svc (room=$ROOM)"
post_json "$TA_API/api/intent" "{\"text\":\"play\",\"room\":\"$ROOM\"}"; echo
