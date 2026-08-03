"""Package 存储：事实层/推断层物理分离 + people/<person_id>/ 目录约定。

目的：落地 docs/CONTEXT-AND-MEMORY.md §2 的事实层/推断层分离（P-3）：
      - facts/ 命名空间 append-only（写入函数刻意不提供更新/删除入口）；
      - inferences/ 命名空间可重算覆盖；
      - people/<person_id>/{profile.json,memory.md,relations.md} 人物目录约定（§6）。
输入：person_id、encounter_id、文件字节 / package dict。
输出：facts 相对路径指针、inferences 路径、profile.json 落盘。
验收：tests/test_permissions.py —— 事实文件覆盖写入被拒绝；
      tests/test_api.py —— ingest → confirm → GET 全流程。

长期记忆（人物事实层）只能经由本模块的 confirm_identity()（用户确认流程，FR-1.3）
写入；自进化流程（harness）无权调用本模块，见 agents/memory/store.py 的只读封装。
"""

import hashlib
import json
import re
from pathlib import Path

from app.config import get_data_dir
from app.schemas.package_schema import SCHEMA_VERSION, validate_package

_SAFE_NAME = re.compile(r"^[\w.\-]+$", re.UNICODE)

MEMORY_MD_TEMPLATE = """# 记忆（推断层，可重算）

每条目必须附事实指针与置信度，格式：`- 内容 (source: facts/..., conf: 0.7)`。
指不回去的条目不允许入库（CONTEXT-AND-MEMORY.md §1 防线 #4）。
"""

RELATIONS_MD_TEMPLATE = """# 关系网络（关键词匹配用）

格式：`人名 | 关系 | 关键词1, 关键词2 | 来源事件`
"""


class PackageNotFound(KeyError):
    """person_id 不存在时抛出。"""


class FactLayerImmutableError(RuntimeError):
    """试图覆盖/修改事实层已有文件时抛出（事实层只增不改，NFR-1.1）。"""


def _safe_part(value: str, field: str) -> str:
    """路径片段白名单校验，防止路径逃逸。"""
    if not isinstance(value, str) or not _SAFE_NAME.match(value):
        raise ValueError(f"非法路径片段 {field}: {value!r}")
    return value


class PackageStore:
    """以文件系统为存储的 Package 仓库（ADR-2：Markdown + JSON，暂不上数据库）。"""

    def __init__(self, root: Path | None = None):
        self.root = Path(root) if root else get_data_dir()
        self.facts_dir = self.root / "facts"
        self.inferences_dir = self.root / "inferences"
        self.people_dir = self.root / "people"
        for directory in (self.facts_dir, self.inferences_dir, self.people_dir):
            directory.mkdir(parents=True, exist_ok=True)

    # ---------- 事实层（append-only；刻意没有 update/delete 入口） ----------

    def write_fact(self, partition: str, bundle: str, filename: str, data: bytes) -> str:
        """写入一份事实文件，返回相对指针（facts/<partition>/<bundle>/<filename>）。

        partition/bundle 为两级命名空间片段：人物 encounter 用
        (person_id, encounter_id)，IF-1 原始输入用 (采集日期, input_id)。
        目标已存在时抛 FactLayerImmutableError —— 编辑事实 = 换一个
        新版本文件名（如 transcript.v2.md）再次写入，而不是覆盖。
        """
        partition = _safe_part(partition, "partition")
        bundle = _safe_part(bundle, "bundle")
        filename = _safe_part(filename, "filename")
        target = self.facts_dir / partition / bundle / filename
        if target.exists():
            raise FactLayerImmutableError(
                f"事实层只增不改，拒绝覆盖：{target.relative_to(self.root)}"
            )
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        self._update_manifest(target, data)
        return str(target.relative_to(self.root))

    # ---------- 事实层完整性（1.D.3：manifest + sha256 自检） ----------

    def _update_manifest(self, target: Path, data: bytes) -> None:
        """每次写事实文件后维护同目录 manifest.v1.json（相对路径 → sha256）。

        manifest 是索引而非事实内容，允许覆盖重写；它不登记自身。
        """
        manifest_path = target.parent / "manifest.v1.json"
        files = {}
        if manifest_path.exists():
            try:
                files = json.loads(manifest_path.read_text(encoding="utf-8")).get("files", {})
            except json.JSONDecodeError:
                files = {}
        files[str(target.relative_to(self.root))] = hashlib.sha256(data).hexdigest()
        payload = {"schema": "echo-facts-manifest.v1", "files": files}
        manifest_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2),
                                 encoding="utf-8")

    def verify_facts_integrity(self, person_id: str | None = None) -> dict:
        """复核 facts/ 下所有 manifest 登记的 sha256（全量或单人）。

        返回 {"ok", "checked", "corrupted": [{ref, reason}], "unregistered": [...]}：
        corrupted = 文件缺失或哈希不符（可能被篡改/损坏）；unregistered =
        存在于目录但未登记进 manifest 的文件（ informational，不影响 ok）。
        """
        facts_root = self.facts_dir.resolve()
        checked, corrupted, unregistered = 0, [], []
        for manifest_path in sorted(facts_root.rglob("manifest.v1.json")):
            if person_id and f"/{person_id}/" not in str(manifest_path).replace("\\", "/"):
                continue
            try:
                files = json.loads(manifest_path.read_text(encoding="utf-8")).get("files", {})
            except json.JSONDecodeError:
                corrupted.append({"ref": str(manifest_path.relative_to(self.root)),
                                  "reason": "manifest 无法解析"})
                continue
            registered = set()
            for ref, expected in files.items():
                if person_id and f"/{person_id}/" not in ref.replace("\\", "/"):
                    continue
                registered.add(ref)
                target = (self.root / ref).resolve()
                checked += 1
                if facts_root not in target.parents or not target.is_file():
                    corrupted.append({"ref": ref, "reason": "文件缺失"})
                    continue
                actual = hashlib.sha256(target.read_bytes()).hexdigest()
                if actual != expected:
                    corrupted.append({"ref": ref, "reason": "sha256 不符（内容已变更）"})
            # 目录里存在但 manifest 未登记的文件（如手写拷贝进来的旧文件）
            for path in sorted(manifest_path.parent.iterdir()):
                if not path.is_file() or path.name == "manifest.v1.json":
                    continue
                ref = str(path.relative_to(self.root))
                if person_id and f"/{person_id}/" not in ref.replace("\\", "/"):
                    continue
                if ref not in registered:
                    unregistered.append(ref)
        return {"ok": not corrupted, "checked": checked,
                "corrupted": corrupted, "unregistered": unregistered}

    def read_fact(self, rel_path: str) -> bytes:
        target = (self.root / rel_path).resolve()
        if self.facts_dir.resolve() not in target.parents:
            raise ValueError(f"事实指针必须位于 facts/ 命名空间内：{rel_path}")
        return target.read_bytes()

    def find_input_dir(self, input_id: str) -> Path | None:
        """按 input_id 定位 IF-1 落盘目录 facts/<date>/<input_id>/，找不到返回 None。"""
        input_id = _safe_part(input_id, "input_id")
        for date_dir in sorted(self.facts_dir.iterdir()):
            candidate = date_dir / input_id
            if date_dir.is_dir() and candidate.is_dir():
                return candidate
        return None

    # ---------- 推断层（可重算、覆盖、删除） ----------

    def write_inference(self, person_id: str, name: str, payload: dict) -> str:
        person_id = _safe_part(person_id, "person_id")
        name = _safe_part(name, "name")
        target = self.inferences_dir / person_id / f"{name}.json"
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        return str(target.relative_to(self.root))

    def read_inferences(self, person_id: str) -> dict:
        directory = self.inferences_dir / _safe_part(person_id, "person_id")
        if not directory.is_dir():
            return {}
        return {
            path.stem: json.loads(path.read_text(encoding="utf-8"))
            for path in sorted(directory.glob("*.json"))
        }

    # ---------- 人物目录与 Package（profile.json） ----------

    def ensure_person_dir(self, person_id: str) -> Path:
        """创建 people/<person_id>/ 及 memory.md / relations.md 模板（已存在则不动）。"""
        person_id = _safe_part(person_id, "person_id")
        directory = self.people_dir / person_id
        directory.mkdir(parents=True, exist_ok=True)
        memory_md = directory / "memory.md"
        relations_md = directory / "relations.md"
        if not memory_md.exists():
            memory_md.write_text(MEMORY_MD_TEMPLATE, encoding="utf-8")
        if not relations_md.exists():
            relations_md.write_text(RELATIONS_MD_TEMPLATE, encoding="utf-8")
        return directory

    def save_package(self, package: dict) -> Path:
        """校验后写入 people/<person_id>/profile.json。"""
        validate_package(package)
        directory = self.ensure_person_dir(package["person_id"])
        target = directory / "profile.json"
        target.write_text(
            json.dumps(package, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        return target

    def load_package(self, person_id: str) -> dict:
        target = self.people_dir / _safe_part(person_id, "person_id") / "profile.json"
        if not target.exists():
            raise PackageNotFound(person_id)
        return validate_package(json.loads(target.read_text(encoding="utf-8")))

    def list_packages(self) -> list:
        """Package 摘要列表（不含 facts 内容，只列指针元信息）。"""
        summaries = []
        for directory in sorted(self.people_dir.iterdir()):
            profile = directory / "profile.json"
            if not directory.is_dir() or not profile.exists():
                continue
            package = validate_package(json.loads(profile.read_text(encoding="utf-8")))
            summaries.append(
                {
                    "person_id": package["person_id"],
                    "confirmed": package["identity"]["confirmed"],
                    "name": package["identity"].get("name"),
                    "encounter_count": len(package["encounters"]),
                }
            )
        return summaries

    # ---------- 用户确认流程（FR-1.3）：长期记忆唯一的写入入口 ----------

    def confirm_identity(self, person_id: str, name: str | None = None) -> dict:
        """用户显式确认身份：identity.confirmed=True 后才允许进 Agent 上下文。"""
        package = self.load_package(person_id)
        package["identity"]["confirmed"] = True
        if name is not None:
            package["identity"]["name"] = name
        self.save_package(package)
        return package

    def create_draft_package(self, person_id: str, palette: dict) -> dict:
        """创建未确认的 Package 草稿（空推断层，FR-1.4）。"""
        package = {
            "schema": SCHEMA_VERSION,
            "person_id": person_id,
            "identity": {"confirmed": False, "name": None, "face_ref": None, "voiceprint_ref": None},
            "encounters": [],
            "avatar": {"type": "lowpoly-faceless-v1", "palette": palette, "real_face_ref": None},
            "relations": [],
        }
        self.save_package(package)
        return package

    def load_or_create_draft(self, person_id: str, palette: dict) -> dict:
        try:
            return self.load_package(person_id)
        except PackageNotFound:
            return self.create_draft_package(person_id, palette)
