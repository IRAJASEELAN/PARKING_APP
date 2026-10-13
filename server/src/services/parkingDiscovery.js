import { haversineKm } from "./geo.js";

const CACHE_TTL_MS = 15 * 60 * 1000;
const cache = new Map();
const inFlight = new Map();
let queue = Promise.resolve();
let nextRequestAt = 0;
const MIN_REQUEST_GAP_MS = 1100;

function clean(value) { return typeof value === "string" ? value.trim() : ""; }

function makeAddress(tags = {}) {
  const street = [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" ");
  return [street, tags["addr:suburb"] || tags["addr:neighbourhood"], tags["addr:city"]].filter(Boolean).join(", ");
}

function pointOf(element) {
  if (Number.isFinite(element.lat) && Number.isFinite(element.lon)) return { lat: element.lat, lng: element.lon };
  if (Number.isFinite(element.center?.lat) && Number.isFinite(element.center?.lon)) return { lat: element.center.lat, lng: element.center.lon };
  return null;
}

async function queryOverpass(lat, lng, radiusMeters) {
  const endpoint = process.env.PARKING_SEARCH_URL || "https://overpass-api.de/api/interpreter";
  const query = `[out:json][timeout:18];(node[amenity=parking](around:${radiusMeters},${lat},${lng});way[amenity=parking](around:${radiusMeters},${lat},${lng});relation[amenity=parking](around:${radiusMeters},${lat},${lng}););out center;`;
  const request = queue.then(async () => {
    const delay = Math.max(0, nextRequestAt - Date.now());
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    nextRequestAt = Date.now() + MIN_REQUEST_GAP_MS;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        "User-Agent": "ParkFlow/1.0 (OpenStreetMap parking discovery)",
      },
      body: new URLSearchParams({ data: query }),
      signal: AbortSignal.timeout(22000),
    });
    if (!response.ok) throw new Error(`Parking discovery provider returned ${response.status}`);
    return response.json();
  });
  queue = request.catch(() => {});
  return request;
}

export async function discoverParking({ lat, lng, radiusKm = 5 }) {
  const radius = Math.min(15, Math.max(1, Number(radiusKm) || 5));
  const key = `${Number(lat).toFixed(3)}:${Number(lng).toFixed(3)}:${radius}`;
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return { ...cached.value, cached: true };
  if (inFlight.has(key)) return inFlight.get(key);

  const search = (async () => {
    const result = await queryOverpass(Number(lat), Number(lng), Math.round(radius * 1000));
    if (!Array.isArray(result.elements)) throw new Error("Parking discovery provider returned invalid data");
    const seen = new Set();
    const facilities = result.elements.flatMap((element) => {
      const tags = element.tags || {};
      if (tags.access === "private" || tags.access === "no") return [];
      const point = pointOf(element);
      if (!point) return [];
      const id = `osm-${element.type}-${element.id}`;
      if (seen.has(id)) return [];
      seen.add(id);
      const distanceKm = Number(haversineKm(Number(lng), Number(lat), point.lng, point.lat).toFixed(2));
      return [{
        id,
        name: clean(tags.name) || (tags.parking === "multi-storey" ? "Multi-storey parking" : "Parking area"),
        address: makeAddress(tags),
        lat: point.lat,
        lng: point.lng,
        distanceKm,
        access: clean(tags.access) || "public access not specified",
        fee: clean(tags.charge) || (tags.fee === "yes" ? "Fee applies; amount not listed" : tags.fee === "no" ? "No fee listed" : "Fee not listed"),
        openingHours: clean(tags.opening_hours) || null,
        parkingType: clean(tags.parking) || "parking",
        source: "OpenStreetMap",
        sourceUrl: `https://www.openstreetmap.org/${element.type}/${element.id}`,
        directionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${point.lat},${point.lng}`,
        availability: "unknown",
        price: null,
        reservable: false,
      }];
    }).sort((a, b) => a.distanceKm - b.distanceKm);
    const value = { facilities, count: facilities.length, source: "OpenStreetMap", attribution: "© OpenStreetMap contributors", fetchedAt: new Date().toISOString() };
    cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
    if (cache.size > 250) cache.delete(cache.keys().next().value);
    return value;
  })();
  inFlight.set(key, search);
  try { return await search; }
  finally { inFlight.delete(key); }
}
