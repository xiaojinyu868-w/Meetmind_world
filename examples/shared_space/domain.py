"""Deterministic synthetic shared space; horizontal geometry is not a building standard."""
from copy import deepcopy
import math
from datetime import date

SCHEMA = "meetmind.shared-space.v1"
MEMBERS = {"alice": "小满", "bo": "阿博"}
DECISIONS = {"accepted": "接受", "changes": "需要修改", "measure": "需要测量", "defer": "暂不决定"}
ACTION_STATUS = {"pending": "待办", "done": "本人报告完成", "not_done": "本人报告未完成"}
PRESETS = {
    "A": {"desk": (1.1, 4.1), "sofa": (4.3, 3.8), "shelf": (.35, 1.5), "table": (3.2, 2.1)},
    "B": {"desk": (1.1, 4.1), "sofa": (4.65, 1.3), "shelf": (.35, 1.5), "table": (2.8, 2.6)},
}


def _require(condition, message):
    if not condition:
        raise ValueError(message)


def _keys(value, required, optional=()):
    _require(type(value) is dict, "必须是对象")
    _require(set(required) <= set(value) <= set(required) | set(optional), "字段缺失或包含未知字段")


def _text(value, label="文本", maximum=600, empty=False):
    _require(type(value) is str and len(value) <= maximum and (empty or bool(value.strip())), f"{label}无效或过长")
    _require(not any(ord(c) < 32 and c not in "\n\t" for c in value), f"{label}包含控制字符")
    return value.strip()


def _number(value, label="尺寸", positive=False):
    try:
        finite = type(value) in (int, float) and math.isfinite(value)
    except (OverflowError, TypeError):
        finite = False
    _require(finite, f"{label}必须是有限数字")
    _require(not positive or value > 0, f"{label}必须大于零")
    return value


def _integer(value, minimum=0):
    _require(type(value) is int and value >= minimum, "版本或游标无效")


def _actor(actor):
    _require(type(actor) is str and actor in MEMBERS, "参与者无效")


def _rectangle(value):
    for key in ("x", "z"):
        _number(value[key], key)
    for key in ("width", "depth"):
        _number(value[key], key, positive=True)


def _rotation(value):
    _require(type(value) is int and value in (0, 90), "旋转只支持 0 或 90 度")


def _unique(items):
    _require(type(items) is list, "必须是数组")
    ids = [item.get("id") if type(item) is dict else None for item in items]
    for identity in ids:
        _text(identity, "ID", 80)
    _require(len(set(ids)) == len(ids), "ID 不能重复")


def _dimensions(value):
    for key in ("width", "depth", "height"):
        _number(value[key], key)
        _require(.05 <= value[key] <= 10, "家具测量尺寸须在 0.05 到 10 米之间")


def _date(value):
    _text(value, "测量日期", 10)
    try:
        parsed = date.fromisoformat(value)
    except ValueError:
        raise ValueError("测量日期须为 YYYY-MM-DD") from None
    _require(parsed.isoformat() == value, "测量日期须为 YYYY-MM-DD")


def measurement_is_current(state, measurement):
    action = next(a for a in state["actions"] if a["id"] == measurement["action_id"])
    return (not measurement["withdrawn"] and action["status"] == "done"
            and action["report_version"] == measurement["report_version"])


def validate_state(state):
    _keys(state, ("schema", "revision", "sequence", "members", "room", "objects",
                  "requirements", "memories", "decisions", "actions", "measurements", "history"))
    _require(state["schema"] == SCHEMA and state["members"] == MEMBERS, "状态 schema 或参与者无效")
    _integer(state["revision"], 1)
    _integer(state["sequence"])
    room = state["room"]
    _keys(room, ("width", "depth", "height", "unit", "door"))
    for key in ("width", "depth", "height"):
        _number(room[key], key, positive=True)
    _require(room["unit"] == "m", "空间单位必须为米")
    _keys(room["door"], ("x", "z", "width", "depth"))
    _rectangle(room["door"])
    for name in ("objects", "requirements", "memories", "actions", "measurements"):
        _unique(state[name])
    memory_ids = {item["id"] for item in state["memories"]}
    for item in state["objects"]:
        _keys(item, ("id", "label", "kind", "width", "depth", "height", "x", "z", "rotation", "cost"), ("source_id", "measurement_id"))
        _text(item["label"], maximum=120)
        _text(item["kind"], maximum=80)
        _rectangle(item)
        _number(item["height"], positive=True)
        _number(item["cost"], "费用")
        _require(item["cost"] >= 0, "费用不能小于零")
        _rotation(item["rotation"])
        _require("source_id" not in item or item["source_id"] in memory_ids, "物品来源不存在")
    for item in state["requirements"]:
        _keys(item, ("id", "owner", "label", "enabled", "source_id", "source_version", "review_needed"), ("zone",))
        _actor(item["owner"])
        _text(item["label"], maximum=180)
        _require(type(item["enabled"]) is bool and type(item["review_needed"]) is bool, "要求开关无效")
        _integer(item["source_version"])
        _require(item["source_id"] is None or item["source_id"] in memory_ids, "要求来源不存在")
        if item["source_id"] is not None:
            memory = next(m for m in state["memories"] if m["id"] == item["source_id"])
            _require(item["source_version"] <= memory["version"], "要求依据版本超前")
        else:
            _require(item["source_version"] == 0, "无经历来源时版本须为零")
        if "zone" in item:
            _keys(item["zone"], ("x", "z", "width", "depth"))
            _rectangle(item["zone"])
    for item in state["memories"]:
        _keys(item, ("id", "owner", "text", "version", "withdrawn", "replies",
                     "origin", "occurred_on", "source_note"))
        _actor(item["owner"])
        _text(item["text"])
        _require(item["origin"] in ("synthetic", "participant-entry"), "经历来源类型无效")
        if item["occurred_on"] is not None:
            _date(item["occurred_on"])
        _text(item["source_note"], "经历来源说明", 240, empty=True)
        _integer(item["version"], 1)
        _require(type(item["withdrawn"]) is bool, "撤回状态无效")
        _require(type(item["replies"]) is dict, "回应必须是对象")
        for actor, reply in item["replies"].items():
            _actor(actor)
            _keys(reply, ("status", "note"))
            _require(reply["status"] in ("confirmed", "different"), "回应状态无效")
            _text(reply["note"], empty=True)
    _require(type(state["decisions"]) is dict, "选择必须是对象")
    for actor, decision in state["decisions"].items():
        _actor(actor)
        _keys(decision, ("revision", "status", "note"))
        _integer(decision["revision"], 1)
        _require(decision["revision"] <= state["revision"] and type(decision["status"]) is str and decision["status"] in DECISIONS, "选择版本或状态无效")
        _text(decision["note"], empty=True)
    for action in state["actions"]:
        _keys(action, ("id", "owner", "text", "status", "due_at", "completion_criteria",
                       "measurement", "result_source", "report_note", "report_version"))
        _actor(action["owner"])
        _integer(action["report_version"])
        _text(action["text"], maximum=240)
        _require(type(action["status"]) is str and action["status"] in ACTION_STATUS, "行动状态无效")
        for key, maximum in (("due_at", 80), ("completion_criteria", 360), ("measurement", 240),
                             ("result_source", 240), ("report_note", 360)):
            _text(action[key], key, maximum, empty=True)
    action_ids = {item["id"] for item in state["actions"]}
    object_ids = {item["id"] for item in state["objects"]}
    measurement_ids = {item["id"] for item in state["measurements"]}
    for item in state["measurements"]:
        _keys(item, ("id", "owner", "action_id", "object_id", "width", "depth", "height",
                     "source", "measured_on", "report_version", "withdrawn"))
        _actor(item["owner"])
        _require(item["action_id"] in action_ids and item["object_id"] in object_ids, "测量关联不存在")
        action = next(a for a in state["actions"] if a["id"] == item["action_id"])
        _require(item["owner"] == action["owner"], "测量必须来自行动本人")
        _integer(item["report_version"], 1)
        _require(item["report_version"] <= action["report_version"], "测量报告版本无效")
        _dimensions(item)
        _text(item["source"], "测量来源", 240)
        _date(item["measured_on"])
        _require(type(item["withdrawn"]) is bool, "测量撤回状态无效")
    for item in state["objects"]:
        if "measurement_id" in item:
            _require(item["measurement_id"] in measurement_ids, "尺寸测量来源不存在")
            measurement = next(m for m in state["measurements"] if m["id"] == item["measurement_id"])
            _require(measurement["object_id"] == item["id"], "尺寸来源对象不匹配")
            _require(all(item[k] == measurement[k] for k in ("width", "depth", "height")), "尺寸与测量来源不一致")
    _require(type(state["history"]) is list and len(state["history"]) == state["sequence"], "历史游标不连续")
    for index, entry in enumerate(state["history"], 1):
        _keys(entry, ("sequence", "actor", "type", "summary", "revision"))
        _actor(entry["actor"])
        _require(type(entry["sequence"]) is int and entry["sequence"] == index, "历史游标不连续")
        _integer(entry["revision"], 1)
        _require(entry["revision"] <= state["revision"], "历史版本无效")
        _text(entry["type"], maximum=80)
        _text(entry["summary"], maximum=800)


def initial_state():
    objects = []
    for identity, label, width, depth, height, cost in (
        ("desk", "工作桌", 1.8, .75, .75, 600), ("sofa", "双人沙发", 2, .85, .85, 1600),
        ("shelf", "纸桥展示架", .55, 1.5, 1.4, 300), ("table", "小茶几", 1.1, .65, .5, 280),
    ):
        x, z = PRESETS["A"][identity]
        objects.append({"id": identity, "label": label, "kind": identity, "width": width, "depth": depth,
                        "height": height, "x": x, "z": z, "rotation": 0, "cost": cost})
    objects[2]["source_id"] = "bridge"
    return {"schema": SCHEMA, "revision": 1, "sequence": 0, "members": dict(MEMBERS),
            "room": {"width": 6, "depth": 5, "height": 2.8, "unit": "m",
                     "door": {"x": 3, "z": .55, "width": 1.2, "depth": 1.1}},
            "objects": objects,
            "requirements": [
                {"id": "work", "owner": "alice", "label": "留出工作桌前的空间", "enabled": False,
                 "zone": {"x": 1.1, "z": 3.2, "width": 1.4, "depth": 1},
                 "source_id": "office", "source_version": 1, "review_needed": False},
                {"id": "exercise", "owner": "bo", "label": "留出运动空间", "enabled": False,
                 "zone": {"x": 4.4, "z": 3.35, "width": 1.8, "depth": 2.2},
                 "source_id": None, "source_version": 0, "review_needed": False},
                {"id": "keep", "owner": "bo", "label": "保留一起制作的纸桥和展示架", "enabled": False,
                 "source_id": "bridge", "source_version": 1, "review_needed": False}],
            "memories": [
                {"id": "office", "owner": "alice", "text": "上次我们在客厅开视频会议，另一方被打扰。",
                 "version": 1, "withdrawn": False, "replies": {}, "origin": "synthetic", "occurred_on": None, "source_note": "人工合成样例"},
                {"id": "bridge", "owner": "bo", "text": "我们一起做的纸桥想要保留，放在展示架上。",
                 "version": 1, "withdrawn": False, "replies": {}, "origin": "synthetic", "occurred_on": None, "source_note": "人工合成样例"}],
            "decisions": {}, "actions": [], "measurements": [], "history": []}


def _bounds(item):
    width, depth = item["width"], item["depth"]
    if item.get("rotation", 0) == 90:
        width, depth = depth, width
    return (item["x"] - width / 2, item["x"] + width / 2, item["z"] - depth / 2, item["z"] + depth / 2)


def _overlaps(a, b):
    ax0, ax1, az0, az1 = _bounds(a)
    bx0, bx1, bz0, bz1 = _bounds(b)
    return min(ax1, bx1) - max(ax0, bx0) > 1e-9 and min(az1, bz1) - max(az0, bz0) > 1e-9


def _outside(item, room):
    x0, x1, z0, z1 = _bounds(item)
    return x0 < -1e-9 or z0 < -1e-9 or x1 > room["width"] + 1e-9 or z1 > room["depth"] + 1e-9


def evaluate(state):
    """Return explainable violations; passing only evidences basic geometry."""
    validate_state(state)
    result = []
    room, objects = state["room"], state["objects"]
    for index, item in enumerate(objects):
        if _outside(item, room) or item["height"] > room["height"]:
            result.append({"id": f"bounds:{item['id']}", "object_ids": [item["id"]],
                           "message": f"{item['label']}超出房间边界"})
        if _overlaps(item, room["door"]):
            result.append({"id": f"door:{item['id']}", "object_ids": [item["id"]],
                           "message": f"{item['label']}占用了门口预留区"})
        for other in objects[index + 1:]:
            if _overlaps(item, other):
                result.append({"id": f"overlap:{item['id']}:{other['id']}", "object_ids": [item["id"], other["id"]],
                               "message": f"{item['label']}与{other['label']}重叠"})
    for requirement in state["requirements"]:
        if not requirement["enabled"] or "zone" not in requirement:
            continue
        zone, rid = requirement["zone"], requirement["id"]
        if _outside(zone, room):
            result.append({"id": f"zone-bounds:{rid}", "object_ids": [], "requirement_id": rid,
                           "message": f"{requirement['label']}超出房间范围"})
        for item in objects:
            if _overlaps(zone, item):
                result.append({"id": f"zone:{rid}:{item['id']}", "object_ids": [item["id"]], "requirement_id": rid,
                               "message": f"{item['label']}占用了{MEMBERS[requirement['owner']]}要求的“{requirement['label']}”"})
    if any(item["id"] == "keep" and item["enabled"] for item in state["requirements"]):
        if not any(item["id"] == "shelf" and item.get("source_id") == "bridge" for item in objects):
            result.append({"id": "keep:shelf", "object_ids": [], "requirement_id": "keep",
                           "message": "保留纸桥的要求尚未落实到展示架"})
    for item in objects:
        if "measurement_id" not in item:
            continue
        measurement = _find(state["measurements"], item["measurement_id"])
        if not measurement_is_current(state, measurement):
            result.append({"id": f"measurement-stale:{item['id']}", "object_ids": [item["id"]],
                           "message": f"{item['label']}的尺寸来源已撤回或行动报告已变化，请重新测量并应用；当前尺寸暂保留"})
    return result


def _find(items, identity):
    _text(identity, "ID", 80)
    item = next((item for item in items if item["id"] == identity), None)
    _require(item is not None, "指定对象不存在")
    return item



def _preview_moves(state, moves, maximum=4):
    """Copy and validate a batch without testing intermediate furniture positions."""
    validate_state(state)
    _require(type(moves) is list and 1 <= len(moves) <= min(maximum, len(state["objects"])),
             "布局修改数量无效")
    result = deepcopy(state)
    seen, changed = set(), []
    for move in moves:
        _keys(move, ("object_id", "x", "z", "rotation"))
        identity = _text(move["object_id"], "物品 ID", 80)
        _require(identity not in seen, "布局修改不能重复指定物品")
        seen.add(identity)
        item = _find(result["objects"], identity)
        x, z = _number(move["x"], "x"), _number(move["z"], "z")
        _require(-10 <= x <= 20 and -10 <= z <= 20, "提案坐标必须在 -10 到 20 米之间")
        _rotation(move["rotation"])
        if (item["x"], item["z"], item["rotation"]) != (x, z, move["rotation"]):
            changed.append(identity)
        item.update(x=x, z=z, rotation=move["rotation"])
    _require(bool(changed), "提案没有需要应用的位置变化")
    return result, changed


def measurement_preview(state, measurement_id):
    """Apply a recorded observation to a copy; conflicts remain visible, never hidden."""
    validate_state(state)
    measurement = _find(state["measurements"], measurement_id)
    _require(measurement_is_current(state, measurement), "测量依据已撤回或报告已变化，请本人重新记录")
    result = deepcopy(state)
    item = _find(result["objects"], measurement["object_id"])
    _require(item.get("measurement_id") != measurement_id, "这份测量已经用于当前尺寸")
    for key in ("width", "depth", "height"):
        item[key] = measurement[key]
    item["measurement_id"] = measurement_id
    validate_state(result)
    return result


def apply_command(state, actor, command):
    """Validate and copy before mutation; deterministic action IDs enable replay."""
    _actor(actor)
    validate_state(state)
    _require(type(command) is dict, "命令必须是对象")
    kind = command.get("type")
    _require(type(kind) is str, "命令类型无效")
    schemas = {
        "object.move": ("object_id", "x", "z", "rotation"), "layout.preset": ("preset",),
        "layout.patch": ("basis_revision", "moves", "provenance"),
        "memory.add": ("text", "occurred_on", "source_note"),
        "requirement.add": ("label", "source_id", "source_version", "zone"),
        "requirement.update": ("requirement_id", "label", "source_id", "source_version", "zone"),
        "requirement.set": ("requirement_id", "enabled"), "memory.edit": ("memory_id", "text"),
        "memory.withdraw": ("memory_id",), "memory.reply": ("memory_id", "status", "note"),
        "measurement.record": ("action_id", "object_id", "width", "depth", "height", "source", "measured_on"),
        "measurement.apply": ("measurement_id", "basis_revision"),
        "measurement.withdraw": ("measurement_id",),
        "decision.set": ("status", "note"), "action.add": ("text",), "action.report": ("action_id", "status"),
    }
    _require(kind in schemas, "不支持的命令")
    optional = ()
    if kind == "action.add":
        optional = ("due_at", "completion_criteria", "measurement", "result_source")
    elif kind == "action.report":
        optional = ("note", "result_source")
    elif kind == "memory.edit":
        optional = ("occurred_on", "source_note", "basis_version")
    elif kind in ("memory.reply", "memory.withdraw"):
        optional = ("basis_version",)
    elif kind == "requirement.set":
        optional = ("source_version",)
    elif kind in ("requirement.add", "requirement.update"):
        optional = ("basis_revision",)
    _keys(command, ("type",) + schemas[kind], optional)
    result = deepcopy(state)
    change_revision = False
    if kind == "object.move":
        item = _find(result["objects"], command["object_id"])
        x, z = _number(command["x"], "x"), _number(command["z"], "z")
        _rotation(command["rotation"])
        item.update(x=x, z=z, rotation=command["rotation"])
        change_revision = True
        summary = f"移动{item['label']}到 ({x}, {z}) 米，旋转 {item['rotation']} 度"
    elif kind == "layout.preset":
        _require(command["preset"] in ("A", "B"), "布局样例无效")
        for item in result["objects"]:
            _require(item["id"] in PRESETS[command["preset"]], "样例布局不支持这个物品")
            item["x"], item["z"] = PRESETS[command["preset"]][item["id"]]
            item["rotation"] = 0
        change_revision = True
        summary = f"应用人工布局样例 {command['preset']}"
    elif kind == "layout.patch":
        _integer(command["basis_revision"], 1)
        _require(command["basis_revision"] == state["revision"], "布局提案依据版本已过期")
        provenance = command["provenance"]
        _keys(provenance, ("kind", "label", "model"))
        _require(provenance["kind"] in ("manual-demo", "model"), "布局提案来源无效")
        label = _text(provenance["label"], "来源名称", 120)
        if provenance["kind"] == "manual-demo":
            _require(provenance["model"] is None, "人工样例不能声明模型来源")
            source = f"人工样例：{label}"
        else:
            model = _text(provenance["model"], "模型名称", 120)
            source = f"模型提案：{label}；模型 {model}"
        result, changed = _preview_moves(state, command["moves"])
        _require(not any(item["review_needed"] for item in result["requirements"]),
                 "经历依据已变化，请要求的本人重新核对后再应用提案")
        _require(not evaluate(result), "布局提案最终仍有空间冲突，未应用任何修改")
        change_revision = True
        summary = f"应用布局提案，移动 {len(changed)} 个物品；{source}；参与者仍需分别选择是否接受"
    elif kind == "memory.add":
        occurred_on = command["occurred_on"]
        if occurred_on is not None:
            _date(occurred_on)
        result["memories"].append({"id": f"memory-{state['sequence'] + 1}", "owner": actor,
                                  "text": _text(command["text"]), "occurred_on": occurred_on,
                                  "source_note": _text(command["source_note"], "经历来源说明", 240, empty=True),
                                  "origin": "participant-entry", "version": 1, "withdrawn": False, "replies": {}})
        summary = "本人添加一段经历；未自动生成要求或改变布局"
    elif kind in ("requirement.add", "requirement.update"):
        if "basis_revision" in command:
            _integer(command["basis_revision"], 1)
            _require(command["basis_revision"] == state["revision"], "方案已变化，请重新查看经历与要求后编辑")
        if kind == "requirement.update":
            item = _find(result["requirements"], command["requirement_id"])
            _require(item["owner"] == actor, "只能修改本人的要求")
            _require("zone" in item, "这个保留物品要求不支持编辑空间区域")
        _keys(command["zone"], ("x", "z", "width", "depth"))
        _rectangle(command["zone"])
        _require(all(.1 <= command["zone"][k] <= 10 for k in ("width", "depth")), "活动区域宽深须在 0.1 到 10 米之间")
        _require(all(-10 <= command["zone"][k] <= 20 for k in ("x", "z")), "活动区域中心须在 -10 到 20 米之间")
        _integer(command["source_version"])
        if command["source_id"] is not None:
            memory = _find(result["memories"], command["source_id"])
            _require(not memory["withdrawn"], "经历已撤回，不能作为新依据；可改为本人独立要求")
            _require(command["source_version"] == memory["version"], "经历版本已变化，请重新查看后关联")
        else:
            _require(command["source_version"] == 0, "无经历来源时版本须为零")
        fields = {"label": _text(command["label"], "要求名称", 180), "source_id": command["source_id"],
                  "source_version": command["source_version"], "zone": deepcopy(command["zone"]),
                  "enabled": True, "review_needed": False}
        if kind == "requirement.add":
            item = {"id": f"requirement-{state['sequence'] + 1}", "owner": actor, **fields}
            result["requirements"].append(item)
        else:
            item.update(fields)
        change_revision = True
        summary = f"本人{'新增并启用' if kind == 'requirement.add' else '修改并确认'}活动区域要求：{item['label']}"
    elif kind == "requirement.set":
        item = _find(result["requirements"], command["requirement_id"])
        _require(item["owner"] == actor, "只能确认本人的要求")
        _require(type(command["enabled"]) is bool, "enabled 必须是布尔值")
        item["enabled"] = command["enabled"]
        if item["source_id"]:
            source = _find(result["memories"], item["source_id"])
            if "source_version" in command:
                _integer(command["source_version"], 1)
                _require(command["source_version"] == source["version"], "经历版本已变化，请查看后重新确认")
            item["source_version"] = source["version"]
        elif "source_version" in command:
            _require(type(command["source_version"]) is int and command["source_version"] == 0, "无经历来源时版本须为零")
        item["review_needed"] = False
        change_revision = True
        summary = f"本人确认{'启用' if item['enabled'] else '不启用'}要求：{item['label']}"
    elif kind in ("memory.edit", "memory.withdraw", "memory.reply"):
        item = _find(result["memories"], command["memory_id"])
        _require(not item["withdrawn"], "这条经历已撤回")
        if "basis_version" in command:
            _integer(command["basis_version"], 1)
            _require(command["basis_version"] == item["version"], "经历版本已变化，请重新查看后操作")
        if kind == "memory.reply":
            _require(command["status"] in ("confirmed", "different"), "回应状态无效")
            item["replies"][actor] = {"status": command["status"], "note": _text(command["note"], empty=True)}
            summary = f"对经历“{item['id']}”给出本人回应：{'确认' if command['status'] == 'confirmed' else '有不同理解'}"
            for requirement in result["requirements"]:
                if requirement["source_id"] == item["id"]:
                    requirement["review_needed"] = True
        else:
            _require(item["owner"] == actor, "只能修改或撤回本人提供的经历")
            if kind == "memory.edit":
                item["text"] = _text(command["text"])
                if "occurred_on" in command:
                    if command["occurred_on"] is not None:
                        _date(command["occurred_on"])
                    item["occurred_on"] = command["occurred_on"]
                if "source_note" in command:
                    item["source_note"] = _text(command["source_note"], "经历来源说明", 240, empty=True)
                summary = f"纠正本人经历：{item['id']}"
            else:
                item["withdrawn"] = True
                summary = f"撤回本人经历依据：{item['id']}；已确认要求由本人重新核对"
            item["version"] += 1
            item["replies"] = {}
            for requirement in result["requirements"]:
                if requirement["source_id"] == item["id"]:
                    requirement["review_needed"] = True
        change_revision = True
    elif kind == "decision.set":
        _require(type(command["status"]) is str and command["status"] in DECISIONS, "选择状态无效")
        note = _text(command["note"], empty=True)
        if command["status"] == "accepted":
            _require(not evaluate(result), "仍有空间冲突，不能接受这个版本")
            _require(not any(item["review_needed"] for item in result["requirements"]),
                     "经历依据已变化，请要求的本人重新核对")
        result["decisions"][actor] = {"revision": result["revision"], "status": command["status"], "note": note}
        summary = f"本人选择：{DECISIONS[command['status']]}第 {result['revision']} 版"
    elif kind == "measurement.record":
        action = _find(result["actions"], command["action_id"])
        _require(action["owner"] == actor, "只能记录本人行动的测量")
        _require(action["status"] == "done", "请先提交本人完成报告，再记录测量")
        _find(result["objects"], command["object_id"])
        _dimensions(command)
        _date(command["measured_on"])
        measurement = {key: command[key] for key in ("action_id", "object_id", "width", "depth", "height", "measured_on")}
        measurement.update(id=f"measurement-{result['sequence'] + 1}", owner=actor,
                           source=_text(command["source"], "测量来源", 240),
                           report_version=action["report_version"], withdrawn=False)
        result["measurements"].append(measurement)
        summary = f"本人记录家具测量 {measurement['id']}；未改变共同尺寸"
    elif kind == "measurement.apply":
        _integer(command["basis_revision"], 1)
        _require(command["basis_revision"] == state["revision"], "测量预览方案已过期，请重新预览")
        result = measurement_preview(state, command["measurement_id"])
        measurement = _find(result["measurements"], command["measurement_id"])
        change_revision = True
        summary = f"将测量 {measurement['id']} 应用于 {measurement['object_id']} 的尺寸；双方需重新决定"
    elif kind == "measurement.withdraw":
        measurement = _find(result["measurements"], command["measurement_id"])
        _require(measurement["owner"] == actor, "只能撤回本人的测量")
        _require(not measurement["withdrawn"], "测量已撤回")
        measurement["withdrawn"] = True
        change_revision = any(item.get("measurement_id") == measurement["id"] for item in result["objects"])
        summary = f"撤回本人测量 {measurement['id']}；若已应用则保留尺寸并标记依据失效"
    elif kind == "action.add":
        text = _text(command["text"], maximum=240)
        fields = {
            "due_at": _text(command.get("due_at", ""), "截止时间", 80, empty=True),
            "completion_criteria": _text(command.get("completion_criteria", ""), "完成标准", 360, empty=True),
            "measurement": _text(command.get("measurement", ""), "待测量事项", 240, empty=True),
            "result_source": _text(command.get("result_source", ""), "结果来源", 240, empty=True),
        }
        result["actions"].append({"id": f"action-{result['sequence'] + 1}", "owner": actor, "text": text,
                                   "status": "pending", **fields, "report_note": "", "report_version": 0})
        summary = f"添加本人下一步：{text}"
    else:
        item = _find(result["actions"], command["action_id"])
        _require(item["owner"] == actor, "只能报告本人的行动结果")
        _require(type(command["status"]) is str and command["status"] in ACTION_STATUS, "行动状态无效")
        item["report_version"] += 1
        linked = {m["id"] for m in result["measurements"] if m["action_id"] == item["id"]}
        change_revision = any(obj.get("measurement_id") in linked for obj in result["objects"])
        item["status"] = command["status"]
        item["report_note"] = _text(command.get("note", ""), "行动报告", 360, empty=True)
        item["result_source"] = _text(command.get("result_source", item["result_source"]), "结果来源", 240, empty=True)
        summary = f"{ACTION_STATUS[item['status']]}：{item['text']}"
    result["revision"] += int(change_revision)
    result["sequence"] += 1
    result["history"].append({"sequence": result["sequence"], "actor": actor, "type": kind, "summary": summary, "revision": result["revision"]})
    validate_state(result)
    return result


def _md(value):
    text = str(value).replace("\\", "\\\\")
    for character in (chr(96), "*", "_", "[", "]", "#", "|"):
        text = text.replace(character, "\\" + character)
    return text.replace("<", "&lt;").replace(">", "&gt;").replace("\r", "").replace("\n", " / ")


def export_summary(state, actor):
    _actor(actor)
    violations = evaluate(state)
    agreed = (not violations and not any(item["review_needed"] for item in state["requirements"])
              and all(state["decisions"].get(person, {}).get("status") == "accepted"
                      and state["decisions"][person]["revision"] == state["revision"] for person in MEMBERS))
    lines = ["# MeetMind 共同空间实验摘要", "",
             f"导出者：{MEMBERS[actor]}；方案版本：{state['revision']}；命令游标：{state['sequence']}。",
             "合成房间、人物、费用与预置经历；参与者新增内容单独标注，未经独立核验。只做水平矩形空间检查，不代表建筑或安装验收。",
             "", f"当前结论：{'双方接受同一版本' if agreed else '尚无当前共同认可的方案'}。", "", "## 本人选择", ""]
    for person, name in MEMBERS.items():
        choice = state["decisions"].get(person)
        if not choice:
            lines.append(f"- {name}：尚未选择。")
        else:
            age = "当前版本" if choice["revision"] == state["revision"] else "已过期，需本人重新选择"
            lines.append(f"- {name}：{DECISIONS[choice['status']]}第 {choice['revision']} 版（{age}）；{_md(choice['note']) or '无附言'}。")
    lines.extend(["", "## 空间检查", ""])
    lines.extend(f"- {_md(item['message'])}。" for item in violations)
    if not violations:
        lines.append("- 当前未检测到简单几何冲突；不表示现实可行性已确认。")
    lines.extend(["", "## 用途与来源", ""])
    for item in state["requirements"]:
        source = next((memory for memory in state["memories"] if memory["id"] == item["source_id"]), None)
        basis = (f"经历 {source['id']}，关联依据版本 {item['source_version']}，当前版本 {source['version']}"
                 + ("（已撤回）" if source["withdrawn"] else "")) if source else "本人提出，无经历推断"
        lines.append(f"- {MEMBERS[item['owner']]}：{_md(item['label'])}；{'已启用' if item['enabled'] else '未启用'}；"
                     f"{basis}；{'需要本人重新核对' if item['review_needed'] else '无待核对变更'}。")
    lines.extend(["", "## 布局与合成费用", ""])
    for item in state["objects"]:
        lines.append(f"- {_md(item['label'])} [{item['id']}]：中心 ({item['x']}, {item['z']}) 米；"
                     f"宽深高 {item['width']} × {item['depth']} × {item['height']} 米；旋转 {item['rotation']}°；合成费用 {item['cost']} 元。")
    lines.extend(["", "## 家具测量来源", ""])
    if not state["measurements"]:
        lines.append("- 尚无参与者测量；使用合成尺寸。")
    for measurement in state["measurements"]:
        applied = any(obj.get("measurement_id") == measurement["id"] for obj in state["objects"])
        validity = "本人测量，未经独立核验" if measurement_is_current(state, measurement) else "依据已失效，不可继续采用"
        lines.append(f"- {_md(measurement['id'])}：{MEMBERS[measurement['owner']]}；物品 {_md(measurement['object_id'])}；"
                     f"{measurement['width']} × {measurement['depth']} × {measurement['height']} 米；"
                     f"日期 {_md(measurement['measured_on'])}；来源 {_md(measurement['source'])}；"
                     f"关联行动 {_md(measurement['action_id'])} 的第 {measurement['report_version']} 份报告；"
                     f"{'用于当前尺寸' if applied else '未用于当前尺寸'}；{validity}。")
    lines.extend(["", "## 经历与各自回应", ""])
    for memory in state["memories"]:
        provenance = "人工合成样例" if memory["origin"] == "synthetic" else "参与者录入，未经独立核验"
        lines.append(f"- 经历 {_md(memory['id'])} 来源类型：{provenance}。")
        if not memory["withdrawn"]:
            lines.append(f"  - 日期：{_md(memory['occurred_on'] or '未填写')}；来源说明：{_md(memory['source_note'] or '未填写')}。")
        lines.append(f"- {MEMBERS[memory['owner']]}的经历 {_md(memory['id'])}，版本 {memory['version']}："
                     + ("已撤回，不再作为经历依据。" if memory["withdrawn"] else _md(memory["text"])))
        for person, reply in memory["replies"].items():
            lines.append(f"  - {MEMBERS[person]}：{'确认' if reply['status'] == 'confirmed' else '有不同理解'}；{_md(reply['note']) or '无附言'}。")
    lines.extend(["", "## 本人下一步", ""])
    if not state["actions"]:
        lines.append("- 尚未添加行动；没有自动分配待办。")
    for action in state["actions"]:
        details = []
        if action["due_at"]:
            details.append(f"截止 {_md(action['due_at'])}")
        if action["completion_criteria"]:
            details.append(f"完成标准：{_md(action['completion_criteria'])}")
        if action["measurement"]:
            details.append(f"待测量：{_md(action['measurement'])}")
        if action["result_source"]:
            details.append(f"结果来源：{_md(action['result_source'])}")
        if action["report_note"]:
            details.append(f"自报：{_md(action['report_note'])}")
        suffix = "；" + "；".join(details) if details else ""
        lines.append(f"- {MEMBERS[action['owner']]}：{_md(action['text'])}；{ACTION_STATUS[action['status']]}{suffix}。")
    lines.extend(["", "行动结果仅为本人自报，不代表另一人完成、已经购买或现实安装成功。", ""])
    return "\n".join(lines)
