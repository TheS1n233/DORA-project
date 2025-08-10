import base64
import json
import os
import secrets
from typing import Optional, Dict, Any

from cryptography.hazmat.primitives.ciphers.aead import AESGCM


def _load_key() -> Optional[bytes]:
    raw = os.getenv("HM_AES_KEY", "").strip()
    if not raw:
        return None
    # Try base64 then hex
    try:
        k = base64.b64decode(raw)
    except Exception:
        try:
            k = bytes.fromhex(raw)
        except Exception:
            return None
    if len(k) != 32:
        return None
    return k


def encrypt_json(obj: Dict[str, Any]) -> Dict[str, str]:
    """Return an encryption envelope; 'none' when key missing/invalid."""
    key = _load_key()
    if not key:
        return {"enc": "none", "json": json.dumps(obj, separators=(",", ":"))}
    iv = secrets.token_bytes(12)
    aead = AESGCM(key)
    data = json.dumps(obj, separators=(",", ":")).encode("utf-8")
    ct = aead.encrypt(iv, data, None)
    return {
        "enc": "aesgcm",
        "iv": base64.b64encode(iv).decode(),
        "ct": base64.b64encode(ct).decode(),
    }


def decrypt_json(envelope: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Decrypt envelope produced by encrypt_json(); return None if not possible."""
    try:
        enc = envelope.get("enc")
        if enc == "none":
            return json.loads(envelope.get("json", "{}"))
        if enc != "aesgcm":
            return None
        key = _load_key()
        if not key:
            return None
        iv = base64.b64decode(envelope.get("iv", ""))
        ct = base64.b64decode(envelope.get("ct", ""))
        aead = AESGCM(key)
        pt = aead.decrypt(iv, ct, None)
        return json.loads(pt.decode("utf-8"))
    except Exception:
        return None
