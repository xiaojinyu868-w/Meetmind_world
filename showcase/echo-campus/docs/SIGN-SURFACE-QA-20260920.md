# Sign surface flicker fix - 2026-09-20

## Cause and change

The wooden wayfinding backing is beveled: its actual front is z=0.11 m rather than the nominal 0.085 m. The printed face was also at 0.11 m, producing coplanar depth fighting. Activity checkpoint faces had only 2 mm clearance and also cast/received shadows on both sides.

Both sign families now place print surfaces 8 mm outside the actual geometry bounds. Each print plane faces outward, uses a small polygon offset, and does not cast or receive shadows. The solid backing retains shadows. Depth testing and writing remain enabled, so foreground objects still occlude signs normally. Layout and checkpoint interaction IDs are unchanged.

## Verification

- `npm test`: 139/139 passed, including four new sign tests.
- Real batched, beveled guide backing in all three venue manifests: nine ray samples per print surface measured 8 mm clearance.
- Front/back activity faces: outward normals, backface culling, depth test/write, shadow policy checked.
- Production preview build and `git diff --check` passed.
- Chromium at 1000 x 800: before/after matching viewpoints reproduced the old wood-over-print corruption and showed clear corrected lettering.
- Two six-second continuous camera sweeps with 20 sampled frames, plus front/back/oblique snapshots. No recurrence observed in inspected frames.
- All three venues sampled at 3, 12 and 30 m. Some distant views naturally occlude signs behind architecture; no depth override was introduced.
- Checkpoint click still opens the activity panel. Browser runtime errors: 0 in the successful sweep run.
- A simultaneous MediaRecorder QA attempt terminated its Chromium process. Verification was rerun successfully without recording; no completed video is claimed for this fix.

Local evidence: `output/sign-fix-20260920/{before,after,sweep}` and `comparison.png` in the Windows working directory. GPU/browser coverage is limited to this Chromium run; this is not a claim about every device.

## Deployment boundary

Only the independent `showcase/echo-campus` frontend and its distribution are changed. No backend data, Nginx, original EchoWorld distribution, or unrelated service is modified.
