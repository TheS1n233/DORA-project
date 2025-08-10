# English comments only
import os
import time
import urllib.parse
import urllib.request
from typing import Dict

_LAST_SENT_TS: Dict[str, float] = {"normal": 0.0, "high": 0.0}


def _env(name: str, default: str = "") -> str:
    return os.getenv(name, default)


def _cooldown_ok(priority: str) -> bool:
    try:
        cooldown = int(_env("NOTIFY_COOLDOWN_SEC", "10"))
    except Exception:
        cooldown = 10
    now = time.time()
    last = _LAST_SENT_TS.get(priority, 0.0)
    if now - last < cooldown:
        print(f"[notify] skipped due to cooldown ({priority})")
        return False
    _LAST_SENT_TS[priority] = now
    return True


def notify(text: str, priority: str = "normal") -> None:
    token = _env("TELEGRAM_TOKEN")
    chat_id = _env("TELEGRAM_CHAT_ID")
    prefix = "[EMERGENCY] " if priority == "high" else "[ALERT] "
    message = f"{prefix}{text} @ {time.strftime('%H:%M:%S')}"

    if not token or not chat_id:
        # Console fallback for local dev
        print(f"[notify] {message}")
        return

    if not _cooldown_ok(priority):
        return

    url = f"https://api.telegram.org/bot{token}/sendMessage"
    data = {
        "chat_id": chat_id,
        "text": message,
        "disable_web_page_preview": "true",
        "parse_mode": "HTML",
    }
    payload = urllib.parse.urlencode(data).encode("utf-8")

    try:
        retries = int(_env("NOTIFY_RETRY", "3"))
    except Exception:
        retries = 3

    for i in range(max(1, retries)):
        try:
            req = urllib.request.Request(url, data=payload)
            with urllib.request.urlopen(req, timeout=10) as resp:
                _ = resp.read()
            print("[notify] telegram sent")
            break
        except Exception as e:
            if i == retries - 1:
                print(f"[notify] telegram failed after {retries} attempts: {e}")
            else:
                time.sleep(1.0 + i)
