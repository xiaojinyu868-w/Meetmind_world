from copy import deepcopy
import json
import unittest

from .recipes import apply_patch_recipe, parse_patch, patch_messages
from .serve import Lab
from .test_recipes import recipe


def patch():
    return {"schema": "meetmind.scene-patch.v1", "title": "纸桥与灯", "rationale": "纸桥旁的灯象征继续创作",
            "operations": [{"op": "add", "part": {**recipe()["parts"][0], "id": "lamp",
                "geometry": "sphere", "size": [.2, .2, .2], "position": [.8, .5, 0],
                "color": "#f0cd66", "meaning": "继续创作的愿望"}}]}


class PatchTests(unittest.TestCase):
    def test_untouched_parts_survive_and_input_is_unchanged(self):
        before = recipe()
        snapshot = deepcopy(before)
        after, changes = apply_patch_recipe(before, patch())
        self.assertEqual(before, snapshot)
        self.assertEqual(after["parts"][0], before["parts"][0])
        self.assertEqual(changes, {"added": ["lamp"], "updated": [], "removed": [], "preserved": ["deck"]})

    def test_update_only_changes_requested_fields_and_remove_is_explicit(self):
        base, _ = apply_patch_recipe(recipe(), patch())
        value = {**patch(), "operations": [{"op": "update", "id": "deck", "changes": {"color": "#abcdef"}},
                                           {"op": "remove", "id": "lamp"}]}
        after, changes = apply_patch_recipe(base, value)
        self.assertEqual(after["parts"], [{**recipe()["parts"][0], "color": "#abcdef"}])
        self.assertEqual(changes["updated"], ["deck"])
        self.assertEqual(changes["removed"], ["lamp"])

    def test_invalid_patch_never_partially_changes_base(self):
        base = recipe()
        invalids = [
            [{"op": "update", "id": "missing", "changes": {"color": "#abcdef"}}],
            [{"op": "remove", "id": "deck"}],
            [{"op": "update", "id": "deck", "changes": {"id": "new"}}],
            [{"op": "update", "id": "deck", "changes": {"color": "#edd8b1"}}],
            [patch()["operations"][0], {"op": "remove", "id": "lamp"}],
            [{"op": "add", "part": recipe()["parts"][0]}],
            [{"op": "update", "id": "deck", "changes": {"position": [0, -1, 0]}}],
            [{"op": "update", "id": [], "changes": {"color": "#abcdef"}}],
        ]
        for operations in invalids:
            with self.subTest(operations=operations), self.assertRaises(ValueError):
                apply_patch_recipe(base, {**patch(), "operations": operations})
            self.assertEqual(base, recipe())
        with self.assertRaises(ValueError):
            parse_patch('{"schema":"x","schema":"y"}', base)

    def test_part_count_budget_applies_to_result(self):
        base = recipe()
        base["parts"] = [{**base["parts"][0], "id": str(i)} for i in range(40)]
        with self.assertRaises(ValueError):
            apply_patch_recipe(base, patch())

    def test_patch_prompt_includes_only_selected_recipe_and_context(self):
        entity = {"id": "artifact-1", "kind": "artifact", "title": "纸桥", "appearance": recipe(),
                  "source": "PRIVATE", "outcomes": "PRIVATE", "appearance_model": "PRIVATE"}
        context = json.loads(patch_messages(entity, "加灯")[1]["content"])
        self.assertEqual(set(context), {"object_id", "kind", "title", "instruction", "current_recipe"})
        self.assertEqual(context["current_recipe"], recipe())
        self.assertNotIn("PRIVATE", json.dumps(context))
        with self.assertRaises(ValueError):
            patch_messages({**entity, "appearance": None}, "加灯")

    def test_proposal_and_patch_event_preserve_history_and_relationships(self):
        lab = Lab(lambda _: {"text": json.dumps(recipe()), "model": "test-only"})
        sid = lab.create()["session_id"]
        body = {"session_id": sid, "viewer": "alice", "subject_id": "artifact-1", "instruction": "纸桥"}
        def command(name, **fields):
            return lab.command({**body, "command": name, "expected_sequence":
                                lab.state(sid, "alice")["basis"]["through_sequence"], **fields})
        created = lab.propose(body)
        first = command("visual.recipe.applied", proposal_id=created["proposal_id"])
        lab.generator = lambda _: {"text": json.dumps(patch()), "model": "test-only"}
        proposal = lab.propose({**body, "mode": "patch"})
        self.assertEqual(lab.state(sid, "alice"), first)
        self.assertEqual(proposal["changes"]["preserved"], ["deck"])
        with self.assertRaises(ValueError):
            command("visual.recipe.applied", proposal_id=proposal["proposal_id"])
        after = command("visual.recipe.patched", proposal_id=proposal["proposal_id"])
        old = next(e for e in first["entities"] if e["id"] == "artifact-1")
        new = next(e for e in after["entities"] if e["id"] == "artifact-1")
        self.assertEqual(new["appearance"]["parts"][0], old["appearance"]["parts"][0])
        self.assertEqual(new["title"], old["title"])
        self.assertEqual(new["source_event"], old["source_event"])
        self.assertEqual(new["provenance"][-1]["type"], "visual.recipe.patched")
        self.assertEqual(after["relationships"], first["relationships"])
        self.assertEqual(next(e for e in after["entities"] if e["kind"] == "action"),
                         next(e for e in first["entities"] if e["kind"] == "action"))
        with self.assertRaises(ValueError):
            command("visual.recipe.patched", proposal_id=proposal["proposal_id"])
        remove_lamp = {**patch(), "operations": [{"op": "remove", "id": "lamp"}]}
        lab.generator = lambda _: {"text": json.dumps(remove_lamp), "model": "test-only"}
        proposal = lab.propose({**body, "mode": "patch", "instruction": "修改"})
        command("visual.recipe.removed")
        with self.assertRaises(ValueError):
            command("visual.recipe.patched", proposal_id=proposal["proposal_id"])


if __name__ == "__main__":
    unittest.main()
