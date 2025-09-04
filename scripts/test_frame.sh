#!/usr/bin/env bash
# English comments only
set -euo pipefail
HS_URL="${HS_URL:-http://127.0.0.1:8000}"

# Wait until service is live
until curl -sf "${HS_URL}/health/live" >/dev/null; do sleep 1; done

# Build JSON and stream via stdin to avoid ARG_MAX limit
if [[ $# -ge 1 && -f "$1" ]]; then
  # stream base64 -> wrap as JSON -> POST
  printf "[test_frame] POST %s/falls/frame (file: %s)\n" "$HS_URL" "$1"
  base64 -w0 "$1" | awk '{printf "{\"image_b64\":\"%s\"}\n",$0}' \
    | curl -sS -X POST "${HS_URL}/falls/frame" \
        -H 'Content-Type: application/json' \
        --data-binary @- \
        -w '\n%{http_code}\n'
else
  # tiny 1x1 transparent PNG as fallback
  printf "[test_frame] POST %s/falls/frame (tiny fallback)\n" "$HS_URL"
  printf '{"image_b64":"%s"}\n' \
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=" \
    | curl -sS -X POST "${HS_URL}/falls/frame" \
        -H 'Content-Type: application/json' \
        --data-binary @- \
        -w '\n%{http_code}\n'
fi
