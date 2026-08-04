"""现场群体房间的状态权威服务。

这是独立于单人 WorldService 的 MVP2 现场协议。它只消费上游已经完成建档的
参与者 DTO 与可公开资源引用，不负责照片、人脸、贴图、音频或视频处理。
"""

from __future__ import annotations

import copy
import math
import re
import secrets
import threading
import uuid
from datetime import UTC, datetime

from app.packages.store import PackageStore

ROOM_SCHEMA = "echo-group-room.v1"
IMPRESSION_SCHEMA = "echo-group-impression.v1"
GAME_RESULT_SCHEMA = "echo-group-game-result.v1"
ROOM_CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
MAX_PARTICIPANTS = 8
MAX_IMPRESSION_LENGTH = 80
POSITION_LIMIT_X = 7.0
POSITION_LIMIT_Z = 5.0
PRESENCE_TTL_SECONDS = 5.0
_SAFE_PERSON_ID = re.compile(r"^[\w.\-]+$", re.UNICODE)


class GroupSessionError(RuntimeError):
    """可安全映射到 HTTP 响应的领域错误。"""

    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.status_code = status_code


def _now() -> str:
    return datetime.now(UTC).isoformat()


def _clean_text(value: str, field: str, maximum: int) -> str:
    text = " ".join(str(value).split())
    if not text:
        raise GroupSessionError(f"{field}不能为空", 422)
    if len(text) > maximum:
        raise GroupSessionError(f"{field}不能超过 {maximum} 个字符", 422)
    return text


def _clean_person_id(value: str) -> str:
    person_id = _clean_text(value, "person_id", 80)
    if not _SAFE_PERSON_ID.fullmatch(person_id):
        raise GroupSessionError("person_id 只能包含字母、数字、下划线、点和连字符", 422)
    return person_id


class GroupSessionService:
    """进程内现场房间服务；面向同一场地局域部署，不等同于云端联机。"""

    def __init__(self, store: PackageStore):
        self.store = store
        self._rooms: dict[str, dict] = {}
        self._codes: dict[str, str] = {}
        self._lock = threading.RLock()

    def create_session(self, title: str, host: dict, participants: list[dict]) -> dict:
        with self._lock:
            roster = [host, *participants]
            by_id: dict[str, dict] = {}
            host_id = _clean_person_id(host.get("person_id", ""))
            for item in roster:
                person_id = _clean_person_id(item.get("person_id", ""))
                if person_id in by_id:
                    raise GroupSessionError(f"参与者重复：{person_id}", 409)
                display_name = _clean_text(item.get("display_name", ""), "display_name", 40)
                by_id[person_id] = {
                    "person_id": person_id,
                    "display_name": display_name,
                    "avatar_ref": item.get("avatar_ref") or None,
                    "joined": True,
                    "joined_at": _now(),
                    "last_seen_at": _now(),
                    "presence": {
                        "x": 0.0,
                        "z": 0.0,
                        "yaw": 0.0,
                        "seq": 0,
                    },
                }
            if not 2 <= len(by_id) <= MAX_PARTICIPANTS:
                raise GroupSessionError(
                    f"现场房间需要 2 至 {MAX_PARTICIPANTS} 名参与者", 422
                )

            session_id = uuid.uuid4().hex[:12]
            code = self._new_code()
            room = {
                "schema": ROOM_SCHEMA,
                "session_id": session_id,
                "code": code,
                "title": _clean_text(title, "title", 60),
                "host_id": host_id,
                "phase": "impressions",
                "revision": 1,
                "created_at": _now(),
                "participants": by_id,
                "impressions": {},
                "game": None,
                "events": [],
            }
            self._append_event(
                room,
                "session-created",
                f"{len(by_id)} 人进入现场房间",
                actor_id=host_id,
            )
            self._rooms[session_id] = room
            self._codes[code] = session_id
            return self._snapshot(room, host_id)

    def join_session(self, code: str, participant: dict) -> dict:
        with self._lock:
            room = self._room_by_code(code)
            person_id = _clean_person_id(participant.get("person_id", ""))
            display_name = _clean_text(
                participant.get("display_name", ""), "display_name", 40
            )
            existing = room["participants"].get(person_id)
            if existing:
                existing["display_name"] = display_name
                existing["avatar_ref"] = participant.get("avatar_ref") or existing["avatar_ref"]
                existing["joined"] = True
                existing["last_seen_at"] = _now()
            else:
                if len(room["participants"]) >= MAX_PARTICIPANTS:
                    raise GroupSessionError("现场房间人数已满", 409)
                if room["phase"] != "impressions":
                    raise GroupSessionError("游戏已开始，不能再加入新参与者", 409)
                if room["impressions"]:
                    raise GroupSessionError("第一印象已经开始，不能再改变现场名单", 409)
                room["participants"][person_id] = {
                    "person_id": person_id,
                    "display_name": display_name,
                    "avatar_ref": participant.get("avatar_ref") or None,
                    "joined": True,
                    "joined_at": _now(),
                    "last_seen_at": _now(),
                    "presence": {"x": 0.0, "z": 0.0, "yaw": 0.0, "seq": 0},
                }
                self._append_event(
                    room,
                    "participant-joined",
                    f"{display_name} 加入了房间",
                    actor_id=person_id,
                )
            room["revision"] += 1
            return self._snapshot(room, person_id)

    def get_session(self, session_id: str, viewer_id: str | None = None) -> dict:
        with self._lock:
            room = self._room(session_id)
            if viewer_id and viewer_id in room["participants"]:
                room["participants"][viewer_id]["last_seen_at"] = _now()
            return self._snapshot(room, viewer_id)

    def update_presence(
        self,
        session_id: str,
        person_id: str,
        seq: int,
        position: dict,
    ) -> dict:
        with self._lock:
            room = self._room(session_id)
            participant = self._participant(room, person_id)
            current = participant["presence"]
            if seq <= current["seq"]:
                raise GroupSessionError(
                    f"位置序号已过期：收到 {seq}，当前为 {current['seq']}", 409
                )
            x = self._finite_number(position.get("x"), "position.x")
            z = self._finite_number(position.get("z"), "position.z")
            yaw = self._finite_number(position.get("yaw", 0), "position.yaw")
            participant["presence"] = {
                "x": max(-POSITION_LIMIT_X, min(POSITION_LIMIT_X, x)),
                "z": max(-POSITION_LIMIT_Z, min(POSITION_LIMIT_Z, z)),
                "yaw": math.atan2(math.sin(yaw), math.cos(yaw)),
                "seq": seq,
            }
            participant["last_seen_at"] = _now()
            room["revision"] += 1
            return self._snapshot(room, person_id)

    def write_impression(
        self,
        session_id: str,
        author_id: str,
        subject_id: str,
        value: str,
    ) -> dict:
        with self._lock:
            room = self._room(session_id)
            if room["phase"] != "impressions":
                raise GroupSessionError("第一印象收集已经结束", 409)
            author = self._participant(room, author_id)
            subject = self._participant(room, subject_id)
            key = f"{author_id}:{subject_id}"
            if key in room["impressions"]:
                raise GroupSessionError("这条第一印象已经提交，不能重复覆盖", 409)
            kind = "self" if author_id == subject_id else "peer"
            impression = {
                "id": uuid.uuid4().hex[:12],
                "session_id": session_id,
                "author_id": author_id,
                "author_name": author["display_name"],
                "subject_id": subject_id,
                "subject_name": subject["display_name"],
                "kind": kind,
                "value": _clean_text(value, "第一印象", MAX_IMPRESSION_LENGTH),
                "source": {
                    "type": "group-session",
                    "session_id": session_id,
                    "room_code": room["code"],
                },
                "created_at": _now(),
            }
            inference_ref = self.store.write_inference(
                subject_id,
                f"group-impression-{session_id}-{author_id}",
                {
                    "schema": IMPRESSION_SCHEMA,
                    "generated": False,
                    "recomputable": True,
                    "impression": impression,
                },
            )
            impression["inference_ref"] = inference_ref
            room["impressions"][key] = impression
            room["revision"] += 1
            progress = self._impression_progress(room)
            self._append_event(
                room,
                "impression-written",
                f"{author['display_name']} 写下了一条第一印象",
            )
            if progress["complete"]:
                self._append_event(room, "impressions-ready", "第一印象已经全部收齐")
            return self._snapshot(room, author_id)

    def write_impressions(
        self,
        session_id: str,
        author_id: str,
        entries: list[dict],
    ) -> dict:
        """整组提交；先完成全部领域校验，避免网络重试留下半组状态。"""
        with self._lock:
            room = self._room(session_id)
            if room["phase"] != "impressions":
                raise GroupSessionError("第一印象收集已经结束", 409)
            self._participant(room, author_id)
            if not entries:
                raise GroupSessionError("第一印象列表不能为空", 422)
            subject_ids = [item.get("subject_id") for item in entries]
            if len(set(subject_ids)) != len(subject_ids):
                raise GroupSessionError("同一位同伴不能在一组中重复出现", 422)
            if set(subject_ids) != set(room["participants"]):
                raise GroupSessionError("整组第一印象必须包含房间里的每一位参与者", 422)
            for item in entries:
                subject_id = item.get("subject_id")
                self._participant(room, subject_id)
                _clean_text(item.get("value", ""), "第一印象", MAX_IMPRESSION_LENGTH)
                if f"{author_id}:{subject_id}" in room["impressions"]:
                    raise GroupSessionError("这一组第一印象已经提交，不能重复覆盖", 409)
            snapshot = None
            for item in entries:
                snapshot = self.write_impression(
                    session_id, author_id, item["subject_id"], item["value"]
                )
            return snapshot

    def start_game(self, session_id: str, actor_id: str) -> dict:
        with self._lock:
            room = self._room(session_id)
            if actor_id != room["host_id"]:
                raise GroupSessionError("只有房主可以开始游戏", 403)
            if room["phase"] != "impressions":
                raise GroupSessionError("游戏已经开始", 409)
            progress = self._impression_progress(room)
            if not progress["complete"]:
                raise GroupSessionError(
                    f"还差 {progress['required'] - progress['submitted']} 条第一印象", 409
                )
            participants = list(room["participants"].values())
            rounds = []
            for subject in participants:
                peer_items = sorted(
                    (
                        item
                        for item in room["impressions"].values()
                        if item["subject_id"] == subject["person_id"]
                        and item["kind"] == "peer"
                    ),
                    key=lambda item: item["author_id"],
                )
                chosen = secrets.choice(peer_items)
                options = [
                    {"person_id": person["person_id"], "display_name": person["display_name"]}
                    for person in participants
                    if person["person_id"] != subject["person_id"]
                ]
                secrets.SystemRandom().shuffle(options)
                rounds.append(
                    {
                        "id": uuid.uuid4().hex[:10],
                        "subject_id": subject["person_id"],
                        "subject_name": subject["display_name"],
                        "guesser_id": subject["person_id"],
                        "impression_id": chosen["id"],
                        "text": chosen["value"],
                        "author_id": chosen["author_id"],
                        "options": options,
                        "guess": None,
                    }
                )
            room["game"] = {
                "schema": "echo-who-wrote-it.v1",
                "status": "playing",
                "round_index": 0,
                "rounds": rounds,
                "scores": {person["person_id"]: 0 for person in participants},
                "started_at": _now(),
                "finished_at": None,
            }
            room["phase"] = "game"
            room["revision"] += 1
            self._append_event(room, "game-started", "谁写的？第一轮开始了")
            return self._snapshot(room, actor_id)

    def submit_guess(
        self,
        session_id: str,
        player_id: str,
        author_id: str,
    ) -> dict:
        with self._lock:
            room = self._room(session_id)
            game = self._active_game(room)
            current = game["rounds"][game["round_index"]]
            if current["guesser_id"] != player_id:
                raise GroupSessionError("还没有轮到你猜", 403)
            if current["guess"] is not None:
                raise GroupSessionError("本轮已经作答", 409)
            option_ids = {option["person_id"] for option in current["options"]}
            if author_id not in option_ids:
                raise GroupSessionError("答案不在本轮候选人中", 422)
            correct = author_id == current["author_id"]
            if correct:
                game["scores"][player_id] += 1
            current["guess"] = {
                "selected_id": author_id,
                "correct": correct,
                "answered_at": _now(),
            }
            player = self._participant(room, player_id)
            author = self._participant(room, current["author_id"])
            self._append_event(
                room,
                "game-guess",
                (
                    f"{player['display_name']} 猜对了：这句话来自 {author['display_name']}"
                    if correct
                    else f"{player['display_name']} 猜错了，答案是 {author['display_name']}"
                ),
                actor_id=player_id,
                subject_id=current["author_id"],
                correct=correct,
            )
            room["revision"] += 1
            return self._snapshot(room, player_id)

    def next_round(self, session_id: str, actor_id: str) -> dict:
        with self._lock:
            room = self._room(session_id)
            if actor_id != room["host_id"]:
                raise GroupSessionError("只有房主可以切换下一轮", 403)
            game = self._active_game(room)
            current = game["rounds"][game["round_index"]]
            if current["guess"] is None:
                raise GroupSessionError("本轮还没有作答", 409)
            if game["round_index"] + 1 < len(game["rounds"]):
                game["round_index"] += 1
                room["revision"] += 1
                self._append_event(
                    room,
                    "game-round",
                    f"第 {game['round_index'] + 1} 轮开始了",
                )
                return self._snapshot(room, actor_id)

            game["status"] = "finished"
            game["finished_at"] = _now()
            room["phase"] = "results"
            for person_id, score in game["scores"].items():
                self.store.write_inference(
                    person_id,
                    f"group-game-result-{session_id}",
                    {
                        "schema": GAME_RESULT_SCHEMA,
                        "generated": False,
                        "recomputable": True,
                        "session_id": session_id,
                        "game": "who-wrote-it",
                        "score": score,
                        "rounds": len(game["rounds"]),
                        "source": {"type": "group-session", "session_id": session_id},
                        "created_at": _now(),
                    },
                )
            self._append_event(room, "game-finished", "第一印象变成了这群人的共同事件")
            room["revision"] += 1
            return self._snapshot(room, actor_id)

    def _snapshot(self, room: dict, viewer_id: str | None) -> dict:
        participants = []
        now = datetime.now(UTC)
        for item in room["participants"].values():
            participant = copy.deepcopy(item)
            last_seen = datetime.fromisoformat(participant["last_seen_at"])
            participant["online"] = (now - last_seen).total_seconds() <= PRESENCE_TTL_SECONDS
            participants.append(participant)
        result = {
            "schema": room["schema"],
            "session_id": room["session_id"],
            "code": room["code"],
            "title": room["title"],
            "host_id": room["host_id"],
            "phase": room["phase"],
            "revision": room["revision"],
            "created_at": room["created_at"],
            "participants": participants,
            "impression_progress": self._impression_progress(room),
            "events": copy.deepcopy(room["events"][-20:]),
            "game": self._game_view(room, viewer_id),
        }
        return result

    def _game_view(self, room: dict, viewer_id: str | None) -> dict | None:
        game = room["game"]
        if not game:
            return None
        view = {
            "schema": game["schema"],
            "status": game["status"],
            "round_index": game["round_index"],
            "round_count": len(game["rounds"]),
            "scores": copy.deepcopy(game["scores"]),
        }
        if game["status"] == "finished":
            view["rounds"] = [self._round_view(item, reveal=True) for item in game["rounds"]]
            return view
        current = game["rounds"][game["round_index"]]
        view["current_round"] = self._round_view(current, reveal=current["guess"] is not None)
        view["can_guess"] = current["guesser_id"] == viewer_id and current["guess"] is None
        return view

    @staticmethod
    def _round_view(round_data: dict, reveal: bool) -> dict:
        result = {
            key: copy.deepcopy(value)
            for key, value in round_data.items()
            if key not in {"author_id", "impression_id"}
        }
        if reveal:
            result["author_id"] = round_data["author_id"]
        return result

    def _impression_progress(self, room: dict) -> dict:
        count = len(room["participants"])
        required = count * count
        by_author = {}
        for person_id in room["participants"]:
            submitted = sum(
                1 for item in room["impressions"].values() if item["author_id"] == person_id
            )
            by_author[person_id] = {"submitted": submitted, "required": count}
        submitted = len(room["impressions"])
        return {
            "submitted": submitted,
            "required": required,
            "complete": submitted == required,
            "by_author": by_author,
        }

    def _new_code(self) -> str:
        for _ in range(20):
            code = "".join(secrets.choice(ROOM_CODE_ALPHABET) for _ in range(6))
            if code not in self._codes:
                return code
        raise GroupSessionError("暂时无法分配房间码，请重试", 503)

    def _room(self, session_id: str) -> dict:
        room = self._rooms.get(session_id)
        if room is None:
            raise GroupSessionError("现场房间不存在或已结束", 404)
        return room

    def _room_by_code(self, code: str) -> dict:
        session_id = self._codes.get(str(code).strip().upper())
        if not session_id:
            raise GroupSessionError("房间码无效", 404)
        return self._room(session_id)

    @staticmethod
    def _participant(room: dict, person_id: str) -> dict:
        participant = room["participants"].get(person_id)
        if participant is None:
            raise GroupSessionError("你不在这个现场房间中", 403)
        return participant

    @staticmethod
    def _active_game(room: dict) -> dict:
        if room["phase"] != "game" or not room["game"]:
            raise GroupSessionError("当前没有进行中的游戏", 409)
        return room["game"]

    @staticmethod
    def _finite_number(value, field: str) -> float:
        try:
            number = float(value)
        except (TypeError, ValueError) as exc:
            raise GroupSessionError(f"{field} 必须是数字", 422) from exc
        if not math.isfinite(number):
            raise GroupSessionError(f"{field} 必须是有限数字", 422)
        return number

    @staticmethod
    def _append_event(room: dict, event_type: str, text: str, **extra) -> None:
        room["events"].append(
            {
                "id": uuid.uuid4().hex[:12],
                "type": event_type,
                "text": text,
                "created_at": _now(),
                **extra,
            }
        )
        if len(room["events"]) > 60:
            del room["events"][:-60]
