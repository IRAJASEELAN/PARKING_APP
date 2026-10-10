import test from "node:test";
import assert from "node:assert/strict";
import { rankLots } from "./recommendations.js";
import { calculatePrice, calculateQuote, createReservationWindow } from "./reservationRules.js";
import { haversineKm } from "./geo.js";

test("ranking returns bounded scores and transparent reasons", () => {
  const [best, other] = rankLots([
    { name: "near", totalSpots: 100, occupied: 10, rates: { hourly: 40 }, safetyScore: 4.8, driverRating: 4.7, reservable: true, amenities: ["cctv"], distanceKm: 0.5 },
    { name: "far", totalSpots: 100, occupied: 98, rates: { hourly: 100 }, safetyScore: 3, driverRating: 3.5, reservable: false, amenities: [], distanceKm: 8 },
  ]);
  assert.ok(best.score >= 0 && best.score <= 100);
  assert.equal(best.name, "near");
  assert.ok(best.reasons.some((reason) => reason.includes("spaces available")));
  assert.ok(other.score >= 0 && other.score <= 100);
});

test("reservation windows reject invalid duration and past start", () => {
  const now = new Date("2026-10-06T10:00:00Z");
  assert.match(createReservationWindow("2026-10-06T11:00:00Z", 0, now).error, /duration/);
  assert.match(createReservationWindow("2026-10-06T09:00:00Z", 1, now).error, /start time/);
  assert.equal(createReservationWindow("2026-10-06T11:00:00Z", 2, now).endDate.toISOString(), "2026-10-06T13:00:00.000Z");
});

test("pricing honors additional hours and daily maximum", () => {
  assert.equal(calculatePrice({ rates: { firstHour: 60, additional: 40, dailyMax: 200 } }, 3), 140);
  assert.equal(calculatePrice({ rates: { firstHour: 60, additional: 40, dailyMax: 100 } }, 4), 100);
});

test("distance calculation returns zero for the same point and kilometers for Chennai lots", () => {
  assert.equal(haversineKm(80.2601, 13.0537, 80.2601, 13.0537), 0);
  const km = haversineKm(80.2601, 13.0537, 80.2341, 13.0418);
  assert.ok(km > 2 && km < 4);
});
test("parking quote includes a transparent service fee in the total", () => {
  assert.deepEqual(calculateQuote({ rates: { firstHour: 50, additional: 25, dailyMax: 200 } }, 2, 15), { parkingFee: 75, serviceFee: 15, total: 90, currency: "INR" });
});

