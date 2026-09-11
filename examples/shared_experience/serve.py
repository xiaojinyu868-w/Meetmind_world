"""Loopback-only lab; isolated sessions and opt-in configured model generation."""
from __future__ import annotations

import argparse
from copy import deepcopy
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import threading
from urllib.parse import parse_qs, urlsplit
from uuid import uuid4

from .replay import load_fixture, project_events
from .adapters import checkin_to_envelope
from .recipes import parse_recipe, recipe_messages
import hashlib


class Lab:
    def __init__(self, generator=None):
        self.generator = generator
        self.proposals = {}
        self.generating = set()
        self.fixture, self.original = load_fixture()
        self.sessions = {}
        self.generations = {}
        self.lock = threading.RLock()

    def create(self):
        with self.lock:
            sid = uuid4().hex
            if len(self.sessions) >= 100:
                raise ValueError("实验会话已满，请重启实验服务")
            self.sessions[sid] = deepcopy(self.original[:8])
            self.generations[sid] = 0
            return {"session_id": sid, "members": self.fixture["members"],
                    "model_generation": self.generator is not None}

    def state(self, sid, viewer):
        with self.lock:
            if sid not in self.sessions:
                raise ValueError("实验会话不存在")
            return project_events(self.sessions[sid], viewer_id=viewer, members=self.fixture["members"])

    def _generation_context(self, sid, viewer, subject):
        state = self.state(sid, viewer)
        item = next((item for item in state["entities"] if item["id"] == subject), None)
        if not item or item["kind"] not in {"artifact", "memory-object"} or item["created_by"] != viewer:
            raise ValueError("请选择本人创建且仍可见的作品或经历")
        fingerprint = hashlib.sha256(json.dumps(item, ensure_ascii=False, sort_keys=True).encode()).hexdigest()
        return item, fingerprint

    def propose(self, body):
        sid, viewer, subject = body.get("session_id"), body.get("viewer"), body.get("subject_id")
        key = (sid, viewer)
        with self.lock:
            if self.generator is None:
                raise ValueError("实验服务未启用模型；启动时使用 --enable-model")
            item, fingerprint = self._generation_context(sid, viewer, subject)
            generation = self.generations[sid]
            if key in self.generating:
                raise ValueError("这个身份已有生成任务，请等待当前请求返回")
            messages = recipe_messages(item, body.get("instruction"))
            self.generating.add(key)
        try:
            # The paid call never holds the world state lock. Reject stale results below.
            response = self.generator(messages)
            recipe = parse_recipe(response["text"])
            model = response.get("model")
            if not isinstance(model, str) or not model.strip():
                raise ValueError("模型结果缺少模型标识")
            with self.lock:
                _, current = self._generation_context(sid, viewer, subject)
                if current != fingerprint or self.generations[sid] != generation:
                    raise ValueError("生成期间对象已变化，请基于新状态重新生成")
                proposal = {"id": uuid4().hex, "subject_id": subject, "viewer": viewer,
                            "fingerprint": fingerprint, "recipe": recipe, "model": model}
                self.proposals[key] = proposal
                return {"proposal_id": proposal["id"], "subject_id": subject, "recipe": recipe,
                        "model": model, "latency_ms": response.get("latency_ms", 0)}
        finally:
            with self.lock:
                self.generating.discard(key)

    def command(self, body):
        with self.lock:
            sid, viewer = body.get("session_id"), body.get("viewer")
            current = self.state(sid, viewer)
            if body.get("command") == "checkin.import":
                events = self.sessions[sid]
                if not events:
                    raise ValueError("请先回放到世界已创建的时刻")
                visibility = body.get("visibility")
                if visibility not in {"private", "shared"}:
                    raise ValueError("请选择本人可见或会话成员可见")
                event = checkin_to_envelope(
                    body.get("record"), sequence=len(events) + 1,
                    room_id=current["world_id"], actor_id=viewer,
                    audience=[viewer] if visibility == "private" else self.fixture["members"],
                    source_ref=events[0]["event_id"],
                )
                # A repeated delivery remains a retry even after later events or withdrawal.
                prior = next((item for item in events if item["event_id"] == event["event_id"]), None)
                if prior:
                    event["sequence"] = prior["sequence"]
                    if event != prior:
                        raise ValueError("同一来源记录已导入，内容或可见范围冲突")
                    return current
                if body.get("expected_sequence") != current["basis"]["through_sequence"]:
                    raise ValueError("状态已更新，请刷新后重试")
                candidate = [*events, event]
                projected = project_events(candidate, viewer_id=viewer, members=self.fixture["members"])
                self.sessions[sid] = candidate
                return projected
            if body.get("expected_sequence") != current["basis"]["through_sequence"]:
                raise ValueError("状态已更新，请刷新后重试")
            events = deepcopy(self.sessions[sid])
            if body.get("command") == "reset":
                through = body.get("through")
                if type(through) is not int or not 0 <= through <= len(self.original):
                    raise ValueError("无效回放位置")
                events = deepcopy(self.original[:through])
                self.generations[sid] += 1
                for key in list(self.proposals):
                    if key[0] == sid:
                        del self.proposals[key]
            else:
                command = body.get("command")
                subject = body.get("subject_id")
                by_id = {item["id"]: item for item in current["entities"]}
                if subject not in by_id:
                    raise ValueError("对象不可见或已撤回")
                item = by_id[subject]
                payload = {}
                if command == "visual.recipe.applied":
                    proposal = self.proposals.get((sid, viewer))
                    if not proposal or body.get("proposal_id") != proposal["id"] or proposal["subject_id"] != subject:
                        raise ValueError("找不到此对象的生成提案")
                    _, fingerprint = self._generation_context(sid, viewer, subject)
                    if fingerprint != proposal["fingerprint"]:
                        raise ValueError("对象已变化，旧提案不可应用")
                    payload = {"recipe": proposal["recipe"], "model": proposal["model"]}
                    refs = [item.get("appearance_event", item.get("correction_event", item["source_event"]))]
                elif command == "visual.recipe.removed":
                    refs = [item.get("appearance_event", item["source_event"])]
                elif command in {"action.accepted", "action.declined", "experience.revoked"}:
                    refs = [item["source_event"]]
                elif command == "inference.superseded":
                    target = item.get("correction_event", item["source_event"])
                    payload = {"target_event_id": target, "new_title": body.get("title")}
                    refs = [target]
                elif command == "action.outcome.recorded":
                    decision = item.get("decisions", {}).get(viewer)
                    if not decision:
                        raise ValueError("请先接受行动")
                    refs = [decision["event_id"]]
                    payload = {"result": body.get("result"), "report_kind": "self_report", "note": body.get("note")}
                elif command == "action.outcome.revoked":
                    outcome = item.get("outcomes", {}).get(viewer)
                    if not outcome:
                        raise ValueError("没有可撤回的本人报告")
                    refs = [outcome["event_id"]]
                    payload = {"target_event_id": outcome["event_id"]}
                else:
                    raise ValueError("不支持的实验命令")
                origin = next(event for event in events if event["event_id"] == item["source_event"])
                events.append({
                    "schema": "meetmind.event.v1", "event_id": "lab-" + uuid4().hex,
                    "sequence": len(events) + 1, "room_id": current["world_id"],
                    "actor_id": viewer, "subject_id": subject, "type": command,
                    "payload": payload, "audience": deepcopy(origin["audience"]), "source_refs": refs,
                })
            projected = project_events(events, viewer_id=viewer, members=self.fixture["members"])
            self.sessions[sid] = events
            return projected


def make_handler(lab, directory, port):
    class Handler(SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(directory), **kwargs)

        def log_message(self, format, *args):
            pass

        def respond(self, status, value):
            data = json.dumps(value, ensure_ascii=False).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(data)

        def allowed(self):
            hosts = {f"127.0.0.1:{port}", f"localhost:{port}"}
            return (self.headers.get("Host") in hosts
                    and self.headers.get("Origin") in {None, *("http://" + host for host in hosts)})

        def do_GET(self):
            if not self.allowed():
                return self.respond(403, {"error": "仅限本机实验页面"})
            url = urlsplit(self.path)
            if url.path == "/lab-api/state":
                query = parse_qs(url.query)
                try:
                    state = lab.state(query.get("session_id", [""])[0], query.get("viewer", [""])[0])
                    return self.respond(200, state)
                except ValueError as exc:
                    return self.respond(400, {"error": str(exc)})
            path = url.path
            # Only the lab build is served; never list directories or resolve symlinks outside it.
            resolved = (directory / path.lstrip("/")).resolve()
            if path == "/":
                resolved = directory / "index.html"
            if directory not in resolved.parents or not resolved.is_file():
                return self.respond(404, {"error": "not found"})
            return super().do_GET()

        def do_POST(self):
            if not self.allowed():
                return self.respond(403, {"error": "仅限本机实验页面"})
            try:
                length = int(self.headers.get("Content-Length", "0"))
                if not 0 < length <= 16384:
                    raise ValueError("无效请求大小")
                body = json.loads(self.rfile.read(length))
                if not isinstance(body, dict):
                    raise ValueError("请求必须是对象")
                if self.path == "/lab-api/sessions":
                    return self.respond(201, lab.create())
                if self.path == "/lab-api/proposals":
                    return self.respond(200, lab.propose(body))
                if self.path == "/lab-api/commands":
                    return self.respond(200, lab.command(body))
                return self.respond(404, {"error": "not found"})
            except (ValueError, TypeError, KeyError) as exc:
                return self.respond(400, {"error": str(exc)})

        def do_HEAD(self):
            self.respond(405, {"error": "method not supported"})

    return Handler


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=4191)
    parser.add_argument("--enable-model", action="store_true",
                        help="Opt in to the configured chat provider; only explicit proposal requests call it")
    args = parser.parse_args()
    directory = Path(__file__).parent.joinpath("lab", "dist").resolve()
    if not (directory / "index.html").is_file():
        parser.error("先执行 npm exec vite build -- --config examples/shared_experience/lab/vite.config.js")
    generator = None
    if args.enable_model:
        from .model_provider import generate_with_configured_model
        generator = generate_with_configured_model
    server = ThreadingHTTPServer(("127.0.0.1", args.port), make_handler(Lab(generator), directory, args.port))
    print(f"Synthetic lab: http://127.0.0.1:{args.port}/", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
