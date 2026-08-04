"""K3 人物证据 -> 深度摘要、推断记忆与关系网络。"""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone

from app.agents.llm import get_provider
from app.agents.utils.jsonish import extract_json

SYSTEM_PROMPT = """你是 EchoWorld 的人物相遇整理器。输入只包含一次真实会话中已经提供的证据。
请忠实整理，不补写证据中没有的身份、经历、意图或关系。只输出 JSON：
{
  "summary": "80字以内的相遇总结",
  "memory_items": ["以后再次见面值得记住的具体事实，最多4条"],
  "topics": ["明确谈到的课题或兴趣，最多5条"],
  "visible_traits": ["上游明确给出的非敏感可见特征，最多4条"],
  "relation_keywords": ["这次共同现场的中性关键词，最多5条"]
}
所有结论必须可以从输入 evidence 指回原始事实；不确定就留空数组。"""


def _strings(value, limit: int, max_length: int = 80) -> list[str]:
    if not isinstance(value, list):
        return []
    result = []
    for item in value:
        text = str(item or "").strip()
        if text and text not in result:
            result.append(text[:max_length])
        if len(result) >= limit:
            break
    return result


def _fallback_analysis(evidence: dict) -> dict:
    turns = evidence.get("turns") or []
    texts = [str(turn.get("text") or "").strip() for turn in turns if isinstance(turn, dict)]
    texts = [text for text in texts if text]
    scene = evidence.get("scene") or {}
    caption = str(scene.get("caption") or "").strip()
    summary_parts = []
    if caption:
        summary_parts.append(f"在{caption}相遇")
    if texts:
        summary_parts.append("；".join(texts[:2]))
    summary = "。".join(summary_parts)[:300] or "本次 K3 会话已完成事实归档"
    topics = []
    if caption:
        topics.append(caption[:40])
    for text in texts[:3]:
        for piece in re.split(r"[，。；、,.;\s]+", text):
            piece = piece.strip()
            if 2 <= len(piece) <= 24 and piece not in topics:
                topics.append(piece)
            if len(topics) >= 5:
                break
    return {
        "summary": summary,
        "memory_items": texts[:4],
        "topics": topics[:5],
        "visible_traits": [],
        "relation_keywords": topics[:5],
        "model": "physical-ai-rules.v1",
        "confidence": 0.65,
    }


class PhysicalAIEnrichmentService:
    def __init__(self, store, memory, chat_provider=None):
        self.store = store
        self.memory = memory
        self.chat_provider = chat_provider or get_provider("chat")

    def analyze(self, evidence: dict) -> dict:
        fallback = _fallback_analysis(evidence)
        try:
            response = self.chat_provider.chat(
                [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": json.dumps(evidence, ensure_ascii=False)[:12000]},
                ],
                response_format={"type": "json_object"},
            )
        except Exception:
            return fallback
        if response.mock:
            return fallback
        payload = extract_json(response.text)
        if not isinstance(payload, dict):
            return fallback
        summary = str(payload.get("summary") or "").strip()[:300]
        if not summary:
            return fallback
        return {
            "summary": summary,
            "memory_items": _strings(payload.get("memory_items"), 4, 120),
            "topics": _strings(payload.get("topics"), 5, 40),
            "visible_traits": _strings(payload.get("visible_traits"), 4, 60),
            "relation_keywords": _strings(payload.get("relation_keywords"), 5, 40),
            "model": response.model,
            "confidence": 0.85,
        }

    def inference_records(
        self, *, analysis: dict, package_id: str, source_ref: str,
    ) -> list[dict]:
        now = datetime.now(timezone.utc).isoformat()
        records = [{
            "id": f"inf_k3_deep_summary_{package_id}",
            "type": "deep-encounter-summary",
            "value": analysis["summary"],
            "source_facts": [source_ref],
            "model": analysis["model"],
            "confidence": analysis["confidence"],
            "created_at": now,
        }]
        for index, topic in enumerate(analysis.get("topics") or []):
            records.append({
                "id": f"inf_k3_topic_{package_id}_{index + 1}",
                "type": "interest-tag",
                "value": topic,
                "source_facts": [source_ref],
                "model": analysis["model"],
                "confidence": analysis["confidence"],
                "created_at": now,
            })
        for index, trait in enumerate(analysis.get("visible_traits") or []):
            records.append({
                "id": f"inf_k3_visible_trait_{package_id}_{index + 1}",
                "type": "visible-trait",
                "value": trait,
                "source_facts": [source_ref],
                "model": analysis["model"],
                "confidence": analysis["confidence"],
                "created_at": now,
            })
        return records

    def persist_memory(self, person_id: str, analysis: dict, source_ref: str) -> None:
        items = [analysis["summary"], *(analysis.get("memory_items") or [])]
        existing = self.memory.read_memory_md(person_id)
        for item in items:
            text = str(item or "").strip()
            marker = f"{text} (source: {source_ref},"
            if not text or marker in existing:
                continue
            self.memory.append_memory(
                person_id, text, source_ref, float(analysis["confidence"]),
            )
            existing += marker

    def persist_relationships(self, people: list[dict], encounter_id: str) -> None:
        for person in people:
            keywords = person.get("relation_keywords") or person.get("topics") or ["现场相遇"]
            self._append_relation_once(
                person["person_id"], "我", "现场相遇", keywords[:5], encounter_id,
            )
        for index, left in enumerate(people):
            for right in people[index + 1:]:
                common = [topic for topic in left.get("topics", []) if topic in right.get("topics", [])]
                keywords = common or list(dict.fromkeys([
                    *(left.get("relation_keywords") or []),
                    *(right.get("relation_keywords") or []),
                ]))[:5] or ["共同现场"]
                self._append_relation_once(
                    left["person_id"], right["name"], "同场相遇", keywords, encounter_id,
                )
                self._append_relation_once(
                    right["person_id"], left["name"], "同场相遇", keywords, encounter_id,
                )

    def _append_relation_once(
        self, person_id: str, name: str, relation: str, keywords: list[str], source: str,
    ) -> None:
        existing = self.memory.read_relations_md(person_id)
        prefix = f"{name} | {relation} |"
        if any(line.strip().startswith(prefix) and line.strip().endswith(f"| {source}")
               for line in existing.splitlines()):
            return
        self.memory.append_relation(person_id, name, relation, keywords, source)
