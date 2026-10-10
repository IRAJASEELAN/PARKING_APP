# ParkFlow architecture

The existing React/Vite client remains under `client/`; the Express/Mongoose API remains under `server/`.

## Request flow

- React Router mounts public account pages and a protected application shell.
- `AuthContext` stores the JWT and safe profile; Axios adds the bearer token.
- `SearchContext` stores the selected destination, browser location, filters, and current checkout.
- Browser geolocation is accessed through `client/src/location.js`. Users can choose a database-backed sample facility or pin a coordinate on the map.
- `GET /api/lots` applies server filters, computes Haversine distance, then applies the weighted recommendation service. The score is an explainable demo heuristic.
- Reservations use an embedded, atomic per-facility claim array to avoid concurrent overbooking without requiring MongoDB transactions. Claims expire for unpaid holds and are released on cancel/end.
- Occupancy updates go through `OccupancyService`. Development uses the simulation provider; production is intentionally unconfigured until a real provider is connected.
- Admin and analytics endpoints use both JWT authentication and server-side role checks.

## Current boundaries

- ParkFlow records the amount due and any on-site payment reported by facility staff; it does not process payments.
- Facility records, facility ratings, and occupancy are demo/sample data. Safety details are not independently verified.
- Navigation shows a direct-line preview and estimated drive time; road routing is not configured.
- Parking slots are modeled and can be managed by admins, but reservations still claim lot capacity rather than assigning a slot.
- QR codes contain only a reservation identifier and random booking reference; verification checks both against MongoDB.
- Password reset stores a one-hour token hash. A mail provider and reset-link UI remain to be configured; development logs a token for manual testing.
