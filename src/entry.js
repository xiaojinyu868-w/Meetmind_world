// Existing shared links and embedded callers keep their world, room and invite semantics.
const params = new URLSearchParams(location.search);
const legacy = ["world", "scene", "character", "invite", "person", "view", "screen", "room", "api", "mode", "mobile", "pair", "groupScreen", "role", "groupCode", "groupFacilitator", "groupPlayer", "groupRoom", "tag"];
if (window.__ECHOWORLD_OPTIONS__ || legacy.some((key) => params.has(key))) {
  document.body.classList.add("legacy-world");
  import("./main.js");
} else {
  import("./photo-world/World.js");
}
