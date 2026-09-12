from copy import deepcopy
import json
from pathlib import Path
from tempfile import TemporaryDirectory
import threading
import unittest
from .serve import SpaceService, Conflict
from .proposals import demo_proposal
from .domain import initial_state
from examples.shared_experience.session_store import SQLiteSessionStore


class ProposalServiceTests(unittest.TestCase):
    def setUp(self):
        self.temp=TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.store=SQLiteSessionStore(Path(self.temp.name)/"worlds")
        self.service=SpaceService(self.store)
        self.sid=self.service.create()

    def propose(self, mode="demo"):
        state=self.service.state(self.sid)
        return self.service.propose(self.sid,"alice",{"mode":mode,"instruction":"为双方留出空间","expected_sequence":state["sequence"]})

    def apply(self,p,rid="apply-once-1"):
        return self.service.apply_proposal(self.sid,"alice",{"proposal_id":p["id"],"expected_sequence":self.service.state(self.sid)["sequence"],"request_id":rid})

    def test_preview_read_only_apply_atomic_and_durable(self):
        before=self.service.state(self.sid)
        p=self.propose()
        self.assertEqual(self.service.state(self.sid),before)
        self.assertEqual(p["provenance"]["kind"],"manual-demo")
        self.assertEqual(p["preview"]["revision"],before["revision"])
        after=self.apply(p)
        self.assertEqual(after["revision"],before["revision"]+1)
        self.assertEqual(after["sequence"],before["sequence"]+1)
        self.assertEqual(after["decisions"],{})
        self.assertIn("人工",after["history"][-1]["summary"])
        self.assertEqual(self.apply(p),after)
        reopened=SpaceService(SQLiteSessionStore(Path(self.temp.name)/"worlds"))
        self.assertEqual(reopened.state(self.sid),after)

    def test_model_unavailable_and_failure_have_no_mock_substitution(self):
        before=self.service.state(self.sid)
        with self.assertRaisesRegex(ValueError,"未启用模型"):self.propose("model")
        def failed(messages): raise ValueError("Arrearage")
        self.service.generator=failed
        with self.assertRaisesRegex(ValueError,"Arrearage"):self.propose("model")
        self.assertEqual(self.service.state(self.sid),before)
        self.assertEqual(self.service.proposals,{})
        self.assertEqual(self.service.generating,set())

    def test_generated_proposal_records_source_without_assuming_real_api(self):
        calls=[]
        def fake(messages):
            calls.append(messages)
            return {"text":demo_proposal(initial_state()),"model":"synthetic-provider-fixture","latency_ms":7}
        self.service.generator=fake
        p=self.propose("model")
        self.assertEqual(len(calls),1)
        self.assertEqual(p["provenance"]["model"],"synthetic-provider-fixture")
        self.assertNotIn("memories",json.loads(calls[0][1]["content"]))
        self.apply(p)
        self.assertIn("synthetic-provider-fixture",self.service.state(self.sid)["history"][-1]["summary"])

    def test_stale_proposal_and_forged_application_rejected(self):
        p=self.propose()
        self.service.command(self.sid,"alice",{"expected_sequence":0,"request_id":"change-needs-1","command":{"type":"requirement.set","requirement_id":"work","enabled":True}})
        before=self.service.state(self.sid)
        with self.assertRaises(ValueError):self.apply(p)
        self.assertEqual(self.service.state(self.sid),before)
        with self.assertRaises(ValueError):
            self.service.apply_proposal(self.sid,"bo",{"proposal_id":p["id"],"expected_sequence":1,"request_id":"wrong-actor-1"})
        with self.assertRaisesRegex(ValueError,"服务端"):
            self.service.command(self.sid,"alice",{"expected_sequence":1,"request_id":"forged-patch-1","command":{"type":"layout.patch"}})

    def test_generation_does_not_block_other_writes_and_rejects_stale_result(self):
        entered,release=threading.Event(),threading.Event()
        def delayed(messages):
            entered.set()
            if not release.wait(5): raise ValueError("test timed out")
            return {"text":demo_proposal(initial_state()),"model":"synthetic-delay","latency_ms":1}
        self.service.generator=delayed
        errors=[]
        def run():
            try:self.propose("model")
            except ValueError as exc:errors.append(str(exc))
        thread=threading.Thread(target=run)
        thread.start()
        self.assertTrue(entered.wait(2))
        try:
            self.service.command(self.sid,"bo",{"expected_sequence":0,"request_id":"other-update-1","command":{"type":"requirement.set","requirement_id":"exercise","enabled":True}})
        finally:
            release.set();thread.join(3)
        self.assertFalse(thread.is_alive())
        self.assertTrue(any("已过期" in message for message in errors))
        self.assertEqual(self.service.proposals,{})
        self.assertEqual(self.service.state(self.sid)["sequence"],1)


if __name__=="__main__":unittest.main()
