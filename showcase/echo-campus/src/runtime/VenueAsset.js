import { applyVenueSurfaceDepth } from "./VenueSurfaceDepth.js";

// Single-building event assets are derivatives; the assembled campus is already prepared.
export function eventVenueUrl(id, baseUrl) {
  if (id === "venue-campus") return new URL("./scenes/venue/venue-campus.glb", baseUrl).href;
  if (!["venue-ab-canopy", "venue-ab-towers", "venue-c"].includes(id)) throw new Error("未知活动模型");
  return new URL(`./scenes/venue/${id}-event.glb`, baseUrl).href;
}

export async function loadVenueAsset({ id, manifest, view, baseUrl, importer, onFallback = () => {} }) {
  if (id === "venue-campus") {
    const result = await importer(manifest);
    const surfaceDepth = applyVenueSurfaceDepth(result.root);
    const disposeImported = result.dispose;
    let disposed = false;
    result.surfaceDepth = surfaceDepth;
    result.dispose = function (...args) {
      if (disposed) return;
      disposed = true;
      try { surfaceDepth.dispose(); } finally { disposeImported?.apply(result, args); }
    };
    result.venueAsset = { mode: view === "event" ? "event" : "source", prefiltered: true, url: manifest.url };
    return result;
  }
  if (view !== "event") {
    const result = await importer(manifest);
    result.venueAsset = { mode: "source", prefiltered: false, url: manifest.url };
    return result;
  }
  const url = eventVenueUrl(id, baseUrl);
  try {
    const result = await importer({ ...manifest, url });
    result.venueAsset = { mode: "event", prefiltered: true, url };
    return result;
  } catch (error) {
    // A missing derivative must not hide the supplied architecture.
    onFallback(error);
    const result = await importer(manifest);
    result.venueAsset = { mode: "event", prefiltered: false, url: manifest.url, fallback: true };
    return result;
  }
}
