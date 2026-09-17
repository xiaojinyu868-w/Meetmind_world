# Independent implementation review · 2026-09-16

Scope: AppUI, EventClient, EventStore, HTTP/WebSocket service, SceneManifest/Importer/Startup/Registry. Read-only review of main and deployment configuration. The final software/browser evidence below supplements the original implementation review; it does not replace physical NFC or target-phone performance verification.

## Corrected in this review

- Public entry/double-device/stage URLs now retain sceneManifest and scene only; remove badge, code, persona, capture, debug, quality and old mode before creating new entry parameters.
- Default stage QR uses the same sanitized URL builder, so imported shared scenes do not silently become the default campus for attendees.
- Startup JSON reads enforce the 64 KB limit while streaming and cancel oversized reads; Content-Length is checked early. Invalid JSON produces a specific error.
- Successful scene import is not treated as failed when browser localStorage refuses to persist the preference.

## Verified implementation evidence

- npm test: 51/51 passed.
- npm run build: passed.
- 14 Happy DOM integration tests use real HTTP/WebSocket EventClient/server flows and cover UI races, evidence rendering, fresh persona links, shared scene URLs and preference-storage failure.
- API and static build remain isolated from the original EchoWorld service and data.
- GLB fixture parsed by real GLTFLoader in Node; PLY/SPZ structural checks passed. Separately, the GLB and SPZ fixtures were loaded and visibly rendered in a real browser. These fixtures are procedural test assets, not Marble exports.

## Original findings resolved in the current source

1. Scene preference storage is now isolated in a local try/catch after successful scene installation. A localStorage SecurityError no longer disposes the installed scene.
2. Attendee selection prioritizes the current identity and newest participants when the snapshot exceeds 80 participants, instead of always selecting the first 80. This review does not claim a measured capacity limit or a validated hard cap for large events.

## Real browser and recording acceptance

- Desktop viewport: 1440 × 900. Responsive viewport checks: 390 × 844 and 492 × 898. Actual WebGL architecture, courtyard and characters were visible. These are browser viewport checks, not measurements on physical phones.
- Two isolated sessions completed avatar claiming, evidence-based recommendations, encounter initiation and confirmation by the other participant. Identity and confirmed relationship remained after changing to the water gallery scene.
- Procedural GLB/SPZ fixtures were visibly imported. Final real Marble exports still require calibration and testing.
- The opt-in `?capture` toolbar recorded real WebGL video and exported WebM. It uses canvas.captureStream and MediaRecorder, does not request screen permissions, and records only the 3D canvas. The normal product entry does not show this toolbar.
- Each recording has a 35-second cap, playback preview and downloadable WebM. The optional in-page Data URL backup is cleared on restart/disposal and is not uploaded to the server.
- Final media target: `Echo-Campus-Showcase.mp4`, 97 seconds of real canvas footage and actual interface screenshots with DashScope narration. The older `Echo-Campus-97s-preview.mp4` remains explicitly labeled a visual reference and flow illustration.

## Production boundaries retained

- Fixed demo credentials do not authenticate real event identities; public entry intentionally creates synthetic demo identities.
- Reverse-proxy clients currently share the proxy IP request budget (12 joins/minute, 240 reads/minute, 40 writes/minute). Suitable for a few-device pitch; event-wide rollout requires per-client trusted proxy configuration and capacity testing.
- Avatar movement is local, not broadcast; shared state is identities, profiles and confirmed relationships.
- PLY/SPZ path is dynamically loaded; the compressed Spark module is substantial. Verify real target phones and the final asset.
- Front-end styling imports Google Fonts with local fallback. Restricted networks can fall back to system fonts; visual output may differ.
- Source matches/profile evidence fields agree with server DTO. Pending encounters are private to their two participants; public snapshot contains only confirmed relationships and no session/card credentials.

## Final delivery verification

The final 97-second film, seven-page PDF, five-page DOCX and scene guide are published through public/showcase.html. Final encoded frames were visually reviewed; full decode passed. See DELIVERY-QA.md and artifacts/release for evidence. The final scene URL input regression was reproduced, fixed, and passed in real browser use.
