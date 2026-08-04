"""Server-owned sparse heartbeat for the legacy cafe/hall worlds."""

from __future__ import annotations

import asyncio
import logging

logger = logging.getLogger(__name__)


class WorldScheduler:
    """Advance legacy worlds independently from HTTP snapshot polling.

    MVP2 room commands are event-driven. This heartbeat only keeps the MVP1 cafe and
    hall simulations alive during the compatibility period.
    """

    def __init__(self, app, *, interval_seconds: float = 15.0, hall_every: int = 4):
        if interval_seconds <= 0:
            raise ValueError("interval_seconds must be positive")
        if hall_every <= 0:
            raise ValueError("hall_every must be positive")
        self.app = app
        self.interval_seconds = interval_seconds
        self.hall_every = hall_every
        self._cycles = 0
        self._task: asyncio.Task | None = None
        self._stopping = asyncio.Event()

    def tick_once(self) -> None:
        cafe = self.app.state.world
        self.app.state.runtime.tick(cafe.snapshot())
        cafe.step()
        self._cycles += 1
        if self._cycles % self.hall_every == 0:
            hall = self.app.state.hall
            self.app.state.hall_runtime.tick(hall.snapshot())
            hall.step()

    async def start(self) -> None:
        if self._task is not None and not self._task.done():
            return
        self._stopping.clear()
        self._task = asyncio.create_task(self._run(), name="echoworld-world-heartbeat")

    async def stop(self) -> None:
        self._stopping.set()
        task, self._task = self._task, None
        if task is None:
            return
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass

    async def _run(self) -> None:
        while not self._stopping.is_set():
            try:
                await asyncio.wait_for(self._stopping.wait(), self.interval_seconds)
                break
            except TimeoutError:
                try:
                    self.tick_once()
                except Exception:
                    logger.exception("legacy world heartbeat failed")
