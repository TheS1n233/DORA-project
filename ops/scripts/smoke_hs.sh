set -euo pipefail

echo "waiting svc …"
for i in {1..15}; do
  if curl -sf http://localhost:8001/ping >/dev/null; then break; fi
  sleep 2
done
echo "✅ ping ok"

echo "detect-fall (sample_stand)"
curl -sf -F "img=@server/home-safety-svc/tests/resources/sample_stand.jpg" \
     http://localhost:8001/detect-fall | tee /tmp/out.json
grep -q '"fall":[[:space:]]*false' /tmp/out.json && echo "✅ fall=false" || {
  echo "❌ fall result unexpected"; exit 1; }