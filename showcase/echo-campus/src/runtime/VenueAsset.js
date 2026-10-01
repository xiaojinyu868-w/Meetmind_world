// Single-building event assets are derivatives; the assembled campus is already prepared.
export function eventVenueUrl(id, baseUrl) {
  if (id === "venue-campus") return new URL("./scenes/venue/venue-campus.glb", baseUrl).href;
  if (!["venue-ab-canopy", "venue-ab-towers", "venue-c"].includes(id)) throw new Error("未知活动模型");
  return new URL(`./scenes/venue/${id}-event.glb`, baseUrl).href;
}

// Phone guests get the courtyard crop of the assembled campus: every triangle
// within 90 m of the HUB south entrance (~8 MB gzip instead of ~35 MB).
export const COURT_VARIANT = Object.freeze({ path: "./scenes/venue/venue-campus-court.glb?v=court90-20261002", radius: 90 });

export async function loadVenueAsset({ id, manifest, view, baseUrl, importer, onFallback = () => {}, light = false }) {
  if (id === "venue-campus") {
    if (light && view === "event") {
      const url = new URL(COURT_VARIANT.path, baseUrl).href;
      try {
        const result = await importer({ ...manifest, url });
        result.venueAsset = { mode: "event", prefiltered: true, url, light: true };
        return result;
      } catch (error) {
        onFallback(error);
      }
    }
    const result = await importer(manifest);
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
