import json
from pathlib import Path
from tempfile import TemporaryDirectory
import threading
import unittest
from urllib.request import Request, urlopen
from urllib.error import HTTPError

from .serve import Lab, ThreadingHTTPServer
from .serve_pair import make_pair_handler
from .pair_access import PairAccessStore
from .session_store import SQLiteSessionStore


class PairHTTPTests(unittest.TestCase):
    def setUp(self):
        self.temp = TemporaryDirectory()
        root = Path(self.temp.name)
        self.lab = Lab(store=SQLiteSessionStore(root / "worlds"))
        self.access = PairAccessStore(root / "access")
        self.server = ThreadingHTTPServer(("127.0.0.1", 0), lambda *args: None)
        self.port = self.server.server_port
        self.server.RequestHandlerClass = make_pair_handler(self.lab, self.access, root, self.port)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.addCleanup(self.cleanup)
        _, self.owner = self.http("/lab-api/sessions", {})
        self.sid = self.owner["session_id"]
        _, invitation = self.http("/lab-api/pair/invite", {}, self.owner["token"])
        _, self.guest = self.http("/lab-api/pair/join", {"invite": invitation["invite"]})

    def cleanup(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join()
        self.temp.cleanup()

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

    def test_identity_is_bound_by_server_for_all_existing_endpoints(self):
        self.assertEqual(self.http("/lab-api/state?session_id=" + self.sid + "&viewer=alice")[0], 403)
        for target in ["/lab-api/state?viewer=alice", "/lab-api/calendar?viewer=alice&action_id=action-1"]:
            self.assertEqual(self.http(target, token=self.guest["token"])[0], 403)
        for endpoint, body in [
            ("/lab-api/sessions", {"session_id": "a" * 32}),
            ("/lab-api/commands", {"viewer": "alice", "command": "action.accepted", "subject_id": "action-1", "expected_sequence": 8}),
            ("/lab-api/proposals", {"viewer": "alice", "subject_id": "artifact-1", "instruction": "伪造"}),
            ("/lab-api/commands", {"command": "reset", "through": 8, "expected_sequence": 8}),
            ("/lab-api/pair/invite", {}), ("/lab-api/pair/revoke", {}),
        ]:
            self.assertEqual(self.http(endpoint, body, self.guest["token"])[0], 403)
        self.assertEqual(self.lab.state(self.sid, "alice")["basis"]["through_sequence"], 8)

    def test_two_clients_independent_choices_and_private_import(self):
        _, first = self.http("/lab-api/commands", {"command": "action.accepted", "subject_id": "action-1",
                                                "expected_sequence": 8}, self.owner["token"])
        self.assertEqual(first["basis"]["through_sequence"], 9)
        _, other = self.http("/lab-api/state", token=self.guest["token"])
        action = next(i for i in other["entities"] if i["id"] == "action-1")
        self.assertEqual(action["decisions"]["alice"]["status"], "accepted")
        self.assertNotIn("bo", action["decisions"])
        _, declined = self.http("/lab-api/commands", {"command": "action.declined", "subject_id": "action-1",
                                                    "expected_sequence": 9}, self.guest["token"])
        self.assertEqual(declined["basis"]["through_sequence"], 10)
        code, private = self.http("/lab-api/commands", {"command": "checkin.import", "expected_sequence": 10,
            "visibility": "private", "record": {"event_id": "private", "provider": "fixture", "location": "PRIVATE",
            "occurred_at": "2026-09-12T10:00:00Z", "confirmed": True}}, self.owner["token"])
        self.assertEqual(code, 200)
        self.assertIn("PRIVATE", json.dumps(private))
        _, other = self.http("/lab-api/state", token=self.guest["token"])
        self.assertNotIn("PRIVATE", json.dumps(other))

    def test_revoke_denies_further_access_without_erasing_history(self):
        _, before = self.http("/lab-api/state", token=self.owner["token"])
        self.assertEqual(self.http("/lab-api/pair/revoke", {}, self.owner["token"])[0], 200)
        self.assertEqual(self.http("/lab-api/state", token=self.guest["token"])[0], 403)
        self.assertEqual(self.http("/lab-api/commands", {"command": "action.accepted", "subject_id": "action-1",
            "expected_sequence": 8}, self.guest["token"])[0], 403)
        _, after = self.http("/lab-api/state", token=self.owner["token"])
        self.assertEqual(after, before)


if __name__ == "__main__":
    unittest.main()
