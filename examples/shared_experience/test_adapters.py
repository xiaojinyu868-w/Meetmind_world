"""Tests for source adapters; no network or provider SDK required."""
import unittest
from .adapters import calendar_event_to_envelope, checkin_to_envelope

class AdapterTests(unittest.TestCase):
    def test_calendar_keeps_provider_context_and_stable_subject(self):
        event = calendar_event_to_envelope({
            "event_id": "cal-1", "title": "开放协作日", "provider": "local-calendar",
            "starts_at": "2026-09-12T13:00:00+08:00", "ends_at": "2026-09-12T18:00:00+08:00",
            "participant_ids": ["alice", "bo"],
        }, sequence=2, room_id="world", actor_id="alice", audience=["alice", "bo"],
           source_ref="obs:calendar:1")
        self.assertEqual(event["subject_id"], "experience:cal-1")
        self.assertEqual(event["payload"]["provider"], "local-calendar")
        self.assertEqual(event["source_refs"], ["obs:calendar:1"])

    def test_checkin_reports_only_actor(self):
        event = checkin_to_envelope({"event_id": "check-1", "location": "杭州", "occurred_at": "2026-09-12T10:00:00+08:00"},
                                    sequence=3, room_id="world", actor_id="alice", audience=["alice"], source_ref="obs:checkin:1")
        self.assertEqual(event["payload"]["participant_ids"], ["alice"])
        self.assertEqual(event["audience"], ["alice"])

    def test_invalid_provider_dto_fails_without_guessing(self):
        with self.assertRaises(ValueError):
            calendar_event_to_envelope({"event_id":"x", "title":"x", "provider":"x",
              "starts_at":"2026-09-12T13:00:00+08:00","ends_at":"2026-09-12T12:00:00+08:00",
              "participant_ids":["alice"]}, sequence=1, room_id="w", actor_id="alice", audience=["alice"])
        with self.assertRaises(ValueError):
            checkin_to_envelope({"event_id":"x","location":"x","occurred_at":"bad"},
                                sequence=1, room_id="w", actor_id="alice", audience=["alice"])

    def test_adapter_does_not_invent_source_or_participant_consent(self):
        event = calendar_event_to_envelope({"event_id":"x", "title":"x", "provider":"x",
            "starts_at":"2026-09-12T13:00:00+08:00","ends_at":"2026-09-12T14:00:00+08:00",
            "participant_ids":["alice","bo"]}, sequence=1, room_id="w", actor_id="alice", audience=["alice","bo"], source_ref="obs:calendar:x")
        self.assertEqual(event["source_refs"], ["obs:calendar:x"])
        self.assertEqual(event["payload"]["participant_ids"], ["alice","bo"])
        with self.assertRaises(ValueError):
            calendar_event_to_envelope({"event_id":"no-source", "title":"x", "provider":"x",
            "starts_at":"2026-09-12T13:00:00+08:00","ends_at":"2026-09-12T14:00:00+08:00",
            "participant_ids":["alice"]}, sequence=1, room_id="w", actor_id="alice", audience=["alice"])

if __name__ == "__main__":
    unittest.main()
