from copy import deepcopy
import json
import unittest

from .recipes import validate_recipe, parse_recipe, recipe_messages
from .replay import load_fixture, project_events
from .serve import Lab


def recipe():
    return {"schema": "meetmind.scene-recipe.v1", "title": "合成纸桥",
            "rationale": "桥面表示我们共同完成的作品",
            "parts": [{"id": "deck", "geometry": "box", "size": [1.4, .1, .8],
                       "position": [0, .6, 0], "rotation": [0, 0, 0],
                       "color": "#edd8b1", "material": "paper", "meaning": "共同制作的桥面"}]}


class RecipeTests(unittest.TestCase):
    def setUp(self):
        self.lab = Lab(lambda messages: {"text": json.dumps(recipe()), "model": "test-only", "latency_ms": 1})
        self.sid = self.lab.create()["session_id"]
        self.body = {"session_id": self.sid, "viewer": "alice", "subject_id": "artifact-1",
                     "instruction": "按纸桥这件作品生成"}

    def command(self, kind, **extra):
        return self.lab.command({**self.body, "command": kind,
            "expected_sequence": self.lab.state(self.sid, "alice")["basis"]["through_sequence"], **extra})

    def test_recipe_is_strict_data_not_executable_code(self):
        for modification in ("url", "code", "nan", "too_many", "duplicate", "unknown_material"):
            value = recipe()
            if modification in {"url", "code"}:
                value[modification] = "ignored must not execute"
            elif modification == "nan":
                value["parts"][0]["size"][0] = float("nan")
            elif modification == "too_many":
                value["parts"] *= 41
            elif modification == "duplicate":
                value["parts"] *= 2
            else:
                value["parts"][0]["material"] = "__proto__"
            with self.subTest(modification=modification), self.assertRaises(ValueError):
                validate_recipe(value)
        with self.assertRaises(ValueError):
            parse_recipe('{"schema":"x","schema":"y"}')
        original = recipe()
        copied = validate_recipe(original)
        copied["parts"][0]["size"][0] = 2
        self.assertEqual(original, recipe())

    def test_generate_does_not_mutate_state_apply_only_changes_visual(self):
        before = self.lab.state(self.sid, "alice")
        proposal = self.lab.propose(self.body)
        self.assertEqual(before, self.lab.state(self.sid, "alice"))
        after = self.command("visual.recipe.applied", proposal_id=proposal["proposal_id"])
        old = next(i for i in before["entities"] if i["id"] == "artifact-1")
        new = next(i for i in after["entities"] if i["id"] == old["id"])
        self.assertEqual(new["title"], old["title"])
        self.assertEqual(new["source_event"], old["source_event"])
        self.assertEqual(new["appearance"], recipe())
        self.assertEqual(new["appearance_model"], "test-only")
        self.assertEqual(after["relationships"], before["relationships"])
        self.assertEqual(next(i for i in after["entities"] if i["kind"] == "action"),
                         next(i for i in before["entities"] if i["kind"] == "action"))
        removed = self.command("visual.recipe.removed")
        self.assertNotIn("appearance", next(i for i in removed["entities"] if i["id"] == old["id"]))

    def test_only_owner_and_current_proposal_can_apply(self):
        with self.assertRaises(ValueError):
            self.lab.propose({**self.body, "viewer": "bo"})
        proposal = self.lab.propose(self.body)
        self.command("inference.superseded", title="更新后的标题")
        with self.assertRaises(ValueError):
            self.command("visual.recipe.applied", proposal_id=proposal["proposal_id"])
        proposal = self.lab.propose(self.body)
        self.command("reset", through=8)
        with self.assertRaises(ValueError):
            self.command("visual.recipe.applied", proposal_id=proposal["proposal_id"])

    def test_provider_failure_leaves_state_intact_and_unlocks_retry(self):
        before = self.lab.state(self.sid, "alice")
        self.lab.generator = lambda messages: {"text": "bad", "model": "test-only"}
        with self.assertRaises(ValueError):
            self.lab.propose(self.body)
        self.assertEqual(before, self.lab.state(self.sid, "alice"))
        self.assertFalse(self.lab.generating)

    def test_changes_during_generation_reject_stale_model_output(self):
        def mutate(messages):
            self.command("inference.superseded", title="生成时被改名")
            return {"text": json.dumps(recipe()), "model": "test-only"}
        self.lab.generator = mutate
        with self.assertRaises(ValueError):
            self.lab.propose(self.body)
        self.assertNotIn((self.sid, "alice"), self.lab.proposals)

    def test_reset_during_generation_rejects_even_identical_restored_object(self):
        def reset(messages):
            self.command("reset", through=8)
            return {"text": json.dumps(recipe()), "model": "test-only"}
        self.lab.generator = reset
        with self.assertRaises(ValueError):
            self.lab.propose(self.body)
        self.assertFalse(self.lab.proposals)
        self.assertFalse(self.lab.generating)

    def test_disabled_provider_does_not_import_configuration(self):
        lab = Lab()
        sid = lab.create()["session_id"]
        with self.assertRaises(ValueError):
            lab.propose({**self.body, "session_id": sid})

    def test_prompt_only_includes_selected_public_context(self):
        item = {"id": "artifact-1", "kind": "artifact", "title": "纸桥",
                "source": {"location": "PRIVATE"}, "private_notes": "PRIVATE", "outcomes": "PRIVATE"}
        messages = recipe_messages(item, "做成纸艺模型")
        self.assertNotIn("PRIVATE", json.dumps(messages))
        self.assertIn("纸桥", messages[1]["content"])


if __name__ == "__main__":
    unittest.main()
