export function directionsPath(place) {
  const params = new URLSearchParams({
    lat: String(place.lat),
    lng: String(place.lng),
    name: place.name || "Parking destination",
    address: place.address || "",
  });
  return `/app/directions?${params.toString()}`;
}
