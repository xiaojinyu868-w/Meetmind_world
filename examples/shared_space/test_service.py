import json
from pathlib import Path
from tempfile import TemporaryDirectory
import threading
import unittest
from urllib.request import Request, urlopen
from urllib.error import HTTPError

from .serve import SpaceService, Conflict, make_space_handler, ThreadingHTTPServer
from examples.shared_experience.session_store import SQLiteSessionStore
from examples.shared_experience.pair_access import PairAccessStore


class SpaceIntegrationTests(unittest.TestCase):
    def setUp(self):
        self.temp = TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.service = SpaceService(SQLiteSessionStore(self.root / "worlds"))
        self.access = PairAccessStore(self.root / "access")
        self.server = ThreadingHTTPServer(("127.0.0.1", 0), lambda *args: None)
        self.port = self.server.server_port
        self.server.RequestHandlerClass = make_space_handler(self.service, self.access, self.root, self.port)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.addCleanup(self.close)
        code, self.owner = self.http("/space-api/sessions", {})
        self.assertEqual(code, 201)
        self.sid = self.owner["session_id"]
        _, invitation = self.http("/space-api/invite", {}, self.owner["token"])
        code, self.guest = self.http("/space-api/join", {"invite": invitation["invite"]})
        self.assertEqual(code, 200)

    def close(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join()

    def http(self, path, body=None, token=None):
        request = Request("http://127.0.0.1:" + str(self.port) + path,
                          data=json.dumps(body).encode() if body is not None else None,
                          headers={**({"Content-Type": "application/json"} if body is not None else {}),
                                   **({"Authorization": "Bearer " + token} if token else {})})
        try:
            with urlopen(request, timeout=5) as response:
                return response.status, json.load(response)
        except HTTPError as error:
            return error.code, json.load(error)

    def command(self, sequence, command, rid="test-command-1", guest=False):
        return self.http("/space-api/command",
                         {"expected_sequence": sequence, "request_id": rid, "command": command},
                         (self.guest if guest else self.owner)["token"])

    def test_persistent_replay_and_export_match_independent_choices(self):
        code, result = self.command(0, {"type": "decision.set", "status": "measure", "note": "先量一下"})
        self.assertEqual(code, 200)
        code, other = self.command(1, {"type": "decision.set", "status": "defer", "note": "周末再看"}, guest=True)
        self.assertEqual(code, 200)
        reopened = SpaceService(SQLiteSessionStore(self.root / "worlds"))
        self.assertEqual(reopened.state(self.sid), other["state"])
        reopened_access = PairAccessStore(self.root / "access")
        self.assertEqual(reopened_access.resolve(self.guest["token"])["session_id"], self.sid)
        self.server.RequestHandlerClass = make_space_handler(reopened, reopened_access, self.root, self.port)
        code, document = self.http("/space-api/export", token=self.guest["token"])
        self.assertEqual(code, 200)
        self.assertIn("先量一下", document["text"])
        self.assertIn("周末再看", document["text"])
        self.assertIn("尚无当前共同认可", document["text"])
        self.assertEqual(document["revision"], 1)

    def test_retry_idempotency_and_stale_write_leave_world_unchanged(self):
        command = {"type": "requirement.set", "requirement_id": "work", "enabled": True}
        code, first = self.command(0, command)
        self.assertEqual(code, 200)
        code, retry = self.command(0, command)
        self.assertEqual(code, 200)
        self.assertEqual(retry["state"], first["state"])
        code, _ = self.command(0, {"type": "layout.preset", "preset": "B"}, rid="stale-request-1")
        self.assertEqual(code, 409)
        code, _ = self.command(1, {"type": "layout.preset", "preset": "B"})
        self.assertEqual(code, 400)
        self.assertEqual(self.service.state(self.sid), first["state"])

    def test_role_bound_commands_revoke_and_old_endpoint_isolation(self):
        self.assertEqual(self.http("/space-api/state")[0], 403)
        self.assertEqual(self.http("/lab-api/state", token=self.owner["token"])[0], 404)
        code, _ = self.command(0, {"type": "requirement.set", "requirement_id": "work", "enabled": True}, guest=True)
        self.assertEqual(code, 400)
        self.assertEqual(self.http("/space-api/invite", {}, self.guest["token"])[0], 400)
        self.assertEqual(self.http("/space-api/revoke", {}, self.owner["token"])[0], 200)
        self.assertEqual(self.http("/space-api/state", token=self.guest["token"])[0], 403)
        self.assertEqual(self.service.state(self.sid)["sequence"], 0)

    def test_measurement_http_preview_and_source_withdrawal(self):
        code, _ = self.command(0, {"type": "action.add", "text": "测量沙发"}, rid="measure-add-1")
        self.assertEqual(code, 200)
        code, _ = self.command(1, {"type": "action.report", "action_id": "action-1", "status": "done"},
                               rid="measure-report-1")
        self.assertEqual(code, 200)
        record = {"type": "measurement.record", "action_id": "action-1", "object_id": "sofa",
                  "width": 2.3, "depth": .9, "height": .9, "source": "卷尺", "measured_on": "2026-09-12"}
        code, _ = self.command(2, record, rid="measure-forged-1", guest=True)
        self.assertEqual(code, 400)
        code, recorded = self.command(2, record, rid="measure-record-1")
        self.assertEqual(code, 200)
        body = {"measurement_id": "measurement-3", "expected_sequence": 3}
        self.assertEqual(self.http("/space-api/measurement/preview", body)[0], 403)
        code, preview = self.http("/space-api/measurement/preview", body, self.guest["token"])
        self.assertEqual(code, 200)
        self.assertEqual(preview["preview"]["objects"][1]["width"], 2.3)
        self.assertEqual(self.service.state(self.sid), recorded["state"])
        code, _ = self.http("/space-api/measurement/preview", {**body, "expected_sequence": 2}, self.owner["token"])
        self.assertEqual(code, 409)
        code, applied = self.command(3, {"type": "measurement.apply", "measurement_id": "measurement-3",
                                       "basis_revision": 1}, rid="measure-apply-1", guest=True)
        self.assertEqual(code, 200)
        self.assertEqual(applied["state"]["revision"], 2)
        self.assertEqual(self.http("/space-api/measurement/preview", {**body, "expected_sequence": 4},
                                   self.guest["token"])[0], 400)
        code, _ = self.command(4, {"type": "measurement.withdraw", "measurement_id": "measurement-3"},
                               rid="measure-withdraw-forged", guest=True)
        self.assertEqual(code, 400)
        code, withdrawn = self.command(4, {"type": "measurement.withdraw", "measurement_id": "measurement-3"},
                                       rid="measure-withdraw")
        self.assertEqual(code, 200)
        self.assertIn("measurement-stale:sofa", [v["id"] for v in withdrawn["state"]["violations"]])
        self.assertEqual(SpaceService(SQLiteSessionStore(self.root / "worlds")).state(self.sid), withdrawn["state"])
        code, document = self.http("/space-api/export", token=self.owner["token"])
        self.assertEqual(code, 200)
        self.assertIn("依据已失效", document["text"])

    def test_personal_context_http_owner_and_version_boundaries(self):
        code, created = self.command(0, {"type": "memory.add", "text": "一起练习",
            "occurred_on": "2026-09-12", "source_note": "本人录入"}, rid="context-add-memory")
        self.assertEqual(code, 200)
        self.assertEqual(created["state"]["memories"][-1]["owner"], "alice")
        code, req = self.command(1, {"type": "requirement.add", "label": "我想留活动区",
            "source_id": "memory-1", "source_version": 1, "basis_revision": 1,
            "zone": {"x": 4.8, "z": 2, "width": 1, "depth": 1}}, rid="context-add-req", guest=True)
        self.assertEqual(code, 200)
        self.assertEqual(req["state"]["requirements"][-1]["owner"], "bo")
        code, _ = self.command(2, {"type": "requirement.update", "requirement_id": "requirement-2",
            "label": "替人修改", "source_id": None, "source_version": 0, "basis_revision": 2,
            "zone": {"x": 4, "z": 2, "width": 1, "depth": 1}}, rid="context-forge")
        self.assertEqual(code, 400)
        code, _ = self.command(2, {"type": "memory.edit", "memory_id": "memory-1",
            "basis_version": 1, "text": "替人纠正"}, rid="context-forge-mem", guest=True)
        self.assertEqual(code, 400)
        code, edited = self.command(2, {"type": "memory.edit", "memory_id": "memory-1",
            "basis_version": 1, "text": "还没一起练习"}, rid="context-edit-memory")
        self.assertEqual(code, 200)
        self.assertTrue(edited["state"]["requirements"][-1]["review_needed"])
        code, _ = self.command(3, {"type": "requirement.set", "requirement_id": "requirement-2",
            "enabled": True, "source_version": 1}, rid="context-stale-confirm", guest=True)
        self.assertEqual(code, 400)
        self.assertEqual(self.service.state(self.sid), edited["state"])
        reopened = SpaceService(SQLiteSessionStore(self.root / "worlds"))
        self.assertEqual(reopened.state(self.sid), edited["state"])
        code, doc = self.http("/space-api/export", token=self.guest["token"])
        self.assertEqual(code, 200)
        self.assertIn("参与者录入，未经独立核验", doc["text"])
        self.assertIn("需要本人重新核对", doc["text"])

    def test_failed_store_write_does_not_publish_new_state(self):
        before = self.service.state(self.sid)
        original = self.service.store.save
        def fail(*args):
            raise ValueError("injected write failure")
        self.service.store.save = fail
        try:
            code, _ = self.command(0, {"type": "layout.preset", "preset": "B"})
            self.assertEqual(code, 400)
        finally:
            self.service.store.save = original
        self.assertEqual(self.service.state(self.sid), before)


if __name__ == "__main__":
    unittest.main()
