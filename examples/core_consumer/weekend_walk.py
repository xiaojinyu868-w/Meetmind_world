"""Standalone synthetic integration: three friends, a walk and personal follow-up.
Only imports the installed meetmind_core package and Python standard library.
"""
from __future__ import annotations
import argparse
from copy import deepcopy
from datetime import datetime, timezone
import json
from pathlib import Path

from meetmind_core import (project_events, calendar_event_to_envelope,
                           checkin_to_envelope, action_calendar)

MEMBERS = ["lin", "yan", "chen"]
WORLD = "weekend-walk"


def run(output):
    events = []
    snapshots = {}

    def append(kind, actor, subject, payload, refs=(), audience=None):
        event = {"schema": "meetmind.event.v1", "event_id": f"walk-{len(events) + 1}",
                 "sequence": len(events) + 1, "room_id": WORLD, "actor_id": actor,
                 "subject_id": subject, "type": kind, "payload": payload,
                 "audience": list(audience or MEMBERS), "source_refs": list(refs)}
        # Validation occurs before publishing into this consumer's history.
        project_events(events + [event], viewer_id=actor, members=MEMBERS)
        events.append(event)
        return event

    def snapshot(label):
        views = {who: project_events(events, viewer_id=who, members=MEMBERS) for who in MEMBERS}
        snapshots[label] = deepcopy(views)
        return views["lin"]

    def entity(state, identity):
        return next(item for item in state["entities"] if item["id"] == identity)

    created = append("world.created", "lin", WORLD, {"title": "周末散步 · 合成接入样例"})
    for who, name in zip(MEMBERS, ["小林", "小言", "小陈"]):
        append("identity.claimed", who, who, {"display_name": name}, [created["event_id"]])
    append("identity.candidate.observed", "chen", "private-candidate", {},
           [created["event_id"]], audience=["chen"])
    report = calendar_event_to_envelope({
        "provider": "synthetic-calendar", "event_id": "walk-20260912", "actor_id": "lin",
        "title": "小林记录：我们周六一起散步", "attendance_confirmed": True,
        "starts_at": "2026-09-12T09:00:00+08:00", "ends_at": "2026-09-12T10:00:00+08:00",
        "participant_ids": MEMBERS,
    }, sequence=len(events) + 1, room_id=WORLD, actor_id="lin",
       audience=MEMBERS, source_ref=created["event_id"])
    project_events(events + [report], viewer_id="lin", members=MEMBERS)
    events.append(report)
    memory_id = report["subject_id"]
    first = snapshot("experience")
    assert entity(first, memory_id)["reported_by"] == "lin"
    assert not any(x["id"] == "private-candidate" for x in first["entities"])
    assert any(x["id"] == "private-candidate" for x in snapshots["experience"]["chen"]["entities"])

    recipe = {"schema": "meetmind.scene-recipe.v1", "title": "散步留下的小径",
              "rationale": "人工编写的符号表达，不是实景重建。", "parts": [
        {"id": "path", "geometry": "box", "size": [2, .1, .5],
         "position": [0, .1, 0], "rotation": [0, 0, 0], "color": "#9ba98c",
         "material": "wood", "meaning": "小林记录的一次共同散步"},
        {"id": "marker", "geometry": "sphere", "size": [.25, .25, .25],
         "position": [.8, .3, 0], "rotation": [0, 0, 0], "color": "#e4ba7b",
         "material": "ceramic", "meaning": "这一段经历的纪念标记"},
    ]}
    applied = append("visual.recipe.applied", "lin", memory_id,
                     {"recipe": recipe, "model": "manual-example/no-model-call"}, [report["event_id"]])
    before_patch = snapshot("symbolic-world")
    append("visual.recipe.patched", "lin", memory_id, {
        "model": "manual-example/no-model-call",
        "patch": {"schema": "meetmind.scene-patch.v1", "title": "小径与蓝色标记",
                  "rationale": "只调整标记颜色，不改变参与关系。",
                  "operations": [{"op": "update", "id": "marker", "changes": {"color": "#789fae"}}]},
    }, [applied["event_id"]])
    changed = snapshot("local-change")
    assert entity(changed, memory_id)["source_event"] == report["event_id"]
    assert entity(changed, memory_id)["appearance"]["parts"][0] == recipe["parts"][0]
    assert changed["relationships"] == before_patch["relationships"]
    assert entity(changed, memory_id)["appearance_changes"]["preserved"] == ["path"]

    action = append("action.proposed", "lin", "next-walk", {
        "title": "下次各自走一公里，再记录自己的感受", "participant_ids": MEMBERS,
        "plan": {"scheduled_at": "2026-09-13T09:00:00+08:00", "duration_minutes": 30,
                 "location": "合成公园", "success_criteria": "本人记录是否走完，以及是否愿意继续"},
    }, [report["event_id"]])
    accepted = append("action.accepted", "lin", "next-walk", {}, [action["event_id"]])
    append("action.declined", "yan", "next-walk", {}, [action["event_id"]])
    decisions = snapshot("personal-choices")
    next_action = entity(decisions, "next-walk")
    assert set(next_action["decisions"]) == {"lin", "yan"}  # Chen has not decided.
    assert next_action["outcomes"] == {}
    calendar = action_calendar(next_action, "lin", now=datetime(2026, 9, 12, tzinfo=timezone.utc))
    assert "ATTENDEE" not in calendar
    try:
        action_calendar(next_action, "yan")
    except ValueError:
        pass
    else:
        raise AssertionError("Declined participant cannot export an accepted plan")
    outcome = append("action.outcome.recorded", "lin", "next-walk", {
        "result": "completed", "report_kind": "self_report", "note": "合成自报：我走完了一公里。",
    }, [accepted["event_id"]])
    completed = snapshot("personal-feedback")
    assert set(entity(completed, "next-walk")["outcomes"]) == {"lin"}
    # A later explicit observation can enter the same world without replacing prior objects.
    checkin = checkin_to_envelope({"provider": "synthetic-checkin", "event_id": "next-visit",
        "confirmed": True, "location": "合成公园", "occurred_at": "2026-09-13T09:35:00+08:00"},
        sequence=len(events) + 1, room_id=WORLD, actor_id="lin",
        audience=MEMBERS, source_ref=outcome["event_id"])
    project_events(events + [checkin], viewer_id="lin", members=MEMBERS)
    events.append(checkin)
    growing = snapshot("next-experience")
    assert entity(growing, memory_id)["id"] == memory_id
    assert all(edge["from"] == "lin" for edge in growing["relationships"]
               if edge["to"] == checkin["subject_id"])

    append("action.outcome.revoked", "lin", "next-walk", {"target_event_id": outcome["event_id"]},
           [outcome["event_id"]])
    append("experience.revoked", "lin", memory_id, {}, [report["event_id"]])
    withdrawn = snapshot("withdrawn-source")
    assert not any(x["id"] == memory_id for x in withdrawn["entities"])
    assert entity(withdrawn, "next-walk")["basis_status"] == "withdrawn"
    assert entity(withdrawn, "next-walk")["outcomes"] == {}
    assert entity(withdrawn, checkin["subject_id"])["reported_by"] == "lin"
    assert len(events) == project_events(events + [events[-1]], viewer_id="lin", members=MEMBERS)["basis"]["through_sequence"]

    output = Path(output)
    output.mkdir(parents=True, exist_ok=True)
    (output / "events.json").write_text(json.dumps(events, ensure_ascii=False, indent=2), encoding="utf-8")
    restored = json.loads((output / "events.json").read_text(encoding="utf-8"))
    assert project_events(restored, viewer_id="lin", members=MEMBERS) == withdrawn
    (output / "stages.json").write_text(json.dumps(snapshots, ensure_ascii=False, indent=2), encoding="utf-8")
    (output / "lin-next-walk.ics").write_bytes(calendar.encode("utf-8"))
    report = {"synthetic": True, "model_called": False, "members": MEMBERS, "events": len(events),
              "stages": list(snapshots), "source_withdrawn": True, "installed_core_integration": "passed"}
    print(json.dumps(report, ensure_ascii=False))
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True, help="Private local output directory")
    run(parser.parse_args().output)
