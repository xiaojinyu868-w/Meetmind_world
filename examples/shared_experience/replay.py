"""Legacy example entry point; the event engine lives in the installable core."""
from __future__ import annotations
import argparse
import json
from pathlib import Path
from packages.meetmind_core.meetmind_core.replay import (
    DuplicateEventConflict, EVENT_TYPES, project_events, _require, _ids,
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
