"""IF-5 检索接口 POST /api/v0/search（docs/API.md，FR-1.9）。

目的：按人脸/姓名/关键词检索人物，再次相见时可靠恢复上下文（P-2 闭环）。
输入：{"by": "face", "photo": "<base64>"} | {"by": "name", "query": "陈"} |
      {"by": "keyword", "query": "教育 投资"}（三种方式互斥）。
输出：200 {"results": [{"person_id", "name", "score", "last_encounter": {"time","place"}|null}]}。
验收：tests/test_search.py —— name 检索命中种子数据；face 为 stub 返回空结果。

face 检索是 stub（TODO：face_embedding provider，接口预留 agents/llm/base.py）；
name/keyword 为真实子串/关键词匹配（与 agents/tools/example_tool.py 同一策略）。
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Literal

router = APIRouter(prefix="/api/v0", tags=["search"])


class SearchRequest(BaseModel):
    by: Literal["face", "name", "keyword"]
    query: str | None = None
    photo: str | None = None  # base64（by=face 时使用）


def _last_encounter(package: dict) -> dict | None:
    encounters = package.get("encounters") or []
    if not encounters:
        return None
    last = encounters[-1]
    return {"time": last.get("time"), "place": last.get("place")}


def _haystacks(package: dict) -> list:
    """关键词匹配语料：姓名、person_id、相遇地点、推断标签值。"""
    fields = [package["identity"].get("name") or "", package["person_id"]]
    for encounter in package.get("encounters", []):
        fields.append(encounter.get("place") or "")
        for inference in encounter.get("inferences", []):
            fields.append(str(inference.get("value") or ""))
    return fields


@router.post("/search")
def search(request: Request, body: SearchRequest):
    store = request.app.state.store
    if body.by == "face":
        # TODO(算法待打磨)：photo → face_embedding → 与已有 Package 比对打分
        return {"results": [],
                "detail": "face 检索为 stub：embedding provider 接口预留（FR-1.9）"}
    if not body.query or not body.query.strip():
        raise HTTPException(status_code=400, detail="name/keyword 检索需要非空 query")

    results = []
    for summary in store.list_packages():
        package = store.load_package(summary["person_id"])
        name = package["identity"].get("name") or ""
        if body.by == "name":
            needle = body.query.strip().lower()
            if needle and needle in name.lower():
                score = 1.0 if needle == name.lower() else 0.8
            elif needle and needle in package["person_id"].lower():
                score = 0.6
            else:
                continue
        else:  # keyword：命中词数占比作为得分
            terms = [term.lower() for term in body.query.split() if term.strip()]
            haystacks = _haystacks(package)
            hits = sum(
                1 for term in terms
                if any(term in field.lower() for field in haystacks)
            )
            if hits == 0:
                continue
            score = round(hits / len(terms), 2)
        results.append({
            "person_id": package["person_id"],
            "name": name or None,
            "score": score,
            "last_encounter": _last_encounter(package),
        })
    results.sort(key=lambda item: item["score"], reverse=True)
    return {"results": results}
