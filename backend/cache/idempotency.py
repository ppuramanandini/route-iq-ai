import json
import time
from typing import Optional, Dict, Any, Tuple
from .redis_client import cache_client

IDEMPOTENCY_PREFIX = "switchrouteiq:idemp:"
LOCK_PREFIX = "switchrouteiq:lock:"
DEFAULT_IDEMPOTENCY_TTL = 86400  # 24 hours
DEFAULT_LOCK_TTL = 30  # 30 seconds for lock timeout


def acquire_idempotency_lock(idempotency_key: str, ttl: int = DEFAULT_LOCK_TTL) -> bool:
    """
    Acquire an atomic execution lock for the given idempotency key.
    Returns True if lock acquired, False if another concurrent request holds it.
    """
    lock_key = f"{LOCK_PREFIX}{idempotency_key}"
    return cache_client.setnx(lock_key, f"locked_{time.time()}")


def release_idempotency_lock(idempotency_key: str) -> None:
    lock_key = f"{LOCK_PREFIX}{idempotency_key}"
    cache_client.delete(lock_key)


def get_idempotent_transaction(idempotency_key: str) -> Optional[Dict[str, Any]]:
    key = f"{IDEMPOTENCY_PREFIX}{idempotency_key}"
    raw = cache_client.get(key)
    if raw:
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return None
    return None


def store_idempotent_transaction(
    idempotency_key: str,
    record: Dict[str, Any],
    ttl: int = DEFAULT_IDEMPOTENCY_TTL
) -> None:
    key = f"{IDEMPOTENCY_PREFIX}{idempotency_key}"
    cache_client.set(key, json.dumps(record), ex=ttl)
