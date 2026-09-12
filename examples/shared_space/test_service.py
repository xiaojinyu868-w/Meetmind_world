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
