"""Thread-safe, deterministic room service for the MVP 2.0 slice."""

from __future__ import annotations

import copy
import json
import math
import threading
import uuid
from typing import Any

from app.agents.contracts import EventEnvelope
from app.domain.rooms.models import Hotspot, Member, RoomState
from app.eventing import EventStore

WORLD_BOUND = 20.0
MAX_REPLAY_EVENTS = 500
MAX_MESSAGE_DISTANCE = 3.0
MAX_CONVERSATION_MESSAGES = 40
AGENT_VISIT_STEP = 1.2


class RoomError(Exception):
    """A stable domain error that the HTTP adapter can translate."""

    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


class RoomService:
    """Owns room state, event order, command idempotency, and meeting rules."""

    def __init__(
        self, *, icebreaker_feedback=None, auto_bulletin: bool = True,
        event_store: EventStore | None = None, state_repository=None,
        interaction_recorder=None,
    ):
        self._rooms: dict[str, RoomState] = {}
        self._lock = threading.RLock()
        self._icebreaker_feedback = icebreaker_feedback
        self._auto_bulletin = auto_bulletin
        self._event_store = event_store or EventStore()
        self._state_repository = state_repository
        self._interaction_recorder = interaction_recorder
        if self._state_repository is not None:
            self._rooms = {
                room.room_id: room for room in self._state_repository.load_all()
            }

    def create_room(
        self,
        *,
        name: str,
        room_id: str | None = None,
        hotspots: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        with self._lock:
            resolved_id = room_id or f"room-{uuid.uuid4().hex[:12]}"
            if resolved_id in self._rooms:
                raise RoomError("room_exists", f"Room '{resolved_id}' already exists")
            parsed = self._parse_hotspots(hotspots)
            room = RoomState(room_id=resolved_id, name=name.strip(), hotspots=parsed)
            self._rooms[resolved_id] = room
            self._append_event(
                room,
                "room.created",
                {
                    "name": room.name,
                    "hotspots": [spot.as_dict() for spot in parsed.values()],
                },
            )
            self._persist(room)
            return self._snapshot(room)

    def join_room(
        self,
        room_id: str,
        *,
        member_id: str,
        display_name: str,
        position: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        with self._lock:
            room = self._room(room_id)
            existing = room.members.get(member_id)
            if existing is not None:
                if existing.display_name != display_name.strip():
                    raise RoomError(
                        "member_conflict",
                        f"Member '{member_id}' is already joined with another name",
                    )
                return {
                    "joined": False,
                    "member": existing.as_dict(),
                    "sequence": room.sequence,
                }
            x, z = self._position(position or {"x": 0.0, "z": 0.0})
            member = Member(member_id, display_name.strip(), x, z)
            room.members[member_id] = member
            if member_id != "person-self":
                room.agent_runtime.setdefault(member_id, {
                    "agent_id": member_id,
                    "goal": "maintain-relationships",
                    "status": "idle",
                    "last_action": None,
                    "last_target_id": None,
                    "last_sequence": None,
                })
            event = self._append_event(
                room,
                "member.joined",
                {"member": member.as_dict()},
                actor_id=member_id,
            )
            self._persist(room)
            return {
                "joined": True,
                "member": member.as_dict(),
                "sequence": room.sequence,
                "event": event,
            }

    def snapshot(self, room_id: str) -> dict[str, Any]:
        with self._lock:
            return self._snapshot(self._room(room_id))

    def room_ids(self) -> tuple[str, ...]:
        with self._lock:
            return tuple(sorted(self._rooms))

    def request_agent_turn(self, room_id: str, agent_id: str, *, cycle: int) -> dict[str, Any]:
        """Commit one server-owned observation that may activate exactly one Agent."""
        with self._lock:
            room = self._room(room_id)
            self._member(room, agent_id)
            event = self._append_event(
                room, "agent.autonomy-requested",
                {"cycle": cycle, "goal": "maintain-relationships"},
                actor_id="system.scheduler", subject_id=agent_id,
                command_id=f"autonomy-{room_id}-{cycle}-{agent_id}",
            )
            self._persist(room)
            return event

    def events_after(
        self, room_id: str, *, after_sequence: int = 0, limit: int = 100
    ) -> list[dict[str, Any]]:
        with self._lock:
            bounded_limit = max(1, min(int(limit), MAX_REPLAY_EVENTS))
            self._room(room_id)
            return [self._wire_event(event) for event in self._event_store.replay(
                room_id, after_sequence=after_sequence, limit=bounded_limit,
            )]

    def brief(self, room_id: str, *, after_sequence: int = 0) -> dict[str, Any]:
        """Deterministic morning-brief fallback over committed semantic events."""
        events = self.events_after(room_id, after_sequence=after_sequence, limit=500)
        visible = [event for event in events if event["type"] in {
            "member.joined", "meeting.started", "meeting.ended",
            "icebreaker.finished", "bulletin.published", "memory.updated",
        }]
        labels = {
            "member.joined": "新成员进入现场",
            "meeting.started": "圆桌会议开始",
            "meeting.ended": "圆桌会议结束",
            "icebreaker.finished": "破冰活动完成",
            "bulletin.published": "发布世界播报",
            "memory.updated": "互动数据已回流",
        }
        return {
            "schema": "meetmind.morning-brief.v1",
            "room_id": room_id,
            "after_sequence": after_sequence,
            "through_sequence": self.snapshot(room_id)["sequence"],
            "event_count": len(visible),
            "items": [
                {"sequence": event["sequence"], "type": event["type"],
                 "text": labels[event["type"]], "source_event_id": event["event_id"]}
                for event in visible[-20:]
            ],
            "text": "；".join(labels[event["type"]] for event in visible[-5:])
                    or "暂无新事件",
        }

    def execute(
        self,
        room_id: str,
        *,
        command_id: str,
        actor_id: str,
        command_type: str,
        payload: dict[str, Any] | None = None,
        expected_revision: int | None = None,
    ) -> dict[str, Any]:
        payload = copy.deepcopy(payload or {})
        fingerprint = json.dumps(
            {"actor_id": actor_id, "type": command_type, "payload": payload,
             "expected_revision": expected_revision},
            sort_keys=True,
            separators=(",", ":"),
            ensure_ascii=True,
        )
        with self._lock:
            room = self._room(room_id)
            receipt = room.command_receipts.get(command_id)
            if receipt is not None:
                if receipt["fingerprint"] != fingerprint:
                    raise RoomError(
                        "command_id_conflict",
                        "command_id was already used for a different command",
                    )
                replay = copy.deepcopy(receipt["response"])
                replay["replayed"] = True
                return replay
            if expected_revision is not None and expected_revision != room.sequence:
                raise RoomError(
                    "revision_conflict",
                    f"Expected room revision {expected_revision}, current is {room.sequence}",
                )
            handler = {
                "member.move": self._move_member,
                "agent.move": self._move_member,
                "agent.visit": self._agent_visit,
                "hotspot.interact": self._interact_with_hotspot,
                "meeting.invite": self._invite_meeting,
                "meeting.respond": self._respond_meeting,
                "meeting.start": self._start_meeting,
                "meeting.end": self._end_meeting,
                "roundtable.propose-topic": self._propose_meeting_topic,
                "bulletin.publish": self._publish_bulletin,
                "icebreaker.request": self._request_icebreaker,
                "icebreaker.start": self._start_icebreaker,
                "icebreaker.submit": self._submit_icebreaker,
                "icebreaker.finish": self._finish_icebreaker,
                "person.message": self._message_person,
                "agent.talk": self._agent_talk,
            }.get(command_type)
            if handler is None:
                raise RoomError("unknown_command", f"Unsupported command '{command_type}'")
            system_commands = {
                "roundtable.propose-topic", "bulletin.publish", "icebreaker.start",
            }
            if command_type not in system_commands or not actor_id.startswith("system."):
                self._member(room, actor_id)
            events = handler(room, actor_id, command_id, payload)
            response = {
                "accepted": True,
                "replayed": False,
                "command_id": command_id,
                "sequence": room.sequence,
                "events": events,
            }
            room.command_receipts[command_id] = {
                "fingerprint": fingerprint,
                "response": copy.deepcopy(response),
            }
            self._persist(room)
            return response

    def _message_person(
        self, room: RoomState, actor_id: str, command_id: str, payload: dict[str, Any]
    ) -> list[dict[str, Any]]:
        target_id = str(payload.get("target_id") or "").strip()
        target = self._member(room, target_id)
        text = str(payload.get("text") or "").strip()
        if not text or len(text) > 500:
            raise RoomError("invalid_command", "message text must contain 1-500 characters")
        if target_id == actor_id:
            raise RoomError("invalid_command", "A member cannot message themselves")
        actor = self._member(room, actor_id)
        if math.hypot(actor.x - target.x, actor.z - target.z) > MAX_MESSAGE_DISTANCE:
            raise RoomError("outside_interaction_range", "Members must be near each other to start a conversation")
        conversation_id = str(
            payload.get("conversation_id")
            or "conversation-" + "-".join(sorted((actor_id, target_id)))
        )
        conversation = room.conversations.setdefault(conversation_id, {
            "conversation_id": conversation_id,
            "participant_ids": sorted((actor_id, target_id)),
            "turn_count": 0,
            "status": "active",
            "last_message": None,
            "messages": [],
        })
        if set(conversation["participant_ids"]) != {actor_id, target_id}:
            raise RoomError("conversation_conflict", "conversation_id belongs to other members")
        conversation.setdefault("messages", [])
        conversation["turn_count"] += 1
        conversation["status"] = "active"
        conversation["last_message"] = {"speaker_id": actor_id, "text": text}
        event = self._append_event(
            room, "person.message-requested",
            {
                "conversation_id": conversation_id,
                "target_id": target.member_id,
                "prompt": text,
                "turn": conversation["turn_count"],
            },
            actor_id=actor_id, subject_id=target_id, command_id=command_id,
        )
        self._append_conversation_message(conversation, actor_id, text, event["sequence"])
        self._record_relationship_turn(room, actor_id, target_id, event["sequence"])
        if self._interaction_recorder is not None:
            self._interaction_recorder(actor_id, target_id)
        self._set_agent_action(room, actor_id, "talking", "initiate-talk", target_id,
                               event["sequence"])
        return [event]

    def _agent_talk(
        self, room: RoomState, actor_id: str, command_id: str, payload: dict[str, Any]
    ) -> list[dict[str, Any]]:
        listener_id = str(payload.get("target_id") or "").strip()
        self._member(room, actor_id)
        self._member(room, listener_id)
        text = str(payload.get("text") or "").strip()
        if not text or len(text) > 500:
            raise RoomError("invalid_command", "talk text must contain 1-500 characters")
        conversation_id = str(payload.get("conversation_id") or "").strip()
        conversation = room.conversations.get(conversation_id)
        if conversation is None or set(conversation["participant_ids"]) != {actor_id, listener_id}:
            raise RoomError("conversation_not_found", "Conversation was not found")
        conversation.setdefault("messages", [])
        conversation["turn_count"] += 1
        conversation["last_message"] = {"speaker_id": actor_id, "text": text}
        event = self._append_event(
            room, "person.message-created",
            {
                "conversation_id": conversation_id,
                "speaker_id": actor_id,
                "listener_id": listener_id,
                "text": text,
                "turn": conversation["turn_count"],
            },
            actor_id=actor_id, subject_id=listener_id, command_id=command_id,
        )
        self._append_conversation_message(conversation, actor_id, text, event["sequence"])
        self._record_relationship_turn(room, actor_id, listener_id, event["sequence"])
        self._set_agent_action(room, actor_id, "idle", "reply", listener_id,
                               event["sequence"])
        return [event]

    def _move_member(
        self, room: RoomState, actor_id: str, command_id: str, payload: dict[str, Any]
    ) -> list[dict[str, Any]]:
        member = self._member(room, actor_id)
        x, z = self._position(payload)
        member.x, member.z = x, z
        event = self._append_event(
                room,
                "member.moved",
                {"member_id": actor_id, "position": {"x": x, "z": z}},
                actor_id=actor_id,
                command_id=command_id,
            )
        self._set_agent_action(room, actor_id, "moving", "move", None, event["sequence"])
        return [event]

    def _agent_visit(
        self, room: RoomState, actor_id: str, command_id: str, payload: dict[str, Any]
    ) -> list[dict[str, Any]]:
        member = self._member(room, actor_id)
        target_id = str(payload.get("target_id") or "").strip()
        target = self._member(room, target_id)
        if target_id == actor_id:
            raise RoomError("invalid_command", "An Agent cannot visit itself")
        dx, dz = target.x - member.x, target.z - member.z
        distance = math.hypot(dx, dz)
        if distance <= MAX_MESSAGE_DISTANCE * 0.72:
            return []
        step = min(AGENT_VISIT_STEP, max(0.0, distance - MAX_MESSAGE_DISTANCE * 0.68))
        member.x += dx / distance * step
        member.z += dz / distance * step
        event = self._append_event(
            room, "member.moved",
            {"member_id": actor_id, "position": {"x": member.x, "z": member.z},
             "reason": "agent-visit", "target_id": target_id},
            actor_id=actor_id, subject_id=target_id, command_id=command_id,
        )
        self._set_agent_action(room, actor_id, "moving", "visit", target_id,
                               event["sequence"])
        return [event]

    def _interact_with_hotspot(
        self, room: RoomState, actor_id: str, command_id: str, payload: dict[str, Any]
    ) -> list[dict[str, Any]]:
        hotspot = self._require_hotspot(room, actor_id, payload.get("hotspot_id"))
        action = payload.get("action")
        if action not in hotspot.allowed_actions:
            raise RoomError(
                "hotspot_action_denied",
                f"Action '{action}' is not available at hotspot '{hotspot.hotspot_id}'",
            )
        return [
            self._append_event(
                room,
                "hotspot.interacted",
                {"hotspot_id": hotspot.hotspot_id, "action": action},
                actor_id=actor_id,
                command_id=command_id,
            )
        ]

    def _invite_meeting(
        self, room: RoomState, actor_id: str, command_id: str, payload: dict[str, Any]
    ) -> list[dict[str, Any]]:
        if room.active_meeting is not None:
            raise RoomError("meeting_active", "A meeting is already active in this room")
        hotspot = self._require_hotspot(
            room, actor_id, payload.get("hotspot_id", "roundtable")
        )
        requested = payload.get("participant_ids")
        if not isinstance(requested, list):
            raise RoomError("invalid_command", "participant_ids must be a list")
        participant_ids = [actor_id] + sorted(
            {item for item in requested if isinstance(item, str) and item != actor_id}
        )
        if len(participant_ids) < 2:
            raise RoomError("invalid_command", "A meeting requires at least two members")
        for member_id in participant_ids:
            self._member(room, member_id)
        invitation_id = str(payload.get("invitation_id") or f"invite-{room.sequence + 1}")
        if invitation_id in room.invitations:
            raise RoomError("invitation_exists", f"Invitation '{invitation_id}' already exists")
        topic = str(payload.get("topic") or "Open discussion").strip()[:120]
        invitation = {
            "invitation_id": invitation_id,
            "organizer_id": actor_id,
            "participant_ids": participant_ids,
            "topic": topic,
            "hotspot_id": hotspot.hotspot_id,
            "status": "invited",
            "responses": {actor_id: "accepted"},
        }
        room.invitations[invitation_id] = invitation
        events = [
            self._append_event(
                room,
                "meeting.invited",
                copy.deepcopy(invitation),
                actor_id=actor_id,
                command_id=command_id,
            )
        ]
        # Agent 成员即时应邀（MVP 产品决策：会议由用户发起，应邀不应阻塞在
        # 自治心跳上；人类成员仍需自己 respond）。应邀即走向圆桌站位环，
        # 与 _respond_meeting 的 accept 分支完全同源。
        # NPC 判定与 RoomConductor 一致（成员 - person-self）；人类成员
        #（当前仅 person-self）仍需自己到场。
        for member_id in invitation["participant_ids"]:
            if member_id == "person-self":
                continue
            events.extend(self._accept_invitation(room, invitation, member_id, command_id))
        return events

    def _respond_meeting(
        self, room: RoomState, actor_id: str, command_id: str, payload: dict[str, Any]
    ) -> list[dict[str, Any]]:
        invitation_id = payload.get("invitation_id")
        invitation = room.invitations.get(str(invitation_id))
        if invitation is None:
            raise RoomError("invitation_not_found", "Meeting invitation was not found")
        if actor_id not in invitation["participant_ids"]:
            raise RoomError("meeting_forbidden", "Only invited members may respond")
        response = payload.get("response")
        if response not in {"accepted", "declined"}:
            raise RoomError("invalid_command", "response must be accepted or declined")
        invitation["responses"][actor_id] = response
        if response == "declined":
            invitation["status"] = "declined"
            return [
                self._append_event(
                    room,
                    "meeting.invitation-responded",
                    {"invitation_id": invitation_id, "member_id": actor_id,
                     "response": response, "status": invitation["status"]},
                    actor_id=actor_id,
                    command_id=command_id,
                )
            ]
        return self._accept_invitation(room, invitation, actor_id, command_id)

    def _accept_invitation(
        self, room: RoomState, invitation: dict[str, Any], actor_id: str, command_id: str
    ) -> list[dict[str, Any]]:
        """应邀的统一结算：记录响应、全员接受后推进状态、应邀者走向圆桌站位环。

        人类成员经 meeting.respond 到达这里；Agent 成员由 _invite_meeting 即时
        自动应邀时也走同一条路径（幂等：重复 accept 只刷新站位）。"""
        invitation_id = invitation["invitation_id"]
        invitation["responses"][actor_id] = "accepted"
        if all(
            invitation["responses"].get(member_id) == "accepted"
            for member_id in invitation["participant_ids"]
        ):
            invitation["status"] = "accepted"
        response_event = self._append_event(
                room,
                "meeting.invitation-responded",
                {"invitation_id": invitation_id, "member_id": actor_id,
                 "response": "accepted", "status": invitation["status"]},
                actor_id=actor_id,
                command_id=command_id,
            )
        events = [response_event]
        if actor_id != invitation["organizer_id"]:
            hotspot = room.hotspots[invitation["hotspot_id"]]
            participant_index = invitation["participant_ids"].index(actor_id)
            angle = math.tau * participant_index / len(invitation["participant_ids"])
            radius = min(1.4, hotspot.radius * 0.55)
            member = self._member(room, actor_id)
            member.x = hotspot.x + math.sin(angle) * radius
            member.z = hotspot.z + math.cos(angle) * radius
            move_event = self._append_event(
                room, "member.moved",
                {"member_id": actor_id,
                 "position": {"x": member.x, "z": member.z},
                 "reason": "meeting-arrival", "invitation_id": invitation_id},
                actor_id=actor_id, command_id=command_id,
            )
            events.append(move_event)
            self._set_agent_action(room, actor_id, "meeting", "accept-meeting",
                                   invitation["organizer_id"], move_event["sequence"])
        return events

    def _start_meeting(
        self, room: RoomState, actor_id: str, command_id: str, payload: dict[str, Any]
    ) -> list[dict[str, Any]]:
        if room.active_meeting is not None:
            raise RoomError("meeting_active", "A meeting is already active in this room")
        invitation_id = payload.get("invitation_id")
        if not isinstance(invitation_id, str) or not invitation_id.strip():
            raise RoomError("invalid_command", "invitation_id must be a non-empty string")
        invitation = room.invitations.get(invitation_id)
        if invitation is None:
            raise RoomError("invitation_not_found", "Meeting invitation was not found")
        if invitation["organizer_id"] != actor_id:
            raise RoomError("meeting_forbidden", "Only the organizer can start the meeting")
        if invitation["status"] != "accepted":
            raise RoomError("invalid_meeting_state", "All invitees must accept before start")
        hotspot = room.hotspots[invitation["hotspot_id"]]
        for member_id in invitation["participant_ids"]:
            member = self._member(room, member_id)
            if not hotspot.contains(member.x, member.z):
                raise RoomError(
                    "member_outside_hotspot",
                    f"Member '{member_id}' is outside hotspot '{hotspot.hotspot_id}'",
                )
        meeting_id = str(payload.get("meeting_id") or f"meeting-{invitation_id}")
        room.active_meeting = {
            "meeting_id": meeting_id,
            "invitation_id": invitation_id,
            "organizer_id": actor_id,
            "participant_ids": list(invitation["participant_ids"]),
            "topic": invitation["topic"],
            "hotspot_id": hotspot.hotspot_id,
            "status": "active",
        }
        invitation["status"] = "active"
        event = self._append_event(
                room,
                "meeting.started",
                copy.deepcopy(room.active_meeting),
                actor_id=actor_id,
                command_id=command_id,
            )
        participants = room.active_meeting["participant_ids"]
        for index, person_a in enumerate(participants):
            self._set_agent_action(room, person_a, "meeting", "join-meeting",
                                   actor_id, event["sequence"])
            for person_b in participants[index + 1:]:
                self._record_shared_meeting(room, person_a, person_b, event["sequence"])
        return [event]

    def _end_meeting(
        self, room: RoomState, actor_id: str, command_id: str, payload: dict[str, Any]
    ) -> list[dict[str, Any]]:
        meeting = room.active_meeting
        if meeting is None:
            raise RoomError("meeting_not_active", "There is no active meeting")
        if meeting["organizer_id"] != actor_id:
            raise RoomError("meeting_forbidden", "Only the organizer can end the meeting")
        requested_id = payload.get("meeting_id")
        if requested_id is not None and requested_id != meeting["meeting_id"]:
            raise RoomError("meeting_not_found", "Active meeting id does not match")
        return self._finish_meeting(room, actor_id, command_id)

    def system_end_meeting(self, room_id: str, *, reason: str = "system") -> dict[str, Any] | None:
        """系统侧散会（conductor 超时清理等）：绕过 organizer 校验，事件演员记为
        system.conductor。无进行中会议返回 None。"""
        with self._lock:
            room = self._room(room_id)
            if room.active_meeting is None:
                return None
            events = self._finish_meeting(room, "system.conductor", f"system-end-{room.sequence + 1}")
            self._persist(room)
            return {"ended": True, "reason": reason, "events": events}

    def apply_conductor_plan(self, room_id: str, plan: dict[str, Any]) -> None:
        """应用生活指挥（RoomConductor）的一拍计划：会议时间戳/散会、Agent 走位
        与状态。整个计划在锁内原子落地并只持久化一次；机制在此，策略在
        app/agents/room_conductor.py。"""
        with self._lock:
            room = self._room(room_id)
            meeting = room.active_meeting
            started_at = plan.get("meeting_started_at")
            if meeting is not None and started_at is not None and "started_at" not in meeting:
                meeting["started_at"] = float(started_at)
            if plan.get("end_meeting") and room.active_meeting is not None:
                self._finish_meeting(room, "system.conductor", f"conductor-end-{room.sequence + 1}")
            statuses = plan.get("statuses") or {}
            for member_id, position in (plan.get("moves") or {}).items():
                member = room.members.get(member_id)
                if member is None:
                    continue
                x, z = float(position["x"]), float(position["z"])
                if math.hypot(member.x - x, member.z - z) < 1e-6:
                    continue
                member.x, member.z = x, z
                self._append_event(
                    room,
                    "member.moved",
                    {"member_id": member_id,
                     "position": {"x": x, "z": z, "yaw": float(position.get("yaw", 0.0))},
                     "reason": "conductor"},
                    actor_id="system.conductor", subject_id=member_id,
                    command_id=f"conductor-move-{room.sequence + 1}-{member_id}",
                )
            for member_id, status in statuses.items():
                if member_id not in room.members:
                    continue
                # 历史房间缺条目的成员（agent_runtime 特性之前 join 的）在此补建，
                # 默认值与 join_room 保持一致
                runtime = room.agent_runtime.setdefault(member_id, {
                    "agent_id": member_id,
                    "goal": "maintain-relationships",
                    "status": "idle",
                    "last_action": None,
                    "last_target_id": None,
                    "last_sequence": None,
                })
                runtime.update({
                    "status": status["status"],
                    "last_action": status.get("action"),
                    "last_target_id": status.get("target_id"),
                    "last_sequence": room.sequence,
                })
                if "yaw" in status:
                    runtime["yaw"] = float(status["yaw"])
                if status.get("seat"):
                    runtime["seat"] = dict(status["seat"])
                else:
                    runtime.pop("seat", None)
            self._persist(room)

    def _finish_meeting(
        self, room: RoomState, actor_id: str, command_id: str
    ) -> list[dict[str, Any]]:
        meeting = room.active_meeting
        ended = copy.deepcopy(meeting)
        ended["status"] = "ended"
        ended_event = self._append_event(
            room,
            "meeting.ended",
            ended,
            actor_id=actor_id,
            command_id=command_id,
        )
        for participant_id in meeting["participant_ids"]:
            self._set_agent_action(room, participant_id, "idle", "leave-meeting",
                                   None, ended_event["sequence"])
        invitation = room.invitations[meeting["invitation_id"]]
        invitation["status"] = "ended"
        bulletin = {
            "bulletin_id": f"bulletin-{meeting['meeting_id']}",
            "meeting_id": meeting["meeting_id"],
            "topic": meeting["topic"],
            "participant_ids": list(meeting["participant_ids"]),
            "text": (
                f"Roundtable '{meeting['topic']}' ended with "
                f"{len(meeting['participant_ids'])} participants."
            ),
        }
        room.active_meeting = None
        if not self._auto_bulletin:
            return [ended_event]
        room.bulletins.append(bulletin)
        bulletin_event = self._append_event(
            room, "bulletin.published", copy.deepcopy(bulletin),
            actor_id=actor_id, command_id=command_id,
        )
        return [ended_event, bulletin_event]

    def _propose_meeting_topic(
        self, room: RoomState, actor_id: str, command_id: str, payload: dict[str, Any]
    ) -> list[dict[str, Any]]:
        meeting = room.active_meeting
        if meeting is None:
            raise RoomError("meeting_not_active", "There is no active meeting")
        if payload.get("meeting_id") != meeting["meeting_id"]:
            raise RoomError("meeting_not_found", "Active meeting id does not match")
        text = str(payload.get("text") or "").strip()
        if not text or len(text) > 500:
            raise RoomError("invalid_command", "topic text must contain 1-500 characters")
        return [self._append_event(
            room, "meeting.topic-proposed",
            {"meeting_id": meeting["meeting_id"], "text": text,
             "participant_count": payload.get("participant_count")},
            actor_id=actor_id, command_id=command_id,
        )]

    def _publish_bulletin(
        self, room: RoomState, actor_id: str, command_id: str, payload: dict[str, Any]
    ) -> list[dict[str, Any]]:
        bulletin_id = str(payload.get("bulletin_id") or "").strip()
        text = str(payload.get("text") or "").strip()
        if not bulletin_id or not text or len(text) > 500:
            raise RoomError("invalid_command", "bulletin requires id and 1-500 character text")
        if any(item.get("bulletin_id") == bulletin_id for item in room.bulletins):
            return []
        bulletin = copy.deepcopy(payload)
        room.bulletins.append(bulletin)
        return [self._append_event(
            room, "bulletin.published", bulletin,
            actor_id=actor_id, command_id=command_id,
        )]

    def _request_icebreaker(
        self, room: RoomState, actor_id: str, command_id: str, payload: dict[str, Any]
    ) -> list[dict[str, Any]]:
        if room.icebreaker is not None and room.icebreaker.get("status") == "active":
            raise RoomError("icebreaker_active", "An icebreaker is already active")
        requested = payload.get("participant_ids") or sorted(room.members)
        if not isinstance(requested, list):
            raise RoomError("invalid_command", "participant_ids must be a list")
        participant_ids = sorted({item for item in requested if isinstance(item, str)})
        if actor_id not in participant_ids:
            participant_ids.insert(0, actor_id)
        if len(participant_ids) < 2:
            raise RoomError("invalid_command", "An icebreaker requires at least two members")
        for member_id in participant_ids:
            self._member(room, member_id)
        return [self._append_event(
            room, "icebreaker.requested",
            {"session_id": payload.get("session_id"),
             "participant_ids": participant_ids,
             "game_type": payload.get("game_type") or "three-words",
             "prompt": payload.get("prompt")},
            actor_id=actor_id, command_id=command_id,
        )]

    def _start_icebreaker(
        self, room: RoomState, actor_id: str, command_id: str, payload: dict[str, Any]
    ) -> list[dict[str, Any]]:
        if room.icebreaker is not None and room.icebreaker.get("status") == "active":
            raise RoomError("icebreaker_active", "An icebreaker is already active")
        requested = payload.get("participant_ids")
        if requested is None:
            participant_ids = sorted(room.members)
        elif isinstance(requested, list):
            participant_ids = sorted({item for item in requested if isinstance(item, str)})
        else:
            raise RoomError("invalid_command", "participant_ids must be a list")
        organizer_id = str(payload.get("requested_by") or actor_id)
        self._member(room, organizer_id)
        if organizer_id not in participant_ids:
            participant_ids.insert(0, organizer_id)
        if len(participant_ids) < 2:
            raise RoomError("invalid_command", "An icebreaker requires at least two members")
        for member_id in participant_ids:
            self._member(room, member_id)
        session_id = str(payload.get("session_id") or f"icebreaker-{room.sequence + 1}")
        prompt = str(payload.get("prompt") or "用三个词描述今天认识的一位伙伴").strip()
        if not prompt or len(prompt) > 300:
            raise RoomError("invalid_command", "prompt must contain 1-300 characters")
        room.icebreaker = {
            "session_id": session_id,
            "game_type": str(payload.get("game_type") or "three-words"),
            "organizer_id": organizer_id,
            "participant_ids": participant_ids,
            "prompt": prompt,
            "submissions": {},
            "status": "active",
        }
        return [
            self._append_event(
                room, "icebreaker.started",
                {key: copy.deepcopy(value) for key, value in room.icebreaker.items()
                 if key != "submissions"},
                actor_id=actor_id, command_id=command_id,
            )
        ]

    def _submit_icebreaker(
        self, room: RoomState, actor_id: str, command_id: str, payload: dict[str, Any]
    ) -> list[dict[str, Any]]:
        session = room.icebreaker
        if session is None or session.get("status") != "active":
            raise RoomError("icebreaker_not_active", "There is no active icebreaker")
        if actor_id not in session["participant_ids"]:
            raise RoomError("icebreaker_forbidden", "Member is not in this icebreaker")
        answer = str(payload.get("answer") or "").strip()
        if not answer or len(answer) > 500:
            raise RoomError("invalid_command", "answer must contain 1-500 characters")
        session["submissions"][actor_id] = answer
        return [
            self._append_event(
                room, "icebreaker.submitted",
                {"session_id": session["session_id"], "member_id": actor_id,
                 "answer": answer},
                actor_id=actor_id, command_id=command_id,
            )
        ]

    def _finish_icebreaker(
        self, room: RoomState, actor_id: str, command_id: str, payload: dict[str, Any]
    ) -> list[dict[str, Any]]:
        session = room.icebreaker
        if session is None or session.get("status") != "active":
            raise RoomError("icebreaker_not_active", "There is no active icebreaker")
        if session["organizer_id"] != actor_id:
            raise RoomError("icebreaker_forbidden", "Only the organizer can finish")
        if len(session["submissions"]) < 2:
            raise RoomError("icebreaker_incomplete", "At least two submissions are required")
        session["status"] = "finished"
        finished = copy.deepcopy(session)
        event = self._append_event(
            room, "icebreaker.finished", finished,
            actor_id=actor_id, command_id=command_id,
        )
        bulletin = {
            "bulletin_id": f"bulletin-{session['session_id']}",
            "icebreaker_id": session["session_id"],
            "participant_ids": list(session["participant_ids"]),
            "text": f"破冰活动完成，收到 {len(session['submissions'])} 份现场反馈。",
        }
        room.bulletins.append(bulletin)
        bulletin_event = self._append_event(
            room, "bulletin.published", copy.deepcopy(bulletin),
            actor_id=actor_id, command_id=command_id,
        )
        events = [event, bulletin_event]
        if self._icebreaker_feedback is not None:
            feedback = self._icebreaker_feedback.record(room.room_id, finished)
            events.append(self._append_event(
                room, "memory.updated", feedback,
                actor_id="system", command_id=command_id,
            ))
        return events

    def publish_system_event(
        self, room_id: str, event_type: str, payload: dict[str, Any], *, command_id: str,
    ) -> dict[str, Any]:
        if event_type not in {"memory.updated", "field.generated"}:
            raise RoomError("system_event_denied", f"Unsupported system event '{event_type}'")
        with self._lock:
            room = self._room(room_id)
            event = self._append_event(
                room, event_type, copy.deepcopy(payload),
                actor_id="system", command_id=command_id,
            )
            self._persist(room)
            return event

    def attach_generated_events(
        self, room_id: str, command_id: str, events: list[dict[str, Any]], sequence: int,
    ) -> None:
        """Extend the original command receipt so retries return Agent descendants."""
        if not events:
            return
        with self._lock:
            room = self._room(room_id)
            receipt = room.command_receipts.get(command_id)
            if receipt is None:
                return
            receipt["response"]["events"].extend(copy.deepcopy(events))
            receipt["response"]["sequence"] = sequence
            self._persist(room)

    def _persist(self, room: RoomState) -> None:
        if self._state_repository is not None:
            self._state_repository.save(room)

    def _append_event(
        self,
        room: RoomState,
        event_type: str,
        payload: dict[str, Any],
        *,
        actor_id: str | None = None,
        subject_id: str | None = None,
        command_id: str | None = None,
    ) -> dict[str, Any]:
        event = self._event_store.append(EventEnvelope(
            room_id=room.room_id,
            type=event_type,
            payload=copy.deepcopy(payload),
            actor_id=actor_id,
            subject_id=subject_id,
            command_id=command_id,
        ))
        room.sequence = event.sequence or room.sequence
        return self._wire_event(event)

    @staticmethod
    def _wire_event(event: EventEnvelope) -> dict[str, Any]:
        return event.model_dump(mode="json", by_alias=True)

    def _snapshot(self, room: RoomState) -> dict[str, Any]:
        return {
            "schema": "meetmind.room-snapshot.v1",
            "room_id": room.room_id,
            "name": room.name,
            "sequence": room.sequence,
            "members": [room.members[key].as_dict() for key in sorted(room.members)],
            "hotspots": [room.hotspots[key].as_dict() for key in sorted(room.hotspots)],
            "meeting": copy.deepcopy(room.active_meeting),
            "icebreaker": copy.deepcopy(room.icebreaker),
            "invitations": [
                copy.deepcopy(room.invitations[key]) for key in sorted(room.invitations)
            ],
            "bulletins": copy.deepcopy(room.bulletins),
            "conversations": [
                copy.deepcopy(room.conversations[key]) for key in sorted(room.conversations)
            ],
            "relationships": [
                copy.deepcopy(room.relationships[key]) for key in sorted(room.relationships)
            ],
            "agent_runtime": [
                copy.deepcopy(room.agent_runtime[key]) for key in sorted(room.agent_runtime)
            ],
        }

    @staticmethod
    def _append_conversation_message(
        conversation: dict[str, Any], speaker_id: str, text: str, sequence: int,
    ) -> None:
        messages = conversation.setdefault("messages", [])
        messages.append({
            "turn": conversation["turn_count"], "speaker_id": speaker_id,
            "text": text, "sequence": sequence,
        })
        if len(messages) > MAX_CONVERSATION_MESSAGES:
            del messages[:-MAX_CONVERSATION_MESSAGES]

    @staticmethod
    def _relationship(room: RoomState, person_a: str, person_b: str) -> dict[str, Any]:
        participants = sorted((person_a, person_b))
        relationship_id = "relationship-" + "--".join(participants)
        return room.relationships.setdefault(relationship_id, {
            "relationship_id": relationship_id,
            "participant_ids": participants,
            "interaction_count": 0,
            "conversation_turn_count": 0,
            "shared_meeting_count": 0,
            "last_interaction_sequence": None,
        })

    def _record_relationship_turn(
        self, room: RoomState, person_a: str, person_b: str, sequence: int,
    ) -> None:
        relation = self._relationship(room, person_a, person_b)
        relation["conversation_turn_count"] += 1
        relation["interaction_count"] += 1
        relation["last_interaction_sequence"] = sequence

    def _record_shared_meeting(
        self, room: RoomState, person_a: str, person_b: str, sequence: int,
    ) -> None:
        relation = self._relationship(room, person_a, person_b)
        relation["shared_meeting_count"] += 1
        relation["interaction_count"] += 1
        relation["last_interaction_sequence"] = sequence

    @staticmethod
    def _set_agent_action(
        room: RoomState, agent_id: str, status: str, action: str,
        target_id: str | None, sequence: int,
    ) -> None:
        runtime = room.agent_runtime.get(agent_id)
        if runtime is None:
            return
        runtime.update({
            "status": status, "last_action": action,
            "last_target_id": target_id, "last_sequence": sequence,
        })

    def _room(self, room_id: str) -> RoomState:
        room = self._rooms.get(room_id)
        if room is None:
            raise RoomError("room_not_found", f"Room '{room_id}' was not found")
        return room

    @staticmethod
    def _member(room: RoomState, member_id: str) -> Member:
        member = room.members.get(member_id)
        if member is None:
            raise RoomError("member_not_found", f"Member '{member_id}' was not found")
        return member

    def _require_hotspot(
        self, room: RoomState, actor_id: str, hotspot_id: Any
    ) -> Hotspot:
        hotspot = room.hotspots.get(str(hotspot_id))
        if hotspot is None:
            raise RoomError("hotspot_not_found", f"Hotspot '{hotspot_id}' was not found")
        member = self._member(room, actor_id)
        if not hotspot.contains(member.x, member.z):
            distance = math.hypot(member.x - hotspot.x, member.z - hotspot.z)
            raise RoomError(
                "outside_hotspot",
                f"Member '{actor_id}' is {distance:.2f}m from hotspot '{hotspot.hotspot_id}'",
            )
        return hotspot

    @staticmethod
    def _position(value: dict[str, Any]) -> tuple[float, float]:
        try:
            x, z = float(value["x"]), float(value["z"])
        except (KeyError, TypeError, ValueError):
            raise RoomError("invalid_position", "Position requires numeric x and z") from None
        if not math.isfinite(x) or not math.isfinite(z):
            raise RoomError("invalid_position", "Position must be finite")
        if abs(x) > WORLD_BOUND or abs(z) > WORLD_BOUND:
            raise RoomError("position_out_of_bounds", "Position is outside room bounds")
        return x, z

    @staticmethod
    def _parse_hotspots(values: list[dict[str, Any]] | None) -> dict[str, Hotspot]:
        source = values or [
            {
                "hotspot_id": "roundtable",
                "label": "Roundtable",
                "x": 0.0,
                "z": 0.0,
                "radius": 2.4,
                "allowed_actions": ["invite_meeting", "join_meeting"],
            },
            {
                "hotspot_id": "bulletin",
                "label": "Bulletin board",
                "x": 4.0,
                "z": -3.0,
                "radius": 1.5,
                "allowed_actions": ["read_bulletin"],
            },
        ]
        parsed: dict[str, Hotspot] = {}
        for item in source:
            hotspot_id = str(item.get("hotspot_id") or "").strip()
            if not hotspot_id or hotspot_id in parsed:
                raise RoomError("invalid_hotspot", "Hotspot ids must be unique and non-empty")
            try:
                x = float(item.get("x", item.get("position", {}).get("x")))
                z = float(item.get("z", item.get("position", {}).get("z")))
                radius = float(item["radius"])
            except (KeyError, TypeError, ValueError):
                raise RoomError("invalid_hotspot", "Hotspot geometry is invalid") from None
            actions = item.get("allowed_actions")
            if radius <= 0 or not math.isfinite(radius) or not isinstance(actions, list):
                raise RoomError("invalid_hotspot", "Hotspot radius/actions are invalid")
            parsed[hotspot_id] = Hotspot(
                hotspot_id=hotspot_id,
                label=str(item.get("label") or hotspot_id),
                x=x,
                z=z,
                radius=radius,
                allowed_actions=tuple(str(action) for action in actions),
            )
        return parsed
