const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MIN_REQUEST_GAP_MS = 1100;
const cache = new Map();
const inFlight = new Map();
let queue = Promise.resolve();
let nextRequestAt = 0;

function remember(key, value) {
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  if (cache.size > 500) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
}

async function lookup(url) {
  const request = queue.then(async () => {
    const delay = Math.max(0, nextRequestAt - Date.now());
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    nextRequestAt = Date.now() + MIN_REQUEST_GAP_MS;
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "ParkFlow/1.0 (user-requested place search; https://openstreetmap.org/copyright)",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`Place search provider returned ${response.status}`);
    return response.json();
  });
  queue = request.catch(() => {});
  return request;
}

export async function searchPlaces(rawQuery) {
  const query = String(rawQuery || "").trim().replace(/\s+/g, " ");
  const key = query.toLocaleLowerCase();
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  if (cached) cache.delete(key);
  if (inFlight.has(key)) return inFlight.get(key);

  const search = (async () => {
    const endpoint = process.env.GEOCODER_SEARCH_URL || "https://nominatim.openstreetmap.org/search";
    const url = new URL(endpoint);
    url.search = new URLSearchParams({ q: query, format: "jsonv2", addressdetails: "1", limit: "6", "accept-language": "en" }).toString();
    const response = await lookup(url);
    if (!Array.isArray(response)) throw new Error("Place search provider returned an invalid response");
    const results = response.map((place) => ({
      id: `${place.osm_type || "place"}-${place.osm_id || place.place_id}`,
      label: place.name || place.display_name?.split(",")[0] || "Place",
      displayName: place.display_name || place.name || "",
      lat: Number(place.lat),
      lng: Number(place.lon),
      source: "OpenStreetMap",
    })).filter((place) => Number.isFinite(place.lat) && Number.isFinite(place.lng));
    remember(key, results);
    return results;
  })();
  inFlight.set(key, search);
  try { return await search; }
  finally { inFlight.delete(key); }
}
