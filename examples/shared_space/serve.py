"""Persistent two-person space experiment, synthetic inputs and loopback only."""
from __future__ import annotations
import argparse
from copy import deepcopy
import json
from pathlib import Path
import re
import threading
from urllib.parse import urlsplit
from uuid import uuid4

from examples.shared_experience.serve import make_handler, lab_data_directory, ThreadingHTTPServer
from examples.shared_experience.session_store import SQLiteSessionStore
from examples.shared_experience.pair_access import PairAccessStore
from .domain import initial_state, apply_command, evaluate, export_summary
from .proposals import proposal_messages, parse_proposal, demo_proposal


class Conflict(ValueError):
    pass


class SpaceService:
    def __init__(self, store, generator=None):
        self.store = store
        self.generator = generator
        self.proposals = {}
        self.generating = set()
        self.lock = threading.RLock()

    def create(self):
        sid = uuid4().hex
        self.store.create(sid, [{"schema": "meetmind.shared-space-log.v1", "type": "created"}])
        return sid

    def _load(self, sid):
        saved = self.store.load(sid)
        if saved is None:
            raise ValueError("这个空间不存在")
        events = saved["events"]
        if not events or events[0] != {"schema": "meetmind.shared-space-log.v1", "type": "created"}:
            raise ValueError("空间记录格式不兼容，未重置数据")
        state = initial_state()
        for event in events[1:]:
            if set(event) != {"actor", "command", "request_id"}:
                raise ValueError("空间事件损坏，未重置数据")
            state = apply_command(state, event["actor"], event["command"])
        return saved, state

    def state(self, sid):
        with self.lock:
            state = self._load(sid)[1]
            return {**state, "violations": evaluate(state)}

    def command(self, sid, actor, body, *, from_proposal=False):
        if type(body) is not dict or set(body) != {"expected_sequence", "request_id", "command"}:
            raise ValueError("命令字段不完整或包含未知字段")
        rid = body["request_id"]
        if not isinstance(rid, str) or not re.fullmatch(r"[A-Za-z0-9_-]{8,80}", rid):
            raise ValueError("无效请求标识")
        if type(body["expected_sequence"]) is not int or type(body["command"]) is not dict:
            raise ValueError("无效版本或命令")
        if body["command"].get("type") == "layout.patch" and not from_proposal:
            raise ValueError("布局提案必须从服务端已检查的提案应用")
        with self.lock:
            saved, state = self._load(sid)
            event = {"actor": actor, "command": body["command"], "request_id": rid}
            for previous in saved["events"][1:]:
                if previous["request_id"] == rid and previous["actor"] == actor:
                    if previous != event:
                        raise ValueError("相同请求不能改写内容")
                    return {**state, "violations": evaluate(state)}
            if body["expected_sequence"] != state["sequence"]:
                raise Conflict("对方刚更新了空间，已保留你的输入；请查看最新方案后重试")
            result = apply_command(state, actor, body["command"])
            try:
                self.store.save(sid, saved["events"] + [deepcopy(event)], 0, saved["revision"])
            except ValueError as exc:
                if "版本已变化" in str(exc):
                    raise Conflict("空间已有更新，请重新查看") from None
                raise
            result["violations"] = evaluate(result)
            return result


    def propose(self, sid, actor, body):
        if type(body) is not dict or set(body) != {"mode", "instruction", "expected_sequence"}:
            raise ValueError("提案请求字段无效")
        if body["mode"] not in ("demo", "model") or type(body["expected_sequence"]) is not int:
            raise ValueError("提案模式或版本无效")
        key = (sid, actor)
        with self.lock:
            _, state = self._load(sid)
            if state["sequence"] != body["expected_sequence"]:
                raise Conflict("空间已更新，请查看最新方案后再提出修改")
            if actor not in state["members"]:
                raise ValueError("无效参与者")
            messages = proposal_messages(state, body["instruction"])
            if key in self.generating:
                raise ValueError("你已有一个生成任务，请等待返回")
            if body["mode"] == "model" and self.generator is None:
                raise ValueError("当前服务未启用模型，人工提案入口仍可使用")
            self.generating.add(key)
        try:
            if body["mode"] == "demo":
                response = {"text": demo_proposal(state), "model": None, "latency_ms": 0}
                provenance = {"kind": "manual-demo", "label": "人工B布局演示", "model": None}
            else:
                response = self.generator(messages)
                if type(response) is not dict or not isinstance(response.get("model"), str):
                    raise ValueError("模型响应缺少来源信息")
                provenance = {"kind": "model", "label": "配置模型的布局提案", "model": response["model"]}
            parsed = parse_proposal(response["text"], state)
            with self.lock:
                _, current = self._load(sid)
                if current["revision"] != state["revision"]:
                    raise Conflict("生成期间空间要求或布局有变化，此提案已过期，请重新生成")
                proposal_id = uuid4().hex
                result = {**parsed, "id": proposal_id, "basis_revision": state["revision"],
                          "provenance": provenance, "latency_ms": response.get("latency_ms", 0),
                          "review_required": any(r["review_needed"] for r in current["requirements"])}
                # One proposal per viewer; pending drafts are not durable world events.
                self.proposals[key] = deepcopy(result)
                return result
        finally:
            with self.lock:
                self.generating.discard(key)

    def apply_proposal(self, sid, actor, body):
        if type(body) is not dict or set(body) != {"proposal_id", "expected_sequence", "request_id"}:
            raise ValueError("应用提案请求字段无效")
        if not isinstance(body["proposal_id"], str):
            raise ValueError("提案标识无效")
        with self.lock:
            result = self.proposals.get((sid, actor))
            if not result or result["id"] != body["proposal_id"]:
                raise ValueError("提案不存在或已被新的提案替代；重启服务后需重新生成")
            command = {"type": "layout.patch", "basis_revision": result["basis_revision"],
                       "moves": [{k: op[k] for k in ("object_id", "x", "z", "rotation")}
                                 for op in result["proposal"]["operations"]],
                       "provenance": result["provenance"]}
            return self.command(sid, actor, {"expected_sequence": body["expected_sequence"],
                                 "request_id": body["request_id"], "command": command}, from_proposal=True)


def make_space_handler(service, access, directory, port):
    Base = make_handler(None, directory, port)

    class Handler(Base):
        def identity(self):
            scheme, _, token = self.headers.get("Authorization", "").partition(" ")
            if scheme != "Bearer":
                raise ValueError("需要当前角色的访问凭证")
            return access.resolve(token)

        def session(self, identity, token=None):
            return {"session_id": identity["session_id"], "viewer": identity["viewer"],
                    "state": service.state(identity["session_id"]), "model_enabled": service.generator is not None,
                    **({"token": token} if token else {})}

        def do_GET(self):
            if not self.allowed():
                return self.respond(403, {"error": "仅限本机实验页面"})
            path = urlsplit(self.path).path
            if path.startswith("/lab-api/"):
                return self.respond(404, {"error": "not found"})
            if not path.startswith("/space-api/"):
                return super().do_GET()
            try:
                identity = self.identity()
            except ValueError as exc:
                return self.respond(403, {"error": str(exc)})
            try:
                if path == "/space-api/state":
                    return self.respond(200, self.session(identity))
                if path == "/space-api/export":
                    state = service.state(identity["session_id"])
                    state.pop("violations", None)
                    return self.respond(200, {"revision": state["revision"], "text": export_summary(state, identity["viewer"])})
                return self.respond(404, {"error": "not found"})
            except ValueError as exc:
                return self.respond(400, {"error": str(exc)})

        def do_POST(self):
            if not self.allowed():
                return self.respond(403, {"error": "仅限本机实验页面"})
            try:
                length = int(self.headers.get("Content-Length", "0"))
                if not 0 < length <= 16384:
                    raise ValueError("请求大小无效")
                body = json.loads(self.rfile.read(length))
                if type(body) is not dict:
                    raise ValueError("请求必须是对象")
                if self.path == "/space-api/sessions" and body == {} and not self.headers.get("Authorization"):
                    sid = service.create()
                    token = access.register_owner(sid)
                    return self.respond(201, self.session({"session_id": sid, "viewer": "alice"}, token))
                if self.path == "/space-api/join":
                    if set(body) != {"invite"}:
                        raise ValueError("加入请求格式无效")
                    identity = access.join(body["invite"])
                    return self.respond(200, self.session(identity, identity["token"]))
                try:
                    identity = self.identity()
                except ValueError as exc:
                    return self.respond(403, {"error": str(exc)})
                if self.path == "/space-api/proposal":
                    result = service.propose(identity["session_id"], identity["viewer"], body)
                    # Recheck access after a potentially long-running model call.
                    current_identity = self.identity()
                    if current_identity != identity:
                        raise ValueError("当前角色访问已变化")
                    return self.respond(200, result)
                if self.path == "/space-api/proposal/apply":
                    state = service.apply_proposal(identity["session_id"], identity["viewer"], body)
                    return self.respond(200, {"session_id": identity["session_id"], "viewer": identity["viewer"], "state": state})
                if self.path == "/space-api/command":
                    state = service.command(identity["session_id"], identity["viewer"], body)
                    return self.respond(200, {"session_id": identity["session_id"], "viewer": identity["viewer"], "state": state})
                if body:
                    raise ValueError("此操作不接受额外字段")
                token = self.headers["Authorization"].partition(" ")[2]
                if self.path == "/space-api/invite":
                    return self.respond(200, {"invite": access.create_invite(token)})
                if self.path == "/space-api/revoke":
                    access.revoke_guest(token)
                    return self.respond(200, {"revoked": True})
                return self.respond(404, {"error": "not found"})
            except Conflict as exc:
                return self.respond(409, {"error": str(exc)})
            except (ValueError, TypeError, KeyError) as exc:
                return self.respond(400, {"error": str(exc)})
    return Handler


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=4197)
    parser.add_argument("--data-dir", type=Path, required=True)
    parser.add_argument("--enable-model", action="store_true")
    args = parser.parse_args()
    directory = Path(__file__).parent.joinpath("web", "dist").resolve()
    if not (directory / "index.html").is_file():
        parser.error("请先构建 examples/shared_space/web/vite.config.js")
    target = lab_data_directory(args.data_dir)
    if target == directory or directory in target.parents or target in directory.parents:
        parser.error("数据目录必须位于公开构建目录之外")
    generator = None
    if args.enable_model:
        from examples.shared_experience.model_provider import generate_with_configured_model
        generator = generate_with_configured_model
    service = SpaceService(SQLiteSessionStore(target / "worlds"), generator)
    access = PairAccessStore(target / "access")
    server = ThreadingHTTPServer(("127.0.0.1", args.port), make_space_handler(service, access, directory, args.port))
    print(f"Shared space: http://127.0.0.1:{args.port}/ ; synthetic, model_enabled={generator is not None}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
