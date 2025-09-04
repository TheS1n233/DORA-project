# English comments only
import os
import time
import urllib.parse
import urllib.request
from typing import Dict

# Local send cooldown in-process (per priority)
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
    if now - last >= cooldown:
        _LAST_SENT_TS[priority] = now
        return True
    return False


def notify(msg: str, priority: str = "normal") -> bool:
    """
    English comments only:
    - Return True on success, False otherwise.
    - Print presence of env, not the values.
    """
    prefix = "[ALERT]" if priority != "high" else "[EMERGENCY]"
    now_local = time.strftime("%H:%M:%S", time.localtime())
    printable = f"{prefix} {msg} @ {now_local}"
    print(f"[notify] {printable}")

    if not _cooldown_ok(priority):
        print("[notify] cooldown skip (local process)")
        return False

    token = _env("TELEGRAM_TOKEN", "")
    chat_id = _env("TELEGRAM_CHAT_ID", "")
    has_token = bool(token)
    has_chat = bool(chat_id)
    print(f"[notify] HAS_TOKEN={has_token} HAS_CHAT={has_chat}")
    if not has_token or not has_chat:
        print("[notify] skip: missing TELEGRAM_TOKEN or TELEGRAM_CHAT_ID")
        return False

    base = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = urllib.parse.urlencode({"chat_id": chat_id, "text": printable}).encode("utf-8")
    retries = 3
    for i in range(retries):
        try:
            req = urllib.request.Request(base, data=payload)
            with urllib.request.urlopen(req, timeout=10) as resp:
                _ = resp.read()
            print("[notify] telegram sent")
            return True
        except Exception as e:
            if i == retries - 1:
                print(f"[notify] telegram failed after {retries} attempts: {e}")
            else:
                time.sleep(1.0 + i)
    return False
