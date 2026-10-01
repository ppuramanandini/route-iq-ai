import json
from typing import Optional, Dict, Any
from .redis_client import cache_client

GATEWAY_STATE_PREFIX = "switchrouteiq:gw:state:"
GATEWAY_HEALTH_PREFIX = "switchrouteiq:gw:health:"
GATEWAY_TTL = 3600  # 1 hour default cache


def set_cached_gateway_state(gateway_id: str, state_dict: Dict[str, Any], ttl: int = GATEWAY_TTL) -> None:
    key = f"{GATEWAY_STATE_PREFIX}{gateway_id.upper()}"
    cache_client.set(key, json.dumps(state_dict), ex=ttl)


def get_cached_gateway_state(gateway_id: str) -> Optional[Dict[str, Any]]:
    key = f"{GATEWAY_STATE_PREFIX}{gateway_id.upper()}"
    raw = cache_client.get(key)
    if raw:
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return None
    return None


def set_cached_gateway_health(gateway_id: str, health_score: int, ttl: int = GATEWAY_TTL) -> None:
    key = f"{GATEWAY_HEALTH_PREFIX}{gateway_id.upper()}"
    cache_client.set(key, health_score, ex=ttl)


def get_cached_gateway_health(gateway_id: str) -> Optional[int]:
    key = f"{GATEWAY_HEALTH_PREFIX}{gateway_id.upper()}"
    raw = cache_client.get(key)
    if raw is not None:
        try:
            return int(raw)
        except ValueError:
            return None
    return None
