"""Deterministic, renderer-neutral replay of synthetic shared experiences.

This module is deliberately independent of FastAPI, model providers and storage.
Members and actor identities must be authenticated by a future transport adapter.
"""
from __future__ import annotations

import argparse
from copy import deepcopy
import json
from pathlib import Path
from typing import Iterable, Mapping

from .recipes import validate_recipe, apply_patch_recipe
from .action_plans import validate_action_plan


class DuplicateEventConflict(ValueError):
    """The same event ID was supplied with different content."""


def _require(condition, message):
    if not condition:
        raise ValueError(message)


def _text(value):
    return isinstance(value, str) and bool(value.strip())


def _ids(value, *, empty=False):
    return (
        isinstance(value, list)
        and (empty or bool(value))
        and all(_text(item) for item in value)
        and len(set(value)) == len(value)
    )


def load_fixture(path: str | Path | None = None) -> tuple[dict, list[dict]]:
    path = Path(path) if path is not None else Path(__file__).with_name("fixture.json")
    fixture = json.loads(path.read_text(encoding="utf-8"))
    _require(isinstance(fixture, dict), "fixture must be an object")
    _require(fixture.get("schema") == "meetmind.shared-experience.fixture.v1", "unsupported fixture schema")
    _require(isinstance(fixture.get("events"), list), "fixture events must be a list")
    _require(_ids(fixture.get("members")), "fixture members must be unique IDs")
    _require(fixture.get("viewer_id") in fixture["members"], "fixture viewer must be a member")
    return fixture, fixture["events"]


EVENT_TYPES = frozenset({
    "world.created", "identity.candidate.observed", "identity.claimed",
    "experience.confirmed", "artifact.observed", "inference.superseded",
    "experience.revoked", "action.proposed", "action.accepted", "action.declined",
    "action.outcome.recorded", "action.outcome.revoked",
    "visual.recipe.applied", "visual.recipe.removed", "visual.recipe.patched",
})


def project_events(events: Iterable[Mapping], *, viewer_id: str, members: Iterable[str]) -> dict:
    """Validate one ordered world stream, then produce a viewer-filtered DTO.

    Duplicate deliveries are idempotent; sequence gaps and unknown commands fail.
    Self-reported outcomes never imply another participant completed an action.
    No input is mutated, and no files or network resources are accessed.
    """
    member_list = list(members)
    _require(_ids(member_list), "members must be unique IDs")
    membership = set(member_list)
    _require(viewer_id in membership, "viewer must be a member")
    seen, ledger, entities = {}, {}, {}
    revoked = set()
    edges = []
    world_id = None
    latest_event_id = None

    def entity(subject, kind=None):
        item = entities.get(subject)
        _require(item is not None and subject not in revoked, "subject must exist and be active")
        _require(kind is None or item["kind"] == kind, "entity kind mismatch")
        return item

    def confirmed_people(participants, audience):
        _require(_ids(participants), "participant_ids must be unique IDs")
        for person_id in participants:
            person = entity(person_id, "person")
            _require(person["claim"] == "confirmed", "participant must have a confirmed identity")
            _require(audience <= person["_audience"], "participant identity is not shared with this audience")

    for raw in events:
        _require(isinstance(raw, Mapping), "event must be an object")
        event = deepcopy(dict(raw))
        _require(_text(event.get("event_id")), "event_id is required")
        event_id = event["event_id"]
        canonical = json.dumps(event, ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False)
        if event_id in seen:
            if seen[event_id] != canonical:
                raise DuplicateEventConflict("event ID reused with different content")
            continue
        _require(event.get("schema") == "meetmind.event.v1", "unsupported event schema")
        _require(type(event.get("sequence")) is int and event["sequence"] == len(ledger) + 1, "sequence must be contiguous")
        kind, actor, subject = event.get("type"), event.get("actor_id"), event.get("subject_id")
        _require(isinstance(kind, str) and kind in EVENT_TYPES, "unsupported event type")
        _require(isinstance(actor, str) and actor in membership, "actor must be a member")
        _require(_text(subject) and _text(event.get("room_id")), "subject_id and room_id are required")
        payload = event.get("payload")
        _require(isinstance(payload, dict), "payload must be an object")
        _require(_ids(event.get("audience")), "audience must be unique IDs")
        audience = set(event["audience"])
        _require(audience <= membership and actor in audience, "audience must contain actor and only members")
        refs = event.get("source_refs")
        _require(_ids(refs, empty=True), "source_refs must be unique event IDs")
        for ref in refs:
            _require(ref in ledger, "source must precede the event")
            source = ledger[ref]
            _require(audience <= set(source["audience"]), "source audience cannot be expanded")
            _require(source["subject_id"] not in revoked, "source was withdrawn")
        if world_id is None:
            _require(kind == "world.created" and subject == event["room_id"], "first event must create the world")
        else:
            _require(event["room_id"] == world_id and kind != "world.created", "one world per stream")

        def create(entity_kind, **fields):
            _require(subject not in entities, "entity already exists")
            item = {
                "id": subject, "kind": entity_kind, "created_by": actor,
                "source_event": event_id, "_audience": audience, "_history": [],
                **fields,
            }
            entities[subject] = item
            return item

        def modify(entity_kind):
            item = entity(subject, entity_kind)
            _require(item["_audience"] == audience, "update must preserve entity audience")
            return item

        def require_ref(ref):
            _require(ref in refs, "event must reference its causal predecessor")

        if kind == "world.created":
            _require(not refs and _text(payload.get("title")), "world needs a title and no sources")
            _require(audience == membership, "world must be visible to all supplied members")
            world_id = subject
            item = create("world", title=payload["title"])
        elif kind == "identity.candidate.observed":
            _require(audience == {actor}, "unconfirmed candidate is private to observer")
            item = create("person", claim="candidate")
        elif kind == "identity.claimed":
            _require(actor == subject and _text(payload.get("display_name")), "only a person can claim their own identity")
            existing = entities.get(subject)
            if existing:
                _require(existing["kind"] == "person" and existing["claim"] == "candidate", "identity is already confirmed or incompatible")
                item = existing
                item.update(claim="confirmed", display_name=payload["display_name"],
                            created_by=actor, source_event=event_id, _audience=audience)
            else:
                item = create("person", claim="confirmed", display_name=payload["display_name"])
        elif kind in {"experience.confirmed", "artifact.observed"}:
            _require(_text(payload.get("title")) and refs, "content needs a title and source")
            if kind == "experience.confirmed":
                participants = payload.get("participant_ids")
                confirmed_people(participants, audience)
                _require(actor in participants, "reporter must be a participant")
                item = create("memory-object", title=payload["title"], reported_by=actor)
                # Only adapter-approved source DTOs are exposed, never arbitrary provider blobs.
                if "source" in payload:
                    source = payload["source"]
                    allowed = {"kind", "provider", "record_id", "occurred_at", "report_kind",
                               "starts_at", "ends_at", "location"}
                    _require(isinstance(source, dict) and set(source) <= allowed,
                             "source must be a minimal DTO")
                    _require(all(_text(value) for value in source.values()), "invalid source fields")
                    _require(source.get("kind") in {"calendar", "checkin"}
                             and source.get("report_kind") == "self_report",
                             "source must identify an explicit report")
                    _require(all(_text(source.get(key)) for key in
                                 ("provider", "record_id", "occurred_at")), "source metadata missing")
                    _require(event.get("occurred_at") == source["occurred_at"],
                             "source time must match event time")
                    item["source"] = deepcopy(source)
                for person_id in participants:
                    edges.append({"from": person_id, "to": subject, "type": "reported-participation",
                                  "reported_by": actor, "source_event": event_id})
            else:
                item = create("artifact", title=payload["title"])
        elif kind == "inference.superseded":
            item = modify("artifact")
            _require(actor == item["created_by"], "only artifact author can correct this example")
            target = item.get("correction_event", item["source_event"])
            _require(payload.get("target_event_id") == target and _text(payload.get("new_title")), "correction must target current version and have a title")
            require_ref(target)
            item.update(title=payload["new_title"], correction_event=event_id)
        elif kind == "experience.revoked":
            item = modify("memory-object")
            _require(actor == item["created_by"], "only reporter can withdraw experience")
            require_ref(item["source_event"])
            revoked.add(subject)
        elif kind in {"visual.recipe.applied", "visual.recipe.removed", "visual.recipe.patched"}:
            item = entity(subject)
            _require(item["kind"] in {"memory-object", "artifact"}, "visual recipe needs an experience or artifact")
            _require(item["_audience"] == audience, "update must preserve entity audience")
            _require(item["created_by"] == actor, "only the reporter may change the representation")
            target = item.get("appearance_event", item.get("correction_event", item["source_event"]))
            require_ref(target)
            if kind == "visual.recipe.patched":
                _require("appearance" in item, "local edit requires an existing recipe")
                _require(_text(payload.get("model")), "recipe model must be identified")
                item["appearance"], item["appearance_changes"] = apply_patch_recipe(item["appearance"], payload.get("patch"))
                item["appearance_model"] = payload["model"]
            elif kind == "visual.recipe.applied":
                item["appearance"] = validate_recipe(payload.get("recipe"))
                _require(_text(payload.get("model")), "recipe model must be identified")
                item["appearance_model"] = payload["model"]
                item.pop("appearance_changes", None)
            else:
                _require("appearance" in item, "no recipe to remove")
                item.pop("appearance")
                item.pop("appearance_model")
                item.pop("appearance_changes", None)
            item["appearance_event"] = event_id
        elif kind == "action.proposed":
            participants = payload.get("participant_ids")
            confirmed_people(participants, audience)
            _require(actor in participants and set(participants) <= audience, "proposer must participate and participants must see action")
            _require(_text(payload.get("title")) and len(payload["title"].strip()) <= 160, "action needs a title of at most 160 characters")
            _require(any(ledger[ref]["type"] in {"experience.confirmed", "artifact.observed"} for ref in refs), "action needs an experience or artifact basis")
            item = create("action", title=payload["title"], participant_ids=participants,
                          decisions={}, outcomes={}, basis_event_ids=refs)
            if "plan" in payload:
                item["plan"] = validate_action_plan(payload["plan"])
        else:
            item = modify("action")
            _require(actor in item["participant_ids"], "only action participants may respond")
            if kind in {"action.accepted", "action.declined"}:
                _require(actor not in item["decisions"], "participant already decided")
                require_ref(item["source_event"])
                item["decisions"][actor] = {"status": kind.split(".")[-1], "event_id": event_id}
            elif kind == "action.outcome.recorded":
                decision = item["decisions"].get(actor)
                _require(decision is not None and decision["status"] == "accepted", "outcome requires own acceptance")
                require_ref(decision["event_id"])
                _require(actor not in item["outcomes"], "withdraw previous report before reporting again")
                _require(payload.get("result") in {"completed", "not_completed"}, "unsupported outcome")
                _require(payload.get("report_kind") == "self_report" and _text(payload.get("note")), "outcome requires explicit self report")
                item["outcomes"][actor] = {
                    "result": payload["result"], "report_kind": "self_report",
                    "note": payload["note"], "event_id": event_id, "reported_by": actor,
                }
            else:
                outcome = item["outcomes"].get(actor)
                _require(outcome is not None and payload.get("target_event_id") == outcome["event_id"], "only own current outcome can be withdrawn")
                require_ref(outcome["event_id"])
                del item["outcomes"][actor]
        item["_history"].append(event_id)
        ledger[event_id] = event
        seen[event_id] = canonical
        latest_event_id = event_id

    def visible_event(event_id):
        event = ledger[event_id]
        return viewer_id in event["audience"] and event["subject_id"] not in revoked

    visible = []
    for item in entities.values():
        if item["id"] in revoked or viewer_id not in item["_audience"]:
            continue
        dto = {key: deepcopy(value) for key, value in item.items() if not key.startswith("_")}
        dto["provenance"] = [
            {"event_id": event_id, "type": ledger[event_id]["type"],
             "sequence": ledger[event_id]["sequence"], "actor_id": ledger[event_id]["actor_id"],
             **({"occurred_at": ledger[event_id]["occurred_at"]}
                if "occurred_at" in ledger[event_id] else {}),
             "source_refs": [ref for ref in ledger[event_id]["source_refs"] if visible_event(ref)]}
            for event_id in item["_history"] if visible_event(event_id)
        ]
        if item["kind"] in {"memory-object", "artifact"}:
            dto["action_candidate_ids"] = [
                person["id"] for person in entities.values()
                if person["kind"] == "person" and person.get("claim") == "confirmed"
                and person["id"] in item["_audience"] and viewer_id in person["_audience"]
            ]
        if item["kind"] == "action":
            basis = item["basis_event_ids"]
            dto["basis_status"] = "active" if all(visible_event(ref) for ref in basis) else "withdrawn"
            dto["basis_event_ids"] = [ref for ref in basis if visible_event(ref)]
        visible.append(dto)
    visible_ids = {item["id"] for item in visible}
    return {
        "schema": "meetmind.world-state.v1", "world_id": world_id,
        "basis": {"through_sequence": len(ledger), "through_event_id": latest_event_id},
        "entities": visible,
        "relationships": [edge for edge in edges if edge["from"] in visible_ids
                          and edge["to"] in visible_ids and visible_event(edge["source_event"])],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--viewer", help="View as a fixture member")
    parser.add_argument("--through", type=int, help="Replay first N events")
    args = parser.parse_args()
    fixture, events = load_fixture()
    if args.through is not None:
        if args.through < 0:
            parser.error("--through must be nonnegative")
        events = events[:args.through]
    state = project_events(events, viewer_id=args.viewer or fixture["viewer_id"], members=fixture["members"])
    print(json.dumps(state, ensure_ascii=False, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
