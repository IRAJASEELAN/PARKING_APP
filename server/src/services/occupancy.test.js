import test from "node:test";
import assert from "node:assert/strict";
import { validateOccupancyReport } from "./occupancy.js";

const now = Date.parse("2026-10-10T10:00:00.000Z");

test("occupancy reports accept fresh counts within facility capacity", () => {
  assert.equal(validateOccupancyReport({ occupied: 40, totalSpots: 100, observedAt: new Date(now - 60_000), now }), null);
});

test("occupancy reports reject over-capacity counts", () => {
  assert.equal(validateOccupancyReport({ occupied: 101, totalSpots: 100, observedAt: new Date(now), now }).status, 400);
});

test("occupancy reports reject stale, future, and out-of-order observations", () => {
  assert.equal(validateOccupancyReport({ occupied: 10, totalSpots: 100, observedAt: new Date(now - 16 * 60_000), now }).status, 400);
  assert.equal(validateOccupancyReport({ occupied: 10, totalSpots: 100, observedAt: new Date(now + 3 * 60_000), now }).status, 400);
  assert.equal(validateOccupancyReport({ occupied: 10, totalSpots: 100, observedAt: new Date(now - 60_000), lastUpdated: new Date(now), now }).status, 409);
});
