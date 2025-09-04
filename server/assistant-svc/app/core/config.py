# English comments only
import os
from dataclasses import dataclass

@dataclass
class Settings:
    tv_host: str = os.getenv("TV_HOSTNAME", "127.0.0.1")
    tv_port: int = int(os.getenv("TV_PORT", "8200"))
    service_name: str = "assistant"
    version: str = os.getenv("ASSISTANT_VERSION", "0.1.0")

def get_settings() -> Settings:
    return Settings()
