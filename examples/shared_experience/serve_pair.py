"""Two-browser capability experiment; synthetic roles, loopback only."""
import argparse
import json
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

from .serve import Lab, make_handler, ThreadingHTTPServer, lab_data_directory
from .session_store import SQLiteSessionStore
from .pair_access import PairAccessStore
from .action_plans import action_calendar


def make_pair_handler(lab, access, directory, port):
    Base = make_handler(lab, directory, port)

    class PairHandler(Base):
        def token(self):
            scheme, _, token = self.headers.get("Authorization", "").partition(" ")
            if scheme != "Bearer" or not token:
                raise ValueError("需要此角色的访问凭证")
            return token

        def identity(self, supplied):
            identity = access.resolve(self.token())
            for key in ("viewer", "session_id"):
                if key in supplied and supplied[key] != identity[key]:
                    raise ValueError("不能替另一个角色或世界操作")
            return identity

        def session_info(self, identity):
            return {**lab.resume(identity["session_id"]), "viewer": identity["viewer"],
                    "pair_mode": True}

        def do_GET(self):
            if not self.allowed():
                return self.respond(403, {"error": "仅限本机实验页面"})
            url = urlsplit(self.path)
            if url.path == "/lab-api/mode":
                return self.respond(200, {"pair_mode": True})
            if not url.path.startswith("/lab-api/"):
                return super().do_GET()
            try:
                supplied = {key: values[0] for key, values in parse_qs(url.query).items()}
                identity = self.identity(supplied)
                state = lab.state(identity["session_id"], identity["viewer"])
                if url.path == "/lab-api/state":
                    return self.respond(200, state)
                if url.path == "/lab-api/calendar":
                    action = next((item for item in state["entities"] if item["id"] == supplied.get("action_id")), None)
                    data = action_calendar(action, identity["viewer"]).encode("utf-8")
                    self.send_response(200)
                    self.send_header("Content-Type", "text/calendar; charset=utf-8")
                    self.send_header("Content-Disposition", 'attachment; filename="meetmind-action.ics"')
                    self.send_header("Cache-Control", "no-store")
                    self.send_header("Content-Length", str(len(data)))
                    self.end_headers()
                    self.wfile.write(data)
                    return
                return self.respond(404, {"error": "not found"})
            except (ValueError, TypeError, KeyError) as exc:
                return self.respond(403, {"error": str(exc)})

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
                if self.path == "/lab-api/pair/join":
                    identity = access.join(body.get("invite"))
                    return self.respond(200, {**self.session_info(identity), "token": identity["token"]})
                if self.path == "/lab-api/sessions":
                    if not body and not self.headers.get("Authorization"):
                        session = lab.create()
                        token = access.register_owner(session["session_id"])
                        return self.respond(201, {**session, "viewer": "alice", "pair_mode": True, "token": token})
                    identity = self.identity(body)
                    return self.respond(200, self.session_info(identity))
                identity = self.identity(body)
                if self.path == "/lab-api/pair/invite":
                    return self.respond(200, {"invite": access.create_invite(self.token()), "expires_in_seconds": 1800})
                if self.path == "/lab-api/pair/revoke":
                    access.revoke_guest(self.token())
                    return self.respond(200, {"revoked": True})
                bound = {**body, **identity}
                if self.path == "/lab-api/commands":
                    if body.get("command") == "reset":
                        raise ValueError("双人世界不能重置对方的共同历史；请新建独立实验")
                    return self.respond(200, lab.command(bound))
                if self.path == "/lab-api/proposals":
                    return self.respond(200, lab.propose(bound))
                return self.respond(404, {"error": "not found"})
            except (ValueError, TypeError, KeyError) as exc:
                return self.respond(403, {"error": str(exc)})
    return PairHandler


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=4196)
    parser.add_argument("--data-dir", type=Path, required=True)
    parser.add_argument("--enable-model", action="store_true")
    args = parser.parse_args()
    directory = Path(__file__).parent.joinpath("lab", "dist").resolve()
    target = lab_data_directory(args.data_dir)
    generator = None
    if args.enable_model:
        from .model_provider import generate_with_configured_model
        generator = generate_with_configured_model
    lab = Lab(generator, SQLiteSessionStore(target / "worlds"))
    access = PairAccessStore(target / "access")
    server = ThreadingHTTPServer(("127.0.0.1", args.port), make_pair_handler(lab, access, directory, args.port))
    print(f"Pair capability lab: http://127.0.0.1:{args.port}/ ; synthetic roles", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
