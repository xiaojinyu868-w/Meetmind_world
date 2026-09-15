# Independent implementation review · 2026-09-16

Scope: AppUI, EventClient, EventStore, HTTP/WebSocket service, SceneManifest/Importer/Startup/Registry. Read-only review of main and deployment configuration. This record does not replace browser/GPU or physical NFC verification.

## Corrected in this review

- Public entry/double-device/stage URLs now retain sceneManifest and scene only; remove badge, code, persona, capture, debug, quality and old mode before creating new entry parameters.
- Default stage QR uses the same sanitized URL builder, so imported shared scenes do not silently become the default campus for attendees.
- Startup JSON reads enforce the 64 KB limit while streaming and cancel oversized reads; Content-Length is checked early. Invalid JSON produces a specific error.
- Successful scene import is not treated as failed when browser localStorage refuses to persist the preference.

## Verified implementation evidence

- npm test: 43/43 passed.
- npm run build: passed.
- 12 Happy DOM integration tests use real HTTP/WebSocket EventClient/server flows and cover UI races, evidence rendering, fresh persona links, shared scene URLs and preference-storage failure.
- API and static build remain isolated from the original EchoWorld service and data.
- GLB fixture parsed by real GLTFLoader in Node; PLY/SPZ structural checks passed. No GPU render claim follows from those tests.

## Findings handed to main owner

1. Main switchScene writes localStorage after replacing and disposing the previous scene. A storage SecurityError can enter the broad catch and dispose the newly installed current scene. Persisting preferences must be isolated from successful scene installation.
2. Main syncPeople uses the first 80 attendees. Repeated public demo joins can accumulate beyond that; the newest guest and eventually the current participant may not render. Keep a rendering budget but prioritize self and newest participants, and avoid implying off-budget participants can be located.

## Production boundaries retained

- Fixed demo credentials do not authenticate real event identities; public entry intentionally creates synthetic demo identities.
- Reverse-proxy clients currently share the proxy IP request budget (12 joins/minute, 240 reads/minute, 40 writes/minute). Suitable for a few-device pitch; event-wide rollout requires per-client trusted proxy configuration and capacity testing.
- Avatar movement is local, not broadcast; shared state is identities, profiles and confirmed relationships.
- PLY/SPZ path is dynamically loaded; the compressed Spark module is substantial. Verify real target phones and the final asset.
- Front-end styling imports Google Fonts with local fallback. Restricted networks can fall back to system fonts; visual output may differ.
- Source matches/profile evidence fields agree with server DTO. Pending encounters are private to their two participants; public snapshot contains only confirmed relationships and no session/card credentials.
