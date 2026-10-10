import { createContext, useContext, useMemo, useState } from "react";
import { getCurrentCoordinates } from "./location.js";

const SearchContext = createContext(null);
const defaultFilters = { maxPrice: 200, walkMin: 5, availableNow: true, reservable: false, vehicle: "car", amenities: [], hours: "anytime" };

export function SearchProvider({ children }) {
  const [destination, setDestination] = useState({ label: "T. Nagar, Chennai", query: "T. Nagar", lat: 13.0418, lng: 80.2341 });
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState("");
  const [filters, setFilters] = useState(defaultFilters);
  const [checkout, setCheckout] = useState(null);

  async function useCurrentLocation() {
    setLocationError("");
    try {
      const point = await getCurrentCoordinates();
      setUserLocation(point);
      setDestination({ ...point, label: "Current location", query: "" });
      return point;
    } catch (error) {
      setLocationError(error.message);
      throw error;
    }
  }

  const value = useMemo(() => ({ destination, setDestination, userLocation, locationError, useCurrentLocation, filters, setFilters, resetFilters: () => setFilters(defaultFilters), checkout, setCheckout }), [destination, userLocation, locationError, filters, checkout]);
  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

export function useSearch() { return useContext(SearchContext); }
