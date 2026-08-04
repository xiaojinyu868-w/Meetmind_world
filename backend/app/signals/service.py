"""K3 佩戴者生理数据到最小化 person-signal.v1 聚合视图。"""

from __future__ import annotations

import json
import math
from datetime import datetime, timedelta, timezone


HEART_KEYS = ("heart_rate_bpm", "heart_rate", "hr_bpm", "hr", "bpm")
CAVEAT = (
    "这是佩戴者在共同会话时间窗内的生理反应，只表示时间相关的唤起程度；"
    "不能归为对方的生理数据，也不等同于喜欢、厌恶或医疗结论。"
)


def _number(value):
    if isinstance(value, bool):
        return None
    try:
        result = float(value)
    except (TypeError, ValueError):
        return None
    return result if math.isfinite(result) else None


def _first_number(value, keys: tuple[str, ...]):
    if not isinstance(value, dict):
        return None
    for key in keys:
        result = _number(value.get(key))
        if result is not None:
            return result
    for nested in value.values():
        if isinstance(nested, dict):
            result = _first_number(nested, keys)
            if result is not None:
                return result
    return None


def _heart_samples(physiology: dict) -> list[tuple[float, float]]:
    result = []
    for index, sample in enumerate(physiology.get("samples") or []):
        if not isinstance(sample, dict):
            continue
        metric = str(sample.get("metric") or "").lower()
        bpm = _number(sample.get("value")) if metric in {
            "heart_rate", "heart_rate_bpm", "hr", "bpm",
        } else _first_number(sample, HEART_KEYS)
        if bpm is None or not 30 <= bpm <= 240:
            continue
        offset = _first_number(sample, ("offset_ms", "elapsed_ms", "time_offset_ms"))
        result.append((offset if offset is not None else index * 1000.0, bpm))
    return sorted(result)


def _summary_number(summary, metrics: tuple[str, ...], fields: tuple[str, ...]):
    if isinstance(summary, dict):
        return _first_number(summary, fields)
    if not isinstance(summary, list):
        return None
    for item in summary:
        if not isinstance(item, dict):
            continue
        metric = str(item.get("metric") or "").lower()
        if metric not in metrics:
            continue
        result = _first_number(item, fields)
        if result is not None:
            return result
    return None


def _trend(samples: list[tuple[float, float]]) -> str:
    if len(samples) < 2:
        return "unknown"
    delta = samples[-1][1] - samples[0][1]
    if delta >= 4:
        return "rising"
    if delta <= -4:
        return "falling"
    return "steady"


def _iso_at(base: str, offset_ms: float) -> str | None:
    try:
        parsed = datetime.fromisoformat(str(base).replace("Z", "+00:00"))
    except ValueError:
        return None
    return (parsed + timedelta(milliseconds=offset_ms)).astimezone(timezone.utc).isoformat()


def _ice_break(
    samples: list[tuple[float, float]], baseline: float | None, captured_at: str,
    has_supporting_metrics: bool,
) -> dict:
    if baseline is None or len(samples) < 5:
        return {"detected": False, "at": None, "breakSeconds": None, "reliability": "pending"}
    spike_index = next(
        (index for index, (_offset, bpm) in enumerate(samples) if bpm > baseline * 1.15),
        None,
    )
    if spike_index is None:
        return {"detected": False, "at": None, "breakSeconds": None, "reliability": "pending"}
    for index in range(spike_index + 1, len(samples) - 2):
        window = samples[index:index + 3]
        if all(abs(bpm - baseline) <= baseline * 0.05 for _offset, bpm in window):
            offset = window[0][0]
            return {
                "detected": True,
                "at": _iso_at(captured_at, offset),
                "breakSeconds": round(max(0, offset - samples[spike_index][0]) / 1000),
                "reliability": "high" if has_supporting_metrics else "medium",
            }
    return {"detected": False, "at": None, "breakSeconds": None, "reliability": "pending"}


class PersonSignalProjector:
    def __init__(self, store):
        self.store = store

    def project(
        self, *, person_id: str, physiology: dict, package_id: str,
        encounter_id: str, captured_at: str, source_ref: str,
        participant_count: int,
    ) -> dict | None:
        if not isinstance(physiology, dict) or not physiology:
            return None
        summary = physiology.get("summary") or {}
        samples = _heart_samples(physiology)
        current = samples[-1][1] if samples else _summary_number(
            summary,
            ("heart_rate", "heart_rate_bpm", "hr", "bpm"),
            ("latest", "current", "mean", "heart_rate_bpm_latest", *HEART_KEYS),
        )
        baseline = _summary_number(
            summary,
            ("heart_rate", "heart_rate_bpm", "hr", "bpm"),
            ("baseline", "mean", "heart_rate_baseline_bpm", "baseline_bpm", "heart_rate_bpm_avg", "hr_avg"),
        )
        peak = max((bpm for _offset, bpm in samples), default=None)
        peak = _summary_number(
            summary, ("heart_rate", "heart_rate_bpm", "hr", "bpm"),
            ("max", "heart_rate_bpm_max", "peak_bpm", "hr_max"),
        ) or peak
        breathing = _summary_number(
            summary, ("breathing_rate", "respiratory_rate", "respiration_rate"),
            ("mean", "latest", "breathing_rate", "respiratory_rate"),
        )
        hrv = _summary_number(
            summary, ("hrv", "hrv_rmssd", "rmssd"),
            ("mean", "latest", "hrv_rmssd_ms", "hrv_ms", "hrv", "rmssd"),
        )
        temperature = _summary_number(
            summary, ("skin_temperature", "temperature"),
            ("mean", "latest", "skin_temperature_c", "skin_temperature", "temperature_c"),
        )
        stress = _summary_number(
            summary, ("stress", "stress_index", "stress_score"),
            ("mean", "latest", "stress_index", "stress_score"),
        )
        if all(value is None for value in (current, baseline, peak, breathing, hrv, temperature, stress)):
            return None

        score = None
        if current is not None and baseline:
            score = round(max(0, min(100, 50 + (current - baseline) / baseline * 200)))
        direction = _trend(samples)
        if current is not None and baseline is not None and current > baseline * 1.1:
            label = "生理唤起上升"
        elif current is not None:
            label = "生理状态较平稳"
        else:
            label = "已有会话生理汇总"
        confidence = round(min(0.82, 0.52 + min(len(samples), 10) * 0.025), 2)
        relation_note = "多人共同会话，不能归因到单一参与者。" if participant_count > 1 else ""
        explanation = (
            f"佩戴者在共同会话中的最近心率为 {round(current)} bpm。" if current is not None
            else "佩戴者在共同会话中有可用的聚合生理指标。"
        )
        signal = {
            "schemaVersion": "person-signal.v1",
            "personId": person_id,
            "ownerPersonId": "person-self",
            "capturedAt": captured_at,
            "status": "recent",
            "heart": {
                "currentBpm": round(current, 1) if current is not None else None,
                "baselineBpm": round(baseline, 1) if baseline is not None else None,
                "peakBpm": round(peak, 1) if peak is not None else None,
                "heartScore": score,
                "trend": direction,
                "explanation": explanation + relation_note,
            },
            "metrics": {
                "breathingRate": breathing,
                "stressIndex": stress,
                "skinTemperature": temperature,
                "hrv": hrv,
                "observedAt": captured_at,
            },
            "inference": {
                "label": label,
                "summary": explanation + relation_note,
                "confidence": confidence,
                "caveat": CAVEAT,
            },
            "iceBreak": _ice_break(
                samples, baseline, captured_at, breathing is not None or hrv is not None,
            ),
            "sourceRefs": {
                "encounterId": encounter_id,
                "heartStreamId": str(physiology.get("stream_id") or f"k3:{package_id}"),
                "historicalBatchId": str(physiology.get("batch_id") or ""),
                "visionTrackId": "",
                "audioSegmentId": "",
            },
        }
        generation_id = f"{person_id}-{package_id}"
        ref = self.store.write_derived_asset(
            "signals", generation_id, "person-signal.v1.json",
            json.dumps(signal, ensure_ascii=False, indent=2).encode("utf-8"),
        )
        return {
            "ref": ref,
            "status": signal["status"],
            "captured_at": captured_at,
            "source_facts": [source_ref],
        }

    def load(self, package: dict) -> dict | None:
        ref = (package.get("signal") or {}).get("ref")
        if not isinstance(ref, str) or not ref.startswith("derived/signals/"):
            return None
        root = self.store.root.resolve()
        target = (root / ref).resolve()
        if root not in target.parents or not target.is_file():
            return None
        payload = json.loads(target.read_text(encoding="utf-8"))
        return payload if payload.get("schemaVersion") == "person-signal.v1" else None
