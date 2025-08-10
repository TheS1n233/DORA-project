import os
from functools import lru_cache
from redis import Redis


@lru_cache(maxsize=1)
def get_redis() -> Redis:
    host = os.getenv("REDIS_HOST", "127.0.0.1")
    port = int(os.getenv("REDIS_PORT", "6379"))
    return Redis(host=host, port=port, decode_responses=True)
