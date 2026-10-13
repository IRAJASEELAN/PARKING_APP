const ROUTE_CACHE_TTL_MS = 5 * 60 * 1000;
const routeCache = new Map();
let queue = Promise.resolve();
let nextRequestAt = 0;

function instructionFor(step) {
  const maneuver = step.maneuver || {};
  if (maneuver.instruction) return maneuver.instruction;
  const type = maneuver.type || "continue";
  const modifier = maneuver.modifier ? ` ${maneuver.modifier}` : "";
  const street = step.name ? ` onto ${step.name}` : "";
  if (type === "depart") return `Start${street}`;
  if (type === "arrive") return "Arrive at your destination";
  if (type === "roundabout" || type === "rotary") return `At the roundabout${modifier}${street}`;
  if (type === "merge") return `Merge${modifier}${street}`;
  if (type === "fork") return `Keep${modifier}${street}`;
  if (type === "on ramp") return `Take the ramp${modifier}${street}`;
  if (type === "off ramp") return `Take the exit${modifier}${street}`;
  if (type === "turn" || type === "end of road") return `Turn${modifier}${street}`;
  return `Continue${modifier}${street}`;
}

async function fetchRoute(origin, destination) {
  const endpoint = (process.env.ROUTING_SERVICE_URL || "https://router.project-osrm.org/route/v1/driving").replace(/\/$/, "");
  const coords = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
  const url = new URL(`${endpoint}/${coords}`);
  url.search = new URLSearchParams({ overview: "full", geometries: "geojson", steps: "true", alternatives: "false" }).toString();
  const request = queue.then(async () => {
    const delay = Math.max(0, nextRequestAt - Date.now());
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    nextRequestAt = Date.now() + 1100;
    const response = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "ParkFlow/1.0 (in-app directions)" },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error(`Routing provider returned ${response.status}`);
    return response.json();
  });
  queue = request.catch(() => {});
  const data = await request;
  if (data.code !== "Ok" || !data.routes?.[0]) throw new Error(data.message || "No drivable route found");
  const route = data.routes[0];
  const steps = (route.legs?.[0]?.steps || []).map((step) => ({
    instruction: instructionFor(step),
    distanceMeters: Math.round(step.distance || 0),
    durationSeconds: Math.round(step.duration || 0),
    street: step.name || "",
    maneuver: step.maneuver?.type || "continue",
  }));
  return {
    distanceKm: Number((route.distance / 1000).toFixed(1)),
    durationMinutes: Math.max(1, Math.round(route.duration / 60)),
    geometry: route.geometry,
    steps,
    provider: "OSRM",
    attribution: "© OpenStreetMap contributors · routing by OSRM",
    fetchedAt: new Date().toISOString(),
  };
}

export async function getDrivingRoute(origin, destination) {
  const key = [origin.lat, origin.lng, destination.lat, destination.lng].map((value) => Number(value).toFixed(5)).join(":");
  const cached = routeCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return { ...cached.value, cached: true };
  const value = await fetchRoute(origin, destination);
  routeCache.set(key, { value, expiresAt: Date.now() + ROUTE_CACHE_TTL_MS });
  if (routeCache.size > 300) routeCache.delete(routeCache.keys().next().value);
  return value;
}
