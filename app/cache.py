from __future__ import annotations

import asyncio
import pickle
import time
from pathlib import Path
from typing import Any, Awaitable, Callable, Dict, Generic, Optional, TypeVar

T = TypeVar("T")


class AsyncTTLCache(Generic[T]):
    """
    In-memory cache with optional disk persistence.
    """
    
    def __init__(self, ttl_seconds: int, max_items: int = 512, persist_dir: Optional[str] = None):
        self.ttl_seconds = int(ttl_seconds)
        self.max_items = int(max_items)
        
        self._data: Dict[Any, tuple[float, T]] = {}
        self._inflight: Dict[Any, asyncio.Task[T]] = {}
        self._lock = asyncio.Lock()
        
        self._persist_dir = persist_dir
        if persist_dir:
            Path(persist_dir).mkdir(parents=True, exist_ok=True)
            self._load_from_disk()
    
    def _now(self) -> float:
        return time.monotonic()
    
    def _is_expired(self, expires_at: float) -> bool:
        return expires_at <= self._now()
    
    def _get_key_path(self, key: Any) -> Optional[Path]:
        if not self._persist_dir:
            return None
        safe_key = str(key).replace("/", "_").replace("\\", "_").replace(":", "_")
        return Path(self._persist_dir) / f"{safe_key}.pickle"
    
    def _load_from_disk(self):
        """Загружает кэш с диска при старте"""
        if not self._persist_dir:
            return
        try:
            for p in Path(self._persist_dir).glob("*.pickle"):
                try:
                    with open(p, "rb") as f:
                        data = pickle.load(f)
                        if isinstance(data, tuple) and len(data) == 2:
                            expires_at, value = data
                            if not self._is_expired(expires_at):
                                # Восстанавливаем ключ из имени файла
                                key = p.stem.replace("_", "/")
                                self._data[key] = (expires_at, value)
                except Exception:
                    pass
        except Exception:
            pass
    
    def _save_to_disk(self, key: Any, expires_at: float, value: T):
        """Сохраняет значение на диск"""
        path = self._get_key_path(key)
        if path:
            try:
                with open(path, "wb") as f:
                    pickle.dump((expires_at, value), f)
            except Exception:
                pass
    
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
            expires_at = self._now() + self.ttl_seconds
            self._data[key] = (expires_at, value)
            self._save_to_disk(key, expires_at, value)
    
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
                task = asyncio.create_task(factory())
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
    
    def clear(self):
        """Очищает кэш (синхронный метод)"""
        self._data.clear()
        self._inflight.clear()
        
        if self._persist_dir:
            try:
                for p in Path(self._persist_dir).glob("*.pickle"):
                    p.unlink()
            except Exception:
                pass