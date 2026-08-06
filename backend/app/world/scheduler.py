"""Server-owned sparse heartbeat for the legacy cafe/hall worlds."""

from __future__ import annotations

import asyncio
import logging

logger = logging.getLogger(__name__)


class WorldScheduler:
    """Advance legacy worlds independently from HTTP snapshot polling.

    Legacy worlds still advance for compatibility. The same timer also asks the
    v1 room autonomy service for one bounded PersonAgent activation per room.
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
        rooms = getattr(self.app.state, "room_service", None)
        v1_cafe_active = rooms is not None and "echoworld-cafe" in rooms.room_ids()
        if not v1_cafe_active:
            cafe = self.app.state.world
            self.app.state.runtime.tick(cafe.snapshot())
            cafe.step()
        conductor = getattr(self.app.state, "room_conductor", None)
        if conductor is not None:
            conductor.tick_once()  # v1 房间生活指挥：入座/交谈/会议走位/超时散会
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
                    autonomy = getattr(self.app.state, "room_autonomy", None)
                    if autonomy is not None:
                        await autonomy.tick_once()
                except Exception:
                    logger.exception("world heartbeat failed")
