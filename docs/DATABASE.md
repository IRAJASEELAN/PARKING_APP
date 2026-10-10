# Database notes

## User

Stores normalized email, bcrypt password hash, role (`driver` or `admin`), saved places, vehicles, preferences, and an optional active reservation lock. Safe user responses omit password and reset-token fields. Reset tokens are hashed and expire.

## Lot

Stores a GeoJSON Point, rates, sample amenities/ratings, total and occupied capacity, vehicle types, and whether the record is demo data. `reservationClaims` is embedded so the capacity check and claim append happen as one atomic document update.

## Reservation

References its user and lot; stores the requested interval, selected saved vehicle, lifecycle status, backend-calculated base amount, hold expiry, random booking reference, and QR payload. An index supports lot/time/status overlap queries.

## ParkingSlot

Incremental model keyed by `(lotId, slotNumber)`. It stores floor, section, vehicle type, status (`AVAILABLE`, `OCCUPIED`, `RESERVED`, `MAINTENANCE`), and optional sensor ID. It is not yet assigned to a reservation.

## Seed data

`server/src/seed.js` upserts sample Chennai facilities by name instead of deleting unrelated lots. Demo admin creation is optional and uses `PARKFLOW_ADMIN_EMAIL` and `PARKFLOW_ADMIN_PASSWORD`.
