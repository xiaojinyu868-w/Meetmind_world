const GROUP_SCHEMA = "echo-group-room.v1";


function apiBase() {
  return `${import.meta.env.BASE_URL}api/v0/group`;
}


async function requestJson(path, options = {}) {
  const response = await fetch(`${apiBase()}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  if (!response.ok) {
    throw new Error(payload?.detail ?? `现场房间请求失败（HTTP ${response.status}）`);
  }
  if (!payload || payload.schema !== GROUP_SCHEMA) {
    throw new Error(`现场房间返回了不兼容的数据版本：${payload?.schema ?? "unknown"}`);
  }
  return payload;
}


export class GroupRoomClient {
  constructor({ pollMs = 700 } = {}) {
    this.pollMs = Math.max(400, pollMs);
    this.presenceSeq = 0;
    this.pollTimer = null;
    this.polling = false;
    this.stopped = true;
  }

  createSession(payload) {
    return requestJson("/sessions", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  joinSession(code, participant) {
    return requestJson("/sessions/join", {
      method: "POST",
      body: JSON.stringify({ code, participant }),
    });
  }

  getSession(sessionId, viewerId) {
    const params = new URLSearchParams();
    if (viewerId) params.set("viewer_id", viewerId);
    return requestJson(`/sessions/${encodeURIComponent(sessionId)}?${params}`);
  }

  updatePresence(sessionId, personId, position) {
    this.presenceSeq = Math.max(this.presenceSeq + 1, Date.now());
    return requestJson(`/sessions/${encodeURIComponent(sessionId)}/presence`, {
      method: "PUT",
      body: JSON.stringify({ person_id: personId, seq: this.presenceSeq, position }),
    });
  }

  writeImpression(sessionId, authorId, subjectId, value) {
    return requestJson(`/sessions/${encodeURIComponent(sessionId)}/impressions`, {
      method: "PUT",
      body: JSON.stringify({ author_id: authorId, subject_id: subjectId, value }),
    });
  }

  writeImpressions(sessionId, authorId, impressions) {
    return requestJson(`/sessions/${encodeURIComponent(sessionId)}/impressions/batch`, {
      method: "PUT",
      body: JSON.stringify({ author_id: authorId, impressions }),
    });
  }

  startGame(sessionId, actorId) {
    return requestJson(`/sessions/${encodeURIComponent(sessionId)}/game/start`, {
      method: "POST",
      body: JSON.stringify({ actor_id: actorId }),
    });
  }

  submitGuess(sessionId, playerId, authorId) {
    return requestJson(`/sessions/${encodeURIComponent(sessionId)}/game/guess`, {
      method: "POST",
      body: JSON.stringify({ player_id: playerId, author_id: authorId }),
    });
  }

  nextRound(sessionId, actorId) {
    return requestJson(`/sessions/${encodeURIComponent(sessionId)}/game/next`, {
      method: "POST",
      body: JSON.stringify({ actor_id: actorId }),
    });
  }

  startPolling(sessionId, viewerIdProvider, onSnapshot, onError) {
    this.stopPolling();
    this.stopped = false;
    const poll = async () => {
      if (this.stopped || this.polling) return;
      this.polling = true;
      try {
        const snapshot = await this.getSession(sessionId, viewerIdProvider());
        onSnapshot(snapshot);
      } catch (error) {
        onError?.(error);
      } finally {
        this.polling = false;
        if (!this.stopped) this.pollTimer = window.setTimeout(poll, this.pollMs);
      }
    };
    void poll();
  }

  stopPolling() {
    this.stopped = true;
    this.polling = false;
    window.clearTimeout(this.pollTimer);
    this.pollTimer = null;
  }
}
