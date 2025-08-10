import os
import redis

_redis = None


def get_redis() -> redis.Redis:
    """Return a singleton sync Redis client."""
    global _redis
    if _redis is None:
        host = os.getenv("REDIS_HOST", "redis")
        port = int(os.getenv("REDIS_PORT", "6379"))
        db = int(os.getenv("REDIS_DB", "0"))
        _redis = redis.Redis(host=host, port=port, db=db, decode_responses=True)
    return _redis
