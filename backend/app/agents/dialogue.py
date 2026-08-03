"""对话生成共享层（INTERACTION-DESIGN.md §3）：共同上下文驱动 + 信息量闸门。

目的：让 Agent 对话"有内容"——prompt 注入双方交集上下文（共同 tags、
      relations.md 的关系备注、最近一次互动时间），生成"你上次说的海边摄影展，
      后来办了吗？"而非寒暄模板；生成后由同一 LLM 调用自评 informative，
      false 的对话由调用方拦下（不进事件缓冲，世界保持安静）。
输入：MemoryStore（authorized_agent_view / relations.md / 互动注册表）+ 两个
      person_id；chat provider（deepseek，未配置时调用方走模板兜底）。
输出：build_pair_context() -> prompt 上下文；llm_dialogue() -> {"lines", "informative"}
      或 None（mock/解析失败 → 模板兜底，视为 informative=true）；
      template_dialogue() -> 带关系备注变体的兜底对话。
验收：tests/test_dialogue.py —— prompt 含共同 tags/关系备注/最近互动时间；
      informative=false 被拦、true 放行、自评异常默认放行。

上下文来源：authorized_agent_view（首版为全量视图，TBD-P3 不过滤）与
relations.md 关系行；自评失败/超时默认 informative=true（宁可放行）。
"""

import json
import logging

from app.agents.utils.jsonish import extract_json

logger = logging.getLogger(__name__)

_TAG_SEPARATORS = ("、", ",", "，", " ", "/", "；")


def tag_set(view: dict | None) -> set:
    """把授权视图的 tags（可能是 "a、b、c" 连写）拆成单个标签集合。"""
    tags = set()
    for value in (view or {}).get("tags") or []:
        piece = str(value)
        for sep in _TAG_SEPARATORS:
            piece = piece.replace(sep, " ")
        tags.update(token for token in piece.split() if token)
    return tags


def relation_between(memory, view_a: dict, view_b: dict) -> dict | None:
    """在 relations.md 里找两人的关系备注（格式：人名 | 关系 | 关键词 | 来源事件）。

    返回 {"relation": "旧识", "keywords": [...], "note": "旧识·河堤"}；找不到返回 None。
    """
    if memory is None:
        return None
    for viewer_id, other_view in ((view_a.get("person_id"), view_b),
                                  (view_b.get("person_id"), view_a)):
        other_name = (other_view or {}).get("name")
        if not viewer_id or not other_name:
            continue
        try:
            text = memory.read_relations_md(viewer_id)
        except Exception:
            continue
        for line in text.splitlines():
            if other_name not in line:
                continue
            parts = [part.strip() for part in line.split("|")]
            if len(parts) >= 3 and parts[0] == other_name:
                keywords = [k for k in (k.strip() for k in parts[2].split(",")) if k]
                note = f"{parts[1]}·{keywords[0]}" if keywords else parts[1]
                return {"relation": parts[1], "keywords": keywords, "note": note}
    return None


def build_pair_context(memory, id_a: str, id_b: str) -> dict:
    """组装双方交集上下文（prompt 注入用）：授权视图 + 共同 tags + 关系备注 +
    最近一次互动时间。未确认/无授权视图的人以最小信息占位。"""
    view_a = memory.authorized_agent_view(id_a) if memory else None
    view_b = memory.authorized_agent_view(id_b) if memory else None
    common_tags = sorted(tag_set(view_a) & tag_set(view_b))
    relation = relation_between(memory, view_a or {}, view_b or {})
    last = memory.last_interaction(id_a, id_b) if memory else None
    return {
        "A": view_a or {"person_id": id_a, "name": id_a, "tags": []},
        "B": view_b or {"person_id": id_b, "name": id_b, "tags": []},
        "shared_context": {
            "common_tags": common_tags,
            "relation_note": relation["note"] if relation else None,
            "relation_keywords": relation["keywords"] if relation else [],
            "last_interaction_at": last["last_interaction_at"] if last else None,
        },
    }


def llm_dialogue(chat_provider, pair_context: dict, max_lines: int = 2) -> dict | None:
    """调 chat provider 生成对话并自评信息量。

    返回 {"lines": [("A"|"B", text)], "informative": bool}；
    mock/整体解析失败返回 None（调用方走模板兜底，视为 informative=true）；
    informative 字段缺失/异常默认 True（宁可放行，不丢内容）。
    """
    messages = [
        {"role": "system", "content": (
            "你在为两个 Agent 写偶遇对话。规则：1-2 句简短中文，自然克制；"
            "优先围绕 shared_context（共同标签/关系备注/上次互动时间）接续上次的话题"
            "（如“你上次说的 X，后来怎么样了”），没有共同上下文才寒暄；"
            "只能使用授权上下文里的信息，禁止编造对方的未授权信息。"
            "同时自评：这段对话是否产生了新信息（对两人关系/合作有实质推进）。"
            "只输出 JSON：{\"lines\": [{\"speaker\": \"A|B\", \"text\": \"...\"}],"
            " \"informative\": true|false}。"
        )},
        {"role": "user", "content": "授权上下文（≥ agent-usable）："
         + json.dumps(pair_context, ensure_ascii=False)},
    ]
    response = chat_provider.chat(messages, response_format={"type": "json_object"})
    if response.mock:
        return None
    data = extract_json(response.text)
    if not data or not isinstance(data.get("lines"), list):
        logger.warning("对话生成解析失败，回退模板：%.80s", response.text)
        return None
    lines = []
    for item in data["lines"][:max_lines]:
        if not isinstance(item, dict):
            continue
        speaker = item.get("speaker")
        text = str(item.get("text") or "").strip()
        if speaker in ("A", "B") and text:
            lines.append((speaker, text[:120]))
    informative = data.get("informative", True)
    if not isinstance(informative, bool):
        informative = True  # 自评异常默认放行
    return {"lines": lines, "informative": informative}


def template_dialogue(pair_context: dict, id_a: str, id_b: str) -> list:
    """模板兜底（视为 informative=true）：带关系备注的变体，只用授权字段。

    返回 [(speaker_id, listener_id, text)]，优先级：共同标签接续 → 关系备注
    叙旧 → 通用（带对方授权标签，否则纯寒暄）。
    """
    view_a, view_b = pair_context["A"], pair_context["B"]
    shared = pair_context["shared_context"]
    name_a = view_a.get("name") or id_a
    name_b = view_b.get("name") or id_b
    if shared["common_tags"]:
        tag = shared["common_tags"][0]
        return [
            (id_a, id_b, f"{name_b}，上次说的{tag}，后来有进展吗？"),
            (id_b, id_a, f"有点意思，回头我把资料发你，{name_a}。"),
        ]
    if shared["relation_keywords"]:
        keyword = shared["relation_keywords"][0]
        return [
            (id_a, id_b, f"{name_b}，{keyword}那次之后好久不见。"),
            (id_b, id_a, f"是啊{name_a}，找时间再聚。"),
        ]
    tags_b = tag_set(view_b)
    if tags_b:
        tag = sorted(tags_b)[0]
        return [
            (id_a, id_b, f"{name_b}，最近还在忙{tag}的事吗？"),
            (id_b, id_a, f"是啊。你呢，{name_a}，最近怎么样？"),
        ]
    return [
        (id_a, id_b, f"{name_b}，过来跟你打个招呼。"),
        (id_b, id_a, f"欢迎，{name_a}，最近怎么样？"),
    ]
