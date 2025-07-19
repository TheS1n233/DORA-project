import redis.asyncio as redis

_redis = None


def get_redis() -> redis.Redis:
    global _redis
    if _redis is None:
        _redis = redis.Redis(host="redis", decode_responses=True)
    return _redis
