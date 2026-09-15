"""活动模式（Event Mode）：NFC / 二维码入场 → 像素分身进入活动地图。

见 app/events/checkins.py（存储与分区槽位）与 app/api/events.py（HTTP 契约）。
"""

from app.events.checkins import (
    AtlasInvalid,
    DEFAULT_ZONES,
    EventCheckinStore,
    EventFull,
    EventNotFound,
    decode_atlas_png,
)

__all__ = [
    "AtlasInvalid",
    "DEFAULT_ZONES",
    "EventCheckinStore",
    "EventFull",
    "EventNotFound",
    "decode_atlas_png",
]
