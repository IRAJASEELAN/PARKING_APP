import { Lot } from "../models/Lot.js";

export function validateOccupancyReport({ occupied, totalSpots, observedAt, lastUpdated = null, now = Date.now() }) {
  if (!Number.isInteger(occupied) || occupied < 0 || occupied > totalSpots) return { status: 400, message: "Reported occupancy must fit within facility capacity" };
  const timestamp = new Date(observedAt);
  if (Number.isNaN(timestamp.getTime()) || timestamp.getTime() > now + 2 * 60 * 1000 || timestamp.getTime() < now - 15 * 60 * 1000) return { status: 400, message: "Occupancy observation must be no more than 15 minutes old" };
  if (lastUpdated && timestamp <= new Date(lastUpdated)) return { status: 409, message: "A newer occupancy update is already recorded" };
  return null;
}
class SimulationOccupancyProvider {
  async refresh() {
    const now = new Date();
    const lots = await Lot.find({ isDemoData: true });
    for (const lot of lots) {
      if (lot.reservationClaims?.some((claim) => claim.status === "active")) continue;
      const drift = Math.floor(Math.random() * 5) - 2;
      lot.occupied = Math.min(lot.totalSpots, Math.max(0, lot.occupied + drift));
      lot.occupancySource = "simulation";
      lot.occupancyUpdatedAt = now;
      await lot.save();
    }
  }
}

class ManualOccupancyProvider {
  async refresh() { /* Operator reports and admin corrections update inventory directly. */ }
}

class UnconfiguredOccupancyProvider {
  async refresh() { /* Connect an operator sensor or camera feed before enabling live occupancy. */ }
}

const mode = process.env.OCCUPANCY_PROVIDER || (process.env.NODE_ENV === "production" ? "manual" : "simulation");
const provider = mode === "simulation" && process.env.NODE_ENV !== "production"
  ? new SimulationOccupancyProvider()
  : mode === "sensor" || mode === "camera"
    ? new UnconfiguredOccupancyProvider()
    : new ManualOccupancyProvider();

export const occupancyService = { mode, refresh: () => provider.refresh() };

