from __future__ import annotations

import os
from dataclasses import dataclass


def _get_env_bool(name: str, default: bool) -> bool:
    v = os.getenv(name)
    if v is None:
        return default
    return v.lower() in ("1", "true", "yes", "on")


def _get_env_int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, str(default)))
    except Exception:
        return default


# English comments only
def _get_env_int_any(names: list[str], default: int) -> int:
    for n in names:
        try:
            return int(os.getenv(n))  # may raise
        except Exception:
            continue
    return default


def _get_env_bool_any(names: list[str], default: bool) -> bool:
    for n in names:
        v = os.getenv(n)
        if v is not None:
            return v.lower() in ("1", "true", "yes", "on")
    return default


@dataclass(frozen=True)
class HSConfig:
    GAS_WARN_LEVEL: int
    COOLDOWN_GAS_MIN: int
    COOLDOWN_WATER_MIN: int
    COOLDOWN_POWER_MIN: int
    START_SUBSCRIBER: bool


def load_config() -> HSConfig:
    return HSConfig(
        GAS_WARN_LEVEL=_get_env_int_any(
            ["HS_GAS_WARN_LEVEL", "HAZARD_LEVEL_THRESHOLD"], 70
        ),
        COOLDOWN_GAS_MIN=_get_env_int_any(
            ["HS_COOLDOWN_GAS_MIN", "COOLDOWN_GAS_MIN"], 5
        ),
        COOLDOWN_WATER_MIN=_get_env_int_any(
            ["HS_COOLDOWN_WATER_MIN", "COOLDOWN_WATER_MIN"], 5
        ),
        COOLDOWN_POWER_MIN=_get_env_int_any(
            ["HS_COOLDOWN_POWER_MIN", "COOLDOWN_POWER_MIN"], 10
        ),
        START_SUBSCRIBER=_get_env_bool_any(
            ["HS_START_SUBSCRIBER", "START_SUBSCRIBER"], True
        ),
    )


def print_config(cfg: HSConfig) -> None:
    # English comments only
    print(
        "[hs] config:",
        f"GAS_WARN_LEVEL={cfg.GAS_WARN_LEVEL}",
        f"COOLDOWN_GAS_MIN={cfg.COOLDOWN_GAS_MIN}",
        f"COOLDOWN_WATER_MIN={cfg.COOLDOWN_WATER_MIN}",
        f"COOLDOWN_POWER_MIN={cfg.COOLDOWN_POWER_MIN}",
        f"START_SUBSCRIBER={cfg.START_SUBSCRIBER}",
    )
