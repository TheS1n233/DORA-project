set -euo pipefail

echo "waiting hs svc on :8000 …"
for i in {1..30}; do
  if curl -sf http://127.0.0.1:8000/ping >/dev/null; then break; fi
  sleep 1
done
echo "✅ ping ok"

echo "POST /falls (normal angles) → expect fall=false"
resp=$(curl -sf -X POST http://127.0.0.1:8000/falls \
  -H 'Content-Type: application/json' \
  -d '{"angles":[150,148,152,149,151,150,149,150], "source":"smoke"}')
echo "$resp" | tee /tmp/out.json
grep -q '"fall":[[:space:]]*false' /tmp/out.json && echo "✅ fall=false" || { echo "❌ unexpected fall result"; exit 1; }
