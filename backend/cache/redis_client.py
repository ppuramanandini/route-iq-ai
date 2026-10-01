import os
import time
import logging
import threading
from typing import Optional, Any

logger = logging.getLogger("switchrouteiq.cache")

try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    redis = None
    REDIS_AVAILABLE = False


class InMemoryCache:
    """Thread-safe in-memory cache with TTL and locking fallback."""
    def __init__(self):
        self._store = {}
        self._lock = threading.Lock()

    def get(self, key: str) -> Optional[str]:
        with self._lock:
            if key not in self._store:
                return None
            val, expiry = self._store[key]
            if expiry is not None and time.time() > expiry:
                del self._store[key]
                return None
            return val

    def set(self, key: str, value: str, ex: Optional[int] = None) -> bool:
        with self._lock:
            expiry = time.time() + ex if ex is not None else None
            self._store[key] = (str(value), expiry)
            return True

    def setnx(self, key: str, value: str) -> bool:
        with self._lock:
            if key in self._store:
                val, expiry = self._store[key]
                if expiry is None or time.time() <= expiry:
                    return False
            self._store[key] = (str(value), None)
            return True

    def delete(self, key: str) -> bool:
        with self._lock:
            if key in self._store:
                del self._store[key]
                return True
            return False

    def exists(self, key: str) -> bool:
        return self.get(key) is not None

    def flush(self):
        with self._lock:
            self._store.clear()


class RedisClient:
    """
    Robust Redis Client with automatic fallback to in-memory cache
    if Redis server is unreachable or offline.
    """
    def __init__(self):
        self.redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        self._client = None
        self._in_memory = InMemoryCache()
        self.is_connected = False
        self._connect()

    def _connect(self):
        if not REDIS_AVAILABLE or redis is None:
            logger.info("Redis package not available. Using in-memory cache.")
            return

        try:
            client = redis.from_url(
                self.redis_url,
                socket_timeout=1.0,
                socket_connect_timeout=1.0,
                decode_responses=True
            )
            client.ping()
            self._client = client
            self.is_connected = True
            logger.info("Connected to Redis at %s", self.redis_url)
        except Exception as e:
            logger.warning(
                "Redis connection failed (%s). Gracefully falling back to in-memory cache.",
                e
            )
            self._client = None
            self.is_connected = False

    def get(self, key: str) -> Optional[str]:
        if self.is_connected and self._client:
            try:
                val = self._client.get(key)
                return val.decode("utf-8") if isinstance(val, bytes) else val
            except Exception:
                self.is_connected = False
        return self._in_memory.get(key)

    def set(self, key: str, value: Any, ex: Optional[int] = None) -> bool:
        str_val = str(value) if not isinstance(value, str) else value
        if self.is_connected and self._client:
            try:
                self._client.set(key, str_val, ex=ex)
                return True
            except Exception:
                self.is_connected = False
        return self._in_memory.set(key, str_val, ex=ex)

    def setnx(self, key: str, value: Any) -> bool:
        str_val = str(value) if not isinstance(value, str) else value
        if self.is_connected and self._client:
            try:
                return bool(self._client.setnx(key, str_val))
            except Exception:
                self.is_connected = False
        return self._in_memory.setnx(key, str_val)

    def delete(self, key: str) -> bool:
        if self.is_connected and self._client:
            try:
                return bool(self._client.delete(key))
            except Exception:
                self.is_connected = False
        return self._in_memory.delete(key)

    def exists(self, key: str) -> bool:
        if self.is_connected and self._client:
            try:
                return bool(self._client.exists(key))
            except Exception:
                self.is_connected = False
        return self._in_memory.exists(key)


# Global singleton instance
cache_client = RedisClient()
