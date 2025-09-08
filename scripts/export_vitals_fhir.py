import argparse
import json
import os
import sys
import time
import urllib.parse
import urllib.request


def parse_since(expr: str) -> int:
    """Parse '24h' / '30m' / '2d' or integer seconds to unix timestamp."""
    expr = expr.strip().lower()
    now = int(time.time())
    if expr.isdigit():
        val = int(expr)
        # treat as seconds ago when not a large epoch-like number
        return now - val if val < 10_000_000 else val
    try:
        num = float(expr[:-1])
        unit = expr[-1]
        mult = {"s": 1, "m": 60, "h": 3600, "d": 86400}[unit]
        return now - int(num * mult)
    except Exception:
        raise SystemExit(f"Invalid --since: {expr}")


def main() -> None:
    p = argparse.ArgumentParser(
        description="Export vitals to FHIR Bundle (JSON) via health-svc REST"
    )
    p.add_argument("--host", default="127.0.0.1", help="health-svc host")
    p.add_argument("--port", type=int, default=8100, help="health-svc port")
    p.add_argument(
        "--since", default="24h", help="time window, e.g. 24h/30m/2d or epoch seconds"
    )
    p.add_argument("--limit", type=int, default=200, help="max records")
    p.add_argument("--out", default="out/fhir_export.json", help="output json path")
    args = p.parse_args()

    since_ts = parse_since(args.since)
    q = urllib.parse.urlencode({"since": since_ts, "limit": args.limit})
    url = f"http://{args.host}:{args.port}/export/fhir?{q}"

    try:
        with urllib.request.urlopen(url, timeout=10) as resp:
            data = resp.read()
    except Exception as e:
        print(f"[export] http request failed: {e}", file=sys.stderr)
        sys.exit(2)

    try:
        obj = json.loads(data.decode("utf-8"))
    except Exception as e:
        print(f"[export] invalid json: {e}", file=sys.stderr)
        sys.exit(3)

    out_path = args.out
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
    print(f"[export] saved: {out_path} (total={obj.get('total')})")


if __name__ == "__main__":
    main()
