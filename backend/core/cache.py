from __future__ import annotations

import asyncio
import time
from typing import Any, Awaitable, Callable, Dict, Generic, Optional, Tuple, TypeVar

T = TypeVar("T")


class AsyncTTLCache(Generic[T]):
    def __init__(self, ttl_seconds: int, max_items: int = 512) -> None:
        self.ttl_seconds = int(ttl_seconds)
        self.max_items = int(max_items)

        self._data: Dict[Any, Tuple[float, T]] = {}
        self._inflight: Dict[Any, asyncio.Task[T]] = {}
        self._lock = asyncio.Lock()

    def _now(self) -> float:
        return time.monotonic()

    def _is_expired(self, expires_at: float) -> bool:
        return expires_at <= self._now()

    async def get(self, key: Any) -> Optional[T]:
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
        async with self._lock:
            if len(self._data) >= self.max_items:
                self._data.pop(next(iter(self._data.keys())), None)
            self._data[key] = (self._now() + self.ttl_seconds, value)

    async def get_or_set(self, key: Any, factory: Callable[[], Awaitable[T]]) -> T:
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