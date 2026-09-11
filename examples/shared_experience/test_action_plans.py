from copy import deepcopy
from datetime import datetime, timezone, timedelta
import re
import unittest

from .action_plans import validate_action_plan, action_calendar


def plan():
    return {
        "scheduled_at": "2026-09-13T19:30:00+08:00", "duration_minutes": 90,
        "location": "深圳湾公园", "success_criteria": "走完一公里后，各自记录是否愿意下次再约",
    }


def action():
    return {
        "id": "private-action-id", "kind": "action", "title": "一起走一公里",
        "plan": plan(), "decisions": {"alice": {"status": "accepted"}, "bo": {"status": "declined"}},
        "outcomes": {"bo": {"report_kind": "self_report", "result": "completed", "note": "PRIVATE_OTHER_NOTE"}},
    }


STAMP = datetime(2026, 9, 12, 20, 0, tzinfo=timezone(timedelta(hours=8)))


def unfolded(calendar):
    return re.sub(r"\r\n[ \t]", "", calendar)


def properties(calendar):
    return dict(line.split(":", 1) for line in unfolded(calendar).split("\r\n") if ":" in line)


class ActionPlanTests(unittest.TestCase):
    def test_validated_copy_normalizes_timezone_and_accepts_minute_precision(self):
        original = plan()
        normalized = validate_action_plan(original)
        self.assertEqual(normalized["scheduled_at"], "2026-09-13T11:30:00Z")
        self.assertEqual(original, plan())
        normalized["location"] = "changed"
        self.assertEqual(original["location"], "深圳湾公园")
        self.assertEqual(validate_action_plan({**original, "scheduled_at": "2026-09-13T00:30-04:00"})["scheduled_at"],
                         "2026-09-13T04:30:00Z")
        self.assertEqual(validate_action_plan({**original, "scheduled_at": "2026-09-13T11:30:00.125Z"})["scheduled_at"],
                         "2026-09-13T11:30:00.125000Z")

    def test_rejects_ambiguous_dates_missing_or_extra_fields_and_invalid_text(self):
        values = [None, [], {}, {**plan(), "attendees": ["bo"]}]
        values.extend({key: value for key, value in plan().items() if key != missing} for missing in plan())
        values.extend({**plan(), "scheduled_at": date} for date in [
            "2026-09-13", "2026-09-13T11:30:00", "2026-02-30T12:00:00Z",
            "2026-09-13 11:30:00Z", "2026-09-13T11:30:00+24:00", "2026-09-13T11:30:00Z\r\nATTENDEE:x",
            "0001-01-01T00:00:00+08:00", "9999-12-31T23:59:00Z",
        ])
        for field, limit in (("location", 160), ("success_criteria", 500)):
            values.extend({**plan(), field: item} for item in [None, "", " \t\n", "中" * (limit + 1), "x\x00", "x\ud800"])
        for value in values:
            with self.subTest(value=repr(value)), self.assertRaises(ValueError):
                validate_action_plan(value)

    def test_duration_is_bounded_integer_not_boolean(self):
        for value in [True, False, "5", 5.0, None, 4, 1441, float("inf")]:
            with self.subTest(value=value), self.assertRaises(ValueError):
                validate_action_plan({**plan(), "duration_minutes": value})
        for value in [5, 1440]:
            self.assertEqual(validate_action_plan({**plan(), "duration_minutes": value})["duration_minutes"], value)

    def test_export_uses_utc_times_stable_private_uid_and_does_not_mutate(self):
        value = action()
        before = deepcopy(value)
        calendar = action_calendar(value, "alice", now=STAMP)
        props = properties(calendar)
        self.assertEqual(props["DTSTAMP"], "20260912T120000Z")
        self.assertEqual(props["DTSTART"], "20260913T113000Z")
        self.assertEqual(props["DTEND"], "20260913T130000Z")
        self.assertEqual(value, before)
        self.assertRegex(props["UID"], r"^[0-9a-f]{64}@meetmind\.local$")
        self.assertNotIn("private-action-id", calendar)
        self.assertNotIn("alice", calendar)
        self.assertEqual(props["UID"], properties(action_calendar(
            {**value, "title": "更新标题"}, "alice", now=STAMP + timedelta(days=1)))["UID"])
        other = deepcopy(value)
        other["decisions"]["bo"]["status"] = "accepted"
        self.assertNotEqual(props["UID"], properties(action_calendar(other, "bo", now=STAMP))["UID"])
        self.assertNotIn("PRIVATE_OTHER_NOTE", calendar)

    def test_export_requires_viewers_own_acceptance_not_others(self):
        for viewer in ["bo", "observer", "", None]:
            with self.subTest(viewer=viewer), self.assertRaises(ValueError):
                action_calendar(action(), viewer, now=STAMP)
        for change in [{"kind": "experience"}, {"decisions": None}, {"plan": None},
                       {"title": "x" * 161}, {"id": ""}, {"decisions": {"alice": "accepted"}}]:
            with self.subTest(change=change), self.assertRaises(ValueError):
                action_calendar({**action(), **change}, "alice", now=STAMP)
        for stamp in [datetime(2026, 9, 12), "2026-09-12T00:00Z"]:
            with self.subTest(stamp=stamp), self.assertRaises(ValueError):
                action_calendar(action(), "alice", now=stamp)

    def test_only_personal_report_status_is_included_never_attendance_claim(self):
        value = action()
        self.assertIn("本人反馈：尚未反馈", unfolded(action_calendar(value, "alice", now=STAMP)))
        value["outcomes"]["alice"] = {
            "report_kind": "self_report", "result": "completed", "note": "PRIVATE_SELF_NOTE",
        }
        text = unfolded(action_calendar(value, "alice", now=STAMP))
        self.assertIn("已完成（本人自述）", text)
        self.assertIn("未经独立核验", text)
        self.assertNotIn("PRIVATE_SELF_NOTE", text)
        value["outcomes"]["alice"]["report_kind"] = "inferred"
        self.assertIn("本人反馈：尚未反馈", unfolded(action_calendar(value, "alice", now=STAMP)))

    def test_calendar_text_escaping_blocks_property_and_component_injection(self):
        value = action()
        value["title"] = "同行\\朋友,再约;一起\r\nATTENDEE:evil@example.com"
        value["plan"]["location"] = "公园\rBEGIN:VALARM\nACTION:EMAIL"
        value["plan"]["success_criteria"] = "完成\r\nEND:VEVENT\nBEGIN:VEVENT"
        calendar = action_calendar(value, "alice", now=STAMP)
        text = unfolded(calendar)
        self.assertIn("SUMMARY:同行\\\\朋友\\,再约\\;一起\\nATTENDEE:evil@example.com\r\n", text)
        lines = text.split("\r\n")
        self.assertEqual(lines.count("BEGIN:VEVENT"), 1)
        self.assertEqual(lines.count("END:VEVENT"), 1)
        self.assertFalse(any(line.startswith(("ATTENDEE:", "ORGANIZER:", "METHOD:", "BEGIN:VALARM", "ACTION:")) for line in lines))

    def test_utf8_folding_is_lossless_and_counts_continuation_space(self):
        value = action()
        value["title"] = "一起😊散步" * 25
        value["plan"]["location"] = "深圳湾海边散步🌊" * 15
        value["plan"]["success_criteria"] = "一起走一公里😊，再决定下一步；" * 25
        calendar = action_calendar(value, "alice", now=STAMP)
        self.assertTrue(calendar.endswith("\r\n"))
        self.assertNotIn("\n", calendar.replace("\r\n", ""))
        physical = calendar.split("\r\n")[:-1]
        self.assertTrue(any(line.startswith(" ") for line in physical))
        for line in physical:
            self.assertLessEqual(len(line.encode("utf-8")), 75)
            self.assertEqual(line.encode("utf-8").decode("utf-8"), line)
        self.assertEqual(properties(calendar)["SUMMARY"], value["title"])
        self.assertEqual(properties(calendar)["LOCATION"], value["plan"]["location"])


if __name__ == "__main__":
    unittest.main()
