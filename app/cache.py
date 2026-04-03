from __future__ import annotations

import asyncio
import time
from typing import Any, Awaitable, Callable, Dict, Generic, Optional, Tuple, TypeVar

T = TypeVar("T")


class AsyncTTLCache(Generic[T]):
    """
    In-memory cache: entries expire after ``ttl_seconds`` of monotonic time.

    When ``max_items`` is exceeded, one arbitrary entry is evicted. Concurrent
    ``get_or_set`` calls for the same key await a single shared ``factory()`` task.
    """

    def __init__(self, ttl_seconds: int, max_items: int = 512) -> None:
        self.ttl_seconds = int(ttl_seconds)
        self.max_items = int(max_items)

        self._data: Dict[Any, Tuple[float, T]] = {}
        self._inflight: Dict[Any, asyncio.Task[T]] = {}
        self._lock = asyncio.Lock()

    def _now(self) -> float:
        """Current monotonic time (immune to wall-clock jumps)."""
        return time.monotonic()

    def _is_expired(self, expires_at: float) -> bool:
        """Return True if the entry's expiry time has passed."""
        return expires_at <= self._now()

    async def get(self, key: Any) -> Optional[T]:
        """Return the cached value or None if missing or expired."""
        async with self._lock:
            item = self._data.get(key)
            if not item:
                return None
            expires_at, value = item
            if self._is_expired(expires_at):
                self._data.pop(key, None)
                return None
            return value

    async def set(self, key: Any, value: T) -> None:
        """Store a value with a fresh expiry (now + TTL)."""
        async with self._lock:
            if len(self._data) >= self.max_items:
                self._data.pop(next(iter(self._data.keys())), None)
            self._data[key] = (self._now() + self.ttl_seconds, value)

    async def get_or_set(self, key: Any, factory: Callable[[], Awaitable[T]]) -> T:
        """
        Return cache hit or await ``factory``, store the result, and return it.

        A lock coordinates cache checks and task creation so only one factory runs
        per key under contention.
        """
        cached = await self.get(key)
        if cached is not None:
            return cached

        async with self._lock:
            item = self._data.get(key)
            if item and not self._is_expired(item[0]):
                return item[1]

            inflight = self._inflight.get(key)
            if inflight is None:
                task: asyncio.Task[T] = asyncio.create_task(factory())
                self._inflight[key] = task
            else:
                task = inflight

        try:
            value = await task
        finally:
            async with self._lock:
                self._inflight.pop(key, None)

        await self.set(key, value)
        return value
