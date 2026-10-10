export function getCurrentCoordinates() {
  if (!navigator.geolocation) return Promise.reject(new Error("Location is unavailable in this browser."));
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ lat: coords.latitude, lng: coords.longitude }),
      (error) => reject(new Error(error.code === 1 ? "Location permission was denied." : "Could not get your location. Try selecting a point on the map.")),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  });
}
