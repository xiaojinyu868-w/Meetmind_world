"""玩家与 Agent 单聊服务（INTERACTION-DESIGN.md §2，IF-6 首个落地，M1.3）。

目的：玩家在资料包面板里与人物的数字分身 1:1 对话。分身只基于
      authorized_agent_view（profile + memory.md + relations.md）与推断层
      （第一印象 / 玩家转述 player-note）应答；回复携带 cited_facts 来源
      指针（P-3：模型的话要指得回事实）与下一轮开场 suggestions；
      对话不自动入库，用户可选择「记进资料包」手动沉淀（P-7 主动捕获的
      轻形态），写入推断层并标注"来自玩家转述"。
输入：MemoryStore（授权视图/关系/记忆）、PackageStore（推断读写）、
      chat provider（deepseek，未配置走确定性 mock 兜底，不报错）。
输出：chat_with_player() -> {"reply", "cited_facts", "suggestions", "generated_by"}
      或 None（人物不存在/身份未确认）；save_chat_note() -> 推断 payload + ref。
验收：tests/test_player_chat.py —— happy path / JSON 解析宽容 / mock 兜底 /
      404 / 长度校验 / save-note 推断形状 / 首轮结构化开场。

边界规则（写进 system prompt，P-8）：只基于授权资料回答；不知道就坦诚
"我还没记住这个，可以告诉我"；不得编造共同经历；回复 1-3 句、口语、
有温度不谄媚。历史由客户端回显（history），服务端不存对话（不自动入库）。
"""

from __future__ import annotations

import json
import logging
import re
import time
import uuid

from app.agents.dialogue import tag_set
from app.agents.utils.jsonish import extract_json

logger = logging.getLogger(__name__)

MAX_MESSAGE_CHARS = 500
MAX_HISTORY_TURNS = 10
MAX_SUGGESTIONS = 3
MAX_CITED_FACTS = 5
SUGGESTION_CHARS = 40

# 注入 prompt 的文本类事实原文（bio 笔记/转写）：每条与总量的截断上限
FACT_EXCERPT_CHARS = 600
FACT_EXCERPT_TOTAL_CHARS = 2400
_TEXT_FACT_SUFFIXES = (".md", ".txt")

PLAYER_NOTE_SCHEMA = "echo-player-note.v1"

# memory.md 条目内联事实指针：- 内容 (source: facts/..., conf: 0.7)
_MEMORY_SOURCE_RE = re.compile(r"\(source:\s*([^,]+?),\s*conf:")


def _flat_tags(view: dict) -> list[str]:
    """授权视图 tags（可能连写）拆成有序去重的单标签列表。"""
    seen: list[str] = []
    for tag in sorted(tag_set(view)):
        if tag not in seen:
            seen.append(tag)
    return seen


def _relation_lines(memory, person_id: str) -> list[str]:
    """relations.md 有效关系行（跳过模板注释与格式说明行）。"""
    try:
        text = memory.read_relations_md(person_id)
    except Exception:
        return []
    lines = []
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith(("#", "格式")) or " | " not in line:
            continue
        lines.append(line)
    return lines


def build_chat_context(memory, store, person_id: str) -> dict | None:
    """组装单聊授权上下文（prompt 注入 + cited_facts 白名单来源）。

    返回 None：人物不存在或身份未确认（FR-1.3 可靠性闸，同 authorized_agent_view）。
    allowed_refs：模型可引用的来源指针全集（facts/ 指针、推断 id、memory 条目
    内联指针），cited_facts 只保留其中的项。
    """
    view = memory.authorized_agent_view(person_id)
    if view is None:
        return None
    package = memory.read_long_term(person_id)
    facts_index: list[dict] = []
    inferences_index: list[dict] = []
    for encounter in package.get("encounters", []):
        encounter_id = encounter.get("encounter_id")
        facts = encounter.get("facts") or {}
        for kind, key in (("photo", "photos"), ("media", "media")):
            for ref in facts.get(key) or []:
                facts_index.append({"ref": ref, "kind": kind, "encounter": encounter_id})
        if facts.get("transcript"):
            facts_index.append(
                {"ref": facts["transcript"], "kind": "transcript", "encounter": encounter_id}
            )
        for inference in encounter.get("inferences") or []:
            value = str(inference.get("value") or "").strip()
            if value:
                inferences_index.append(
                    {"id": f"{encounter_id}/{inference.get('id')}", "value": value}
                )
            # 推断的事实来源（如 bio 笔记 note.v1.md）同样是可引用来源
            for ref in inference.get("source_facts") or []:
                facts_index.append({"ref": ref, "kind": "note", "encounter": encounter_id})
    # 推断层：第一印象（group-impression）与玩家转述（player-note）
    impressions: list[str] = []
    player_notes: list[str] = []
    try:
        inference_payloads = store.read_inferences(person_id)
    except Exception:
        inference_payloads = {}
    for payload in inference_payloads.values():
        if not isinstance(payload, dict):
            continue
        impression = payload.get("impression")
        if isinstance(impression, dict) and impression.get("value"):
            impressions.append(str(impression["value"]))
        note = payload.get("note")
        if isinstance(note, dict) and note.get("type") == "player-note" and note.get("value"):
            player_notes.append(str(note["value"]))

    memory_lines = list(view.get("memory_lines") or [])
    allowed_refs = {item["ref"] for item in facts_index}
    allowed_refs.update(item["id"] for item in inferences_index)
    for line in memory_lines:
        allowed_refs.update(_MEMORY_SOURCE_RE.findall(line))

    # 文本类事实（bio 笔记/转写）注入原文摘录：分身复述细节的最高优先级依据，
    # 没有原文可读的细节不允许出现在回复里（防编造的关键注入）
    fact_excerpts: list[dict] = []
    excerpt_budget = FACT_EXCERPT_TOTAL_CHARS
    for item in facts_index:
        if excerpt_budget <= 0:
            break
        ref = item["ref"]
        if item["kind"] not in ("note", "transcript") or not ref.endswith(_TEXT_FACT_SUFFIXES):
            continue
        try:
            text = store.read_fact(ref).decode("utf-8", errors="replace").strip()
        except Exception:
            continue
        if not text:
            continue
        excerpt = text[: min(FACT_EXCERPT_CHARS, excerpt_budget)]
        excerpt_budget -= len(excerpt)
        fact_excerpts.append({"ref": ref, "text": excerpt})

    return {
        "person_id": person_id,
        "name": view.get("name") or person_id,
        "tags": _flat_tags(view),
        "places": list(view.get("places") or []),
        "memory_lines": memory_lines,
        "relation_lines": _relation_lines(memory, person_id),
        "first_impressions": impressions,
        "player_notes": player_notes,
        "facts_index": facts_index,
        "fact_excerpts": fact_excerpts,
        "inferences_index": inferences_index,
        "allowed_refs": allowed_refs,
    }


def build_system_prompt(context: dict) -> str:
    """单聊 system prompt：数字分身人设 + P-8 边界规则 + JSON 约束输出。"""
    return (
        f"你是「{context['name']}」的数字分身，住在用户的 EchoWorld 关系世界里，"
        "此刻正在和本人（用户，也就是玩家）单独聊天。\n"
        "【你能知道的一切】只有用户消息里「授权资料」中的内容"
        "（TA 授权可见的档案原文摘录、记忆条目、关系备注、第一印象与玩家转述）。规则：\n"
        "1. 只基于授权资料回答；复述共同经历时只能用「fact_excerpts 原文摘录」里"
        "写到的细节，不得自行补充动作、对话或情节；资料里没有的事，坦诚说"
        "「我还没记住这个，可以告诉我」，并顺势邀请对方补充。\n"
        "2. 严禁编造共同经历、时间、地点、他人信息或近况。你没有资料之外的生活："
        "不要以「我最近在…」开头虚构现状。被问到资料没有覆盖的近况/现状时，"
        "按规则 1 坦诚回应并邀请对方告诉你，例如「我这边只记到〈资料里的最后片段〉，"
        "之后的还没记住，你跟我说说？」。推断不确定时不要把话说死。\n"
        "3. 回复 1-3 句，口语、有温度但不谄媚，用第一人称「我」；你是分身不是真人，"
        "被问到资料之外的私人问题时自然带过。\n"
        "4. 回复用到的资料，在 cited_facts 里列出实际使用的来源指针"
        "（只能从「可引用来源」清单里原样照抄）；只要复述了资料内容（哪怕一处）"
        "就必须给出对应指针，确实没用到才给空数组。\n"
        "5. suggestions 给 2-3 条对方下一轮可以接着聊的开场短句"
        "（只能基于资料里已有的线索提问，不得编造资料中没有的新话题细节，"
        "口语，以对方的口吻写）。\n"
        "只输出一个 json 对象：{\"reply\": \"...\", \"cited_facts\": [\"...\"], "
        "\"suggestions\": [\"...\", \"...\"]}"
    )


def deterministic_suggestions(context: dict) -> list[str]:
    """系统侧结构化开场（首轮必用，后续轮次作模型输出的兜底）。

    基于授权资料线索（标签/相遇地点/关系备注），以玩家口吻写短句。
    """
    suggestions: list[str] = []
    for tag in context.get("tags") or []:
        suggestions.append(f"最近还在忙{tag}的事吗？")
    for place in context.get("places") or []:
        place_text = str(place).split("·")[-1].strip() or str(place)
        suggestions.append(f"还记得{place_text}那次吗？")
    for note in context.get("player_notes") or []:
        suggestions.append(f"我上次说的「{str(note)[:16]}」，你还记得吗？")
    if not suggestions:
        suggestions = ["我们是怎么认识的来着？", "跟我讲讲你最近在忙什么。"]
    return suggestions[:MAX_SUGGESTIONS]


def mock_reply(context: dict, message: str) -> dict:
    """provider 未配置时的确定性兜底回复：从授权资料派生，绝不编造。

    消息命中某个授权标签时围绕它回应，否则给出资料概览；
    cited_facts 指向真实存在的来源指针（与模型路径同一白名单）。
    """
    name = context["name"]
    tags = context.get("tags") or []
    inferences = context.get("inferences_index") or []
    facts = context.get("facts_index") or []
    cited: list[str] = []
    hit = next((tag for tag in tags if tag and tag in message), None)
    if hit:
        cited = [item["id"] for item in inferences if hit in item["value"]][:1]
        reply = (
            f"{hit}啊，我这里留着的主要是档案里的片段，"
            f"真正最清楚的还是{name}本人。想听我记得的那部分吗？"
        )
    elif facts:
        cited = [facts[0]["ref"]]
        reply = (
            f"我是{name}的数字分身（演示模式，还没接上模型）。"
            "我手头只有授权资料，等接好模型再好好陪你聊；"
            "现在可以先翻翻我的资料包。"
        )
    else:
        reply = (
            f"我是{name}的数字分身（演示模式，还没接上模型）。"
            "资料还很少，你可以多告诉我一些，我会记住的。"
        )
    return {"reply": reply, "cited_facts": cited,
            "suggestions": deterministic_suggestions(context), "generated_by": "mock"}


def _normalize_suggestions(raw, context: dict, first_turn: bool) -> list[str]:
    """首轮恒用系统结构化开场；后续轮次用模型输出（非法则兜底系统开场）。"""
    if first_turn:
        return deterministic_suggestions(context)
    suggestions: list[str] = []
    if isinstance(raw, list):
        for item in raw:
            text = str(item or "").strip()
            if text:
                suggestions.append(text[:SUGGESTION_CHARS])
    if not suggestions:
        return deterministic_suggestions(context)
    return suggestions[:MAX_SUGGESTIONS]


def _normalize_cited(raw, context: dict) -> list[str]:
    """cited_facts 只保留白名单内的来源指针（模型幻觉指针一律丢弃）。"""
    if not isinstance(raw, list):
        return []
    allowed = context.get("allowed_refs") or set()
    cited: list[str] = []
    for item in raw:
        ref = str(item or "").strip()
        if ref and ref in allowed and ref not in cited:
            cited.append(ref)
    return cited[:MAX_CITED_FACTS]


def _request_chat(chat_provider, messages: list):
    """单聊模型调用：json_object 约束优先；deepseek 该模式在多轮请求下偶发
    纯空白补全（finish_reason=stop），先加催促重试一次（改 prompt 破除病态
    缓存态），仍空白则放弃格式约束取散文回复（调用方按纯文本兜底解析）。"""
    response = chat_provider.chat(messages, response_format={"type": "json_object"})
    if response.mock or response.text.strip():
        return response
    logger.warning("单聊返回空白补全，加催促重试一次")
    nudged = [*messages, {"role": "user", "content": "请只输出一个 json 对象。"}]
    response = chat_provider.chat(nudged, response_format={"type": "json_object"})
    if response.mock or response.text.strip():
        return response
    logger.warning("单聊空白补全复现，放弃 json 约束取散文回复")
    return chat_provider.chat(messages)


def chat_with_player(memory, store, chat_provider, person_id: str,
                     message: str, history: list | None = None) -> dict | None:
    """一轮玩家 ↔ 数字分身对话。人物不存在/未确认返回 None（路由转 404/403）。

    provider mock（未配置/调用失败降级）→ 确定性 mock_reply；
    模型输出经 extract_json 宽容解析：JSON 损坏时把原始文本截断当 reply
    （cited_facts 置空），绝不向调用方抛解析异常。
    """
    context = build_chat_context(memory, store, person_id)
    if context is None:
        return None
    history = (history or [])[-MAX_HISTORY_TURNS:]
    first_turn = not history

    prompt_payload = {
        "授权资料": {
            "name": context["name"],
            "tags": context["tags"],
            "places": context["places"],
            "fact_excerpts": context["fact_excerpts"],
            "memory_lines": context["memory_lines"],
            "relation_lines": context["relation_lines"],
            "first_impressions": context["first_impressions"],
            "player_notes": context["player_notes"],
        },
        "可引用来源": {
            "facts": context["facts_index"],
            "inferences": context["inferences_index"],
        },
        "对方说": message,
    }
    messages = [{"role": "system", "content": build_system_prompt(context)}]
    for turn in history:
        role = turn.get("role")
        content = str(turn.get("content") or "")[:MAX_MESSAGE_CHARS]
        if role in ("user", "assistant") and content:
            messages.append({"role": role, "content": content})
    messages.append(
        {"role": "user", "content": json.dumps(prompt_payload, ensure_ascii=False)}
    )

    response = _request_chat(chat_provider, messages)
    if response.mock:
        result = mock_reply(context, message)
        result["suggestions"] = deterministic_suggestions(context) if first_turn \
            else result["suggestions"]
        return result

    data = extract_json(response.text)
    if data and str(data.get("reply") or "").strip():
        reply = str(data["reply"]).strip()[:MAX_MESSAGE_CHARS]
        cited = _normalize_cited(data.get("cited_facts"), context)
        suggestions = _normalize_suggestions(data.get("suggestions"), context, first_turn)
    else:
        # 解析失败兜底：原始文本截断当回复，不带来源指针
        logger.warning("单聊输出解析失败，降级为纯文本回复：%.80s", response.text)
        reply = (response.text or "").strip()[:200] or "我刚走神了，你再说一次？"
        cited = []
        suggestions = deterministic_suggestions(context)
    return {
        "reply": reply,
        "cited_facts": cited,
        "suggestions": suggestions,
        "generated_by": response.model,
    }


def save_chat_note(store, person_id: str, text: str) -> dict:
    """把玩家选中的对话要点手动沉淀进推断层（INTERACTION-DESIGN §2「沉淀」）。

    推断 payload 沿用 group-impression 的包壳形状（schema/generated/recomputable），
    note.type="player-note"、author="来自玩家转述"、confidence=1.0；
    source 只有 {"type": "player-chat"} —— 用户录入内容，无事实指针可指。
    返回 {"inference_ref", "note"}。
    """
    note = {
        "id": uuid.uuid4().hex[:12],
        "type": "player-note",
        "author": "来自玩家转述",
        "value": text.strip(),
        "confidence": 1.0,
        "source": {"type": "player-chat"},
        "created_at": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
    }
    payload = {
        "schema": PLAYER_NOTE_SCHEMA,
        "generated": False,
        "recomputable": True,
        "note": note,
    }
    inference_ref = store.write_inference(person_id, f"player-note-{note['id']}", payload)
    return {"inference_ref": inference_ref, "note": note}
