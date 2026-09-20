// Source inspection and event performance use distinct, traceable assets.
export function eventVenueUrl(id, baseUrl) {
  if (!["venue-ab-canopy", "venue-ab-towers", "venue-c"].includes(id)) throw new Error("未知活动模型");
  return new URL(`./scenes/venue/${id}-event.glb`, baseUrl).href;
}

export async function loadVenueAsset({ id, manifest, view, baseUrl, importer, onFallback = () => {} }) {
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
