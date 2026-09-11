"""Isolated browser QA server; always synthetic/captured responses, never a model call."""
import json
from pathlib import Path

from .serve import Lab, make_handler, ThreadingHTTPServer


def fixture_recipe():
    def part(part_id, geometry, size, position, color, meaning):
        return {"id": part_id, "geometry": geometry, "size": size, "position": position,
                "rotation": [0, 0, 0], "color": color, "material": "paper", "meaning": meaning}
    parts = [part("river", "box", [2.4, .04, 1.2], [0, .02, 0], "#287b75", "测试用河流象征")]
    for side in [-1, 1]:
        parts.append(part("support-" + str(side), "box", [.2, .5, .7], [side * .9, .29, 0], "#e5d6b3", "纸桥支撑"))
    for i in range(9):
        parts.append(part("deck-" + str(i), "box", [.23, .07, .7],
                          [(i - 4) * .2, .57 + .2 * (1 - abs(i - 4) / 4), 0],
                          "#f1e6cc", "共同完成的纸桥"))
    return {"schema": "meetmind.scene-recipe.v1", "title": "测试纸桥",
            "rationale": "人工编写的测试配方；用于验证局部编辑，不代表模型生成质量。", "parts": parts}


def fixture_patch():
    recipe = fixture_recipe()
    def part(part_id, shape, size, position):
        return {**recipe["parts"][0], "id": part_id, "geometry": shape, "size": size,
                "position": position, "color": "#d3aa4a", "material": "metal", "meaning": "继续一起创作的愿望，测试用视觉寓意"}
    return {"schema": "meetmind.scene-patch.v1", "title": "测试纸桥与灯",
            "rationale": "保留纸桥，在旁边增加一盏灯象征继续创作的愿望。人工编写的测试修改，没有调用模型。",
            "operations": [{"op": "add", "part": p} for p in [
                part("lamp-foot", "cylinder", [.22, .06, .22], [.9, .07, .45]),
                part("lamp-pole", "cylinder", [.05, .45, .05], [.9, .32, .45]),
                part("lamp-light", "sphere", [.22, .22, .22], [.9, .62, .45]),
            ]]}


def fixture_generator(messages):
    context = json.loads(messages[1]["content"])
    value = fixture_patch() if "current_recipe" in context else fixture_recipe()
    return {"text": json.dumps(value), "model": "fixture-only-no-model-call", "latency_ms": 0}


if __name__ == "__main__":
    directory = Path(__file__).parent.joinpath("lab", "dist").resolve()
    server = ThreadingHTTPServer(("127.0.0.1", 4192), make_handler(Lab(fixture_generator), directory, 4192))
    print("Fixture-only QA server: http://127.0.0.1:4192/ ; no model calls", flush=True)
    server.serve_forever()
