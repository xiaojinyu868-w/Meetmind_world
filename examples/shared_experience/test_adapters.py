"""Source adapter and replay integration tests; no provider SDK or network."""
from copy import deepcopy
import unittest

from .adapters import calendar_event_to_envelope, checkin_to_envelope
from .replay import load_fixture, project_events


class AdapterTests(unittest.TestCase):
    def setUp(self):
        self.calendar = {
            "event_id": "cal-1", "title": "开放协作日", "provider": "local-calendar",
            "starts_at": "2026-09-12T13:00:00+08:00",
            "ends_at": "2026-09-12T18:00:00+08:00",
            "participant_ids": ["alice", "bo"], "attendance_confirmed": True,
        }
        self.checkin = {
            "event_id": "check-1", "location": "杭州",
            "occurred_at": "2026-09-12T10:00:00+08:00", "confirmed": True,
        }
        self.options = {
            "sequence": 5, "room_id": "shared-demo", "actor_id": "alice",
            "audience": ["alice", "bo"], "source_ref": "evt-01",
        }

    def test_calendar_retains_minimal_source_and_normalizes_interval(self):
        event = calendar_event_to_envelope(self.calendar, **self.options)
        self.assertEqual(event["payload"]["source"], {
            "kind": "calendar", "provider": "local-calendar", "record_id": "cal-1",
            "occurred_at": "2026-09-12T10:00:00Z", "report_kind": "self_report",
            "starts_at": "2026-09-12T05:00:00Z", "ends_at": "2026-09-12T10:00:00Z",
        })
        self.assertEqual(event["occurred_at"], event["payload"]["source"]["ends_at"])
        self.assertEqual(event["source_refs"], ["evt-01"])

    def test_checkin_reports_only_actor_and_retains_source(self):
        dto = dict(self.checkin, participant_ids=["alice", "bo"], secret="not exported")
        event = checkin_to_envelope(dto, **self.options)
        self.assertEqual(event["payload"]["participant_ids"], ["alice"])
        self.assertEqual(event["payload"]["source"], {
            "kind": "checkin", "provider": "explicit", "record_id": "check-1",
            "occurred_at": "2026-09-12T02:00:00Z", "report_kind": "self_report",
            "location": "杭州",
        })
        self.assertNotIn("secret", event["payload"])

    def test_provider_actor_and_type_namespace_imports_independently(self):
        fixture, events = load_fixture()
        imports = []
        for adapter, dto, actor in (
            (calendar_event_to_envelope, dict(self.calendar, event_id="same"), "alice"),
            (calendar_event_to_envelope, dict(self.calendar, event_id="same", provider="other"), "alice"),
            (calendar_event_to_envelope, dict(self.calendar, event_id="same"), "bo"),
            (checkin_to_envelope, dict(self.checkin, event_id="same", provider="local-calendar"), "alice"),
            (checkin_to_envelope, dict(self.checkin, event_id="same", provider="other"), "alice"),
            (checkin_to_envelope, dict(self.checkin, event_id="same", provider="local-calendar"), "bo"),
        ):
            imports.append(adapter(dto, **dict(self.options, sequence=5 + len(imports), actor_id=actor)))
        self.assertEqual(len({event["event_id"] for event in imports}), len(imports))
        self.assertEqual(len({event["subject_id"] for event in imports}), len(imports))
        state = project_events([*events[:4], *imports], viewer_id="alice", members=fixture["members"])
        self.assertEqual(len([item for item in state["entities"] if item["kind"] == "memory-object"]), len(imports))

    def test_encoded_components_and_cross_type_record_prefix_do_not_collide(self):
        first = checkin_to_envelope(dict(self.checkin, provider="a:b", event_id="c"), **self.options)
        second = checkin_to_envelope(dict(self.checkin, provider="a", event_id="c"),
                                     **dict(self.options, actor_id="b:alice", audience=["b:alice"]))
        self.assertNotEqual(first["event_id"], second["event_id"])
        first = calendar_event_to_envelope(dict(self.calendar, event_id="checkin:one"), **self.options)
        second = checkin_to_envelope(dict(self.checkin, event_id="one"), **self.options)
        self.assertNotEqual(first["subject_id"], second["subject_id"])

    def test_same_source_identity_is_stable_across_sequences_and_equivalent_timezones(self):
        first = calendar_event_to_envelope(self.calendar, **self.options)
        second = calendar_event_to_envelope(dict(
            self.calendar, starts_at="2026-09-12T05:00:00Z", ends_at="2026-09-12T10:00:00+00:00",
        ), **dict(self.options, sequence=20))
        self.assertEqual(first["event_id"], second["event_id"])
        self.assertEqual(first["subject_id"], second["subject_id"])
        self.assertEqual(first["payload"], second["payload"])

    def test_timestamp_requires_explicit_time_and_timezone(self):
        for timestamp in ("2026-09-12", "2026-09-12T10:00:00", "bad",
                          "2026-09-12 10:00:00+08:00", "2026-02-30T10:00:00Z",
                          "2026-09-12T10:00:00+24:00", "2026-09-12T10:00:00+08:99",
                          "2026-09-12T10:00:00+00:60", None, [], 123):
            with self.subTest(timestamp=timestamp), self.assertRaises(ValueError):
                checkin_to_envelope(dict(self.checkin, occurred_at=timestamp), **self.options)
        with self.assertRaises(ValueError):
            calendar_event_to_envelope(dict(self.calendar, starts_at="2026-09-12T10:00:00"), **self.options)

    def test_interval_comparison_uses_instants_and_rejects_reversal(self):
        event = calendar_event_to_envelope(dict(
            self.calendar, starts_at="2026-09-12T13:00:00+08:00", ends_at="2026-09-12T06:00:00Z",
        ), **self.options)
        self.assertEqual(event["occurred_at"], "2026-09-12T06:00:00Z")
        with self.assertRaises(ValueError):
            calendar_event_to_envelope(dict(self.calendar, ends_at="2026-09-12T04:59:59Z"), **self.options)

    def test_explicit_boolean_confirmation_is_required(self):
        for adapter, dto, key in (
            (calendar_event_to_envelope, self.calendar, "attendance_confirmed"),
            (checkin_to_envelope, self.checkin, "confirmed"),
        ):
            for value in (None, False, 1, "true", [], {}):
                with self.subTest(adapter=adapter.__name__, value=value), self.assertRaises(ValueError):
                    adapter(dict(dto, **{key: value}), **self.options)
            without_confirmation = dict(dto)
            del without_confirmation[key]
            with self.assertRaises(ValueError):
                adapter(without_confirmation, **self.options)

    def test_actor_must_match_dto_and_calendar_participants(self):
        for adapter, dto in ((calendar_event_to_envelope, self.calendar), (checkin_to_envelope, self.checkin)):
            with self.subTest(adapter=adapter.__name__), self.assertRaises(ValueError):
                adapter(dict(dto, actor_id="bo"), **self.options)
        with self.assertRaises(ValueError):
            calendar_event_to_envelope(dict(self.calendar, participant_ids=["bo"]), **self.options)
        with self.assertRaises(ValueError):
            checkin_to_envelope(self.checkin, **dict(self.options, audience=["bo"]))

    def test_source_is_a_required_keyword_and_nonempty_id(self):
        for adapter, dto in ((calendar_event_to_envelope, self.calendar), (checkin_to_envelope, self.checkin)):
            without_source = dict(self.options)
            del without_source["source_ref"]
            with self.subTest(adapter=adapter.__name__), self.assertRaises(TypeError):
                adapter(dto, **without_source)
            for source_ref in (None, "", " ", [], {}):
                with self.subTest(source_ref=source_ref), self.assertRaises(ValueError):
                    adapter(dto, **dict(self.options, source_ref=source_ref))

    def test_bad_list_values_raise_validation_errors(self):
        for ids in (None, [], ["alice", "alice"], ["alice", []], ["alice", {}], ["alice", 1], "alice"):
            with self.subTest(ids=ids), self.assertRaises(ValueError):
                calendar_event_to_envelope(dict(self.calendar, participant_ids=ids), **self.options)
            with self.subTest(audience=ids), self.assertRaises(ValueError):
                checkin_to_envelope(self.checkin, **dict(self.options, audience=ids))

    def test_invalid_scalar_metadata_is_rejected(self):
        for adapter, dto, keys in (
            (calendar_event_to_envelope, self.calendar, ("event_id", "title", "provider")),
            (checkin_to_envelope, self.checkin, ("event_id", "location", "provider")),
        ):
            for key in keys:
                for value in (None, "", " ", [], {}):
                    with self.subTest(adapter=adapter.__name__, key=key, value=value), self.assertRaises(ValueError):
                        adapter(dict(dto, **{key: value}), **self.options)
            with self.assertRaises(ValueError):
                adapter([], **self.options)
        for key, value in (("actor_id", []), ("room_id", None), ("sequence", True), ("sequence", 0)):
            with self.subTest(key=key, value=value), self.assertRaises(ValueError):
                checkin_to_envelope(self.checkin, **dict(self.options, **{key: value}))

    def test_input_and_output_do_not_share_mutable_lists(self):
        original_dto, original_options = deepcopy(self.calendar), deepcopy(self.options)
        event = calendar_event_to_envelope(self.calendar, **self.options)
        self.assertEqual(self.calendar, original_dto)
        self.assertEqual(self.options, original_options)
        self.calendar["participant_ids"].append("later")
        self.options["audience"].append("later")
        self.assertEqual(event["payload"]["participant_ids"], ["alice", "bo"])
        self.assertEqual(event["audience"], ["alice", "bo"])
        event["payload"]["participant_ids"].append("output-only")
        self.assertNotIn("output-only", self.calendar["participant_ids"])

    def test_replay_preserves_source_metadata_and_event_time(self):
        fixture, events = load_fixture()
        for adapter, dto in ((calendar_event_to_envelope, self.calendar), (checkin_to_envelope, self.checkin)):
            event = adapter(dto, **self.options)
            state = project_events([*events[:4], event], viewer_id="alice", members=fixture["members"])
            item = next(item for item in state["entities"] if item["id"] == event["subject_id"])
            with self.subTest(adapter=adapter.__name__):
                self.assertEqual(item["source"], event["payload"]["source"])
                self.assertEqual(item["provenance"][-1]["occurred_at"], event["occurred_at"])

    def test_checkin_time_change_remains_visible_in_replay(self):
        fixture, events = load_fixture()
        first = checkin_to_envelope(self.checkin, **self.options)
        second = checkin_to_envelope(dict(self.checkin, occurred_at="2030-01-01T00:00:00Z"), **self.options)
        first_state = project_events([*events[:4], first], viewer_id="alice", members=fixture["members"])
        second_state = project_events([*events[:4], second], viewer_id="alice", members=fixture["members"])
        self.assertNotEqual(first_state, second_state)


if __name__ == "__main__":
    unittest.main()
