# English comments only
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


def _get_env_float(name: str, default: float) -> float:
    try:
        return float(os.getenv(name, str(default)))
    except Exception:
        return default


@dataclass(frozen=True)
class HMConfig:
    # English comments only
    HR_HIGH: int
    HR_LOW: int
    NO_MEASURE_WINDOW_MIN: int
    HR_ALERT_COOLDOWN_MIN: int
    REMINDER_COOLDOWN_MIN: int

    # New vitals thresholds/cooldowns
    SPO2_LOW: int
    SPO2_ALERT_COOLDOWN_MIN: int
    TEMP_HIGH: float
    TEMP_ALERT_COOLDOWN_MIN: int

    START_SUBSCRIBER: bool
    START_SCHEDULER: bool
    DAILY_SUMMARY_AT: str


def load_config() -> HMConfig:
    # English comments only
    return HMConfig(
        HR_HIGH=_get_env_int("HR_HIGH", 130),
        HR_LOW=_get_env_int("HR_LOW", 45),
        NO_MEASURE_WINDOW_MIN=_get_env_int("NO_MEASURE_WINDOW_MIN", 180),
        HR_ALERT_COOLDOWN_MIN=_get_env_int("HR_ALERT_COOLDOWN_MIN", 10),
        REMINDER_COOLDOWN_MIN=_get_env_int("REMINDER_COOLDOWN_MIN", 30),

        SPO2_LOW=_get_env_int("SPO2_LOW", 92),  # alert if <= 92%
        SPO2_ALERT_COOLDOWN_MIN=_get_env_int("SPO2_ALERT_COOLDOWN_MIN", 10),

        TEMP_HIGH=_get_env_float("TEMP_HIGH", 38.0),  # Celsius, fever threshold
        TEMP_ALERT_COOLDOWN_MIN=_get_env_int("TEMP_ALERT_COOLDOWN_MIN", 30),

        START_SUBSCRIBER=_get_env_bool("START_SUBSCRIBER", True),
        START_SCHEDULER=_get_env_bool("START_SCHEDULER", True),
        DAILY_SUMMARY_AT=os.getenv("DAILY_SUMMARY_AT", "23:00"),
    )


def print_config(cfg: HMConfig) -> None:
    # English comments only
    print(
        "[hm] config:",
        f"HR_HIGH={cfg.HR_HIGH}",
        f"HR_LOW={cfg.HR_LOW}",
        f"NO_MEASURE_WINDOW_MIN={cfg.NO_MEASURE_WINDOW_MIN}",
        f"HR_ALERT_COOLDOWN_MIN={cfg.HR_ALERT_COOLDOWN_MIN}",
        f"REMINDER_COOLDOWN_MIN={cfg.REMINDER_COOLDOWN_MIN}",
        f"SPO2_LOW={cfg.SPO2_LOW}",
        f"SPO2_ALERT_COOLDOWN_MIN={cfg.SPO2_ALERT_COOLDOWN_MIN}",
        f"TEMP_HIGH={cfg.TEMP_HIGH}",
        f"TEMP_ALERT_COOLDOWN_MIN={cfg.TEMP_ALERT_COOLDOWN_MIN}",
        f"START_SUBSCRIBER={cfg.START_SUBSCRIBER}",
        f"START_SCHEDULER={cfg.START_SCHEDULER}",
        f"DAILY_SUMMARY_AT={cfg.DAILY_SUMMARY_AT}",
    )
