# ParkFlow API

Base URL in development: `http://localhost:5000`. JSON errors use `{ "success": false, "message": "..." }`. Authenticated routes require `Authorization: Bearer <token>`.

## Authentication

### `POST /api/auth/register`

Request: `{ "name": "Ananya Rao", "email": "ananya@example.com", "password": "at-least-8-chars" }`

Returns `201` with `{ "success": true, "token": "<jwt>", "user": { "id": "...", "role": "driver" } }`. Passwords are bcrypt-hashed. Registration always creates a driver account.

### `POST /api/auth/login`

Request: `{ "email": "ananya@example.com", "password": "..." }`. Returns a JWT and safe user profile. Invalid credentials return `401`.

### `POST /api/auth/forgot` and `POST /api/auth/reset`

Forgot request: `{ "email": "ananya@example.com" }`. The response does not reveal whether the account exists. Email delivery is not configured; development emits a one-hour reset token to the server console. Reset request: `{ "token": "...", "password": "at-least-8-chars" }`. Stored reset tokens are hashed and expire.

## Place search

### `GET /api/geocode?q=Marina%20Beach`

Returns up to six India place/address matches with coordinates. The user submits a complete query; the app does not send keystroke autocomplete requests. The default provider is OpenStreetMap Nominatim, with a server-side 24-hour cache and a one-request-per-1.1-second queue. Configure `GEOCODER_SEARCH_URL` to switch to a compatible provider. Search results display OpenStreetMap attribution.

Place lookup is live; parking availability is read from ParkFlow's facility inventory and refreshed by the results screen every 30 seconds. Development occupancy is simulated. Production availability changes only when reservations or a configured operator data feed updates the inventory; external parking sensors are not connected by default.
## Parking search

### `GET /api/lots`

Optional query parameters: `q`, `maxPrice`, `walkMin`, `radiusKm` (1–200, applied when coordinates are provided), `availableNow=true`, `reservable=true`, `vehicle=car`, `amenities=cctv,covered`, `hours=24h`, `lat`, `lng`.

Returns `{ "success": true, "count": 1, "lots": [{ "_id": "...", "available": 120, "distanceKm": 1.2, "score": 87, "reasons": ["120 spaces available", "1.2 km from your destination"] }] }`. Distance is straight-line distance. Score is a normalized demo heuristic, not AI. Seed facility and safety information is sample data; occupancy is simulated outside production.

### `GET /api/lots/:id` and `GET /api/lots/:id/slots`

The facility endpoint returns the facility object including `available`. The slots endpoint returns mapped spaces, status, floor, section, vehicle type, and a sample-data flag. Seeded spaces are illustrative; reservations still reserve facility capacity, and the facility assigns a bay on arrival. Invalid identifiers return `400`; missing facilities return `404`.

## Reservations

All reservation routes require authentication.

### `POST /api/reservations`

Request: `{ "lotId": "...", "start": "2026-10-06T10:00:00.000Z", "durationHours": 2, "vehicle": { "plate": "TN 01 AB 1234" } }`.

The server validates the selected saved vehicle, facility compatibility, dates, price, duplicate bookings, and capacity. It creates a 10-minute `held` reservation and returns the populated reservation. Concurrent holds use a single-document MongoDB capacity claim; unavailable capacity returns `409`.

### `GET /api/reservations`, `GET /api/reservations/:id`

List the signed-in user’s reservations or retrieve one owned reservation. Expired unpaid holds are marked expired on read.

### `POST /api/reservations/:id/confirm`

Confirms a held reservation and marks payment as due at the facility. ParkFlow does not charge or handle money.

### `POST /api/reservations/:id/start`

Starts a confirmed reservation within its allowed arrival window. Rejects a second active session for the user. Returns `409` if the booking or space cannot start.

### `POST /api/reservations/:id/end`, `POST /api/reservations/:id/cancel`, `POST /api/reservations/:id/extend`

End accepts active sessions, cancel accepts held or confirmed reservations, and extend accepts `{ "hours": 1 }` for an active session (1–8 hours). Each transition is validated server-side.

### `POST /api/reservations/verify`

Administrator-only verification request: `{ "payload": "{\\"reservationId\\":\\"...\\",\\"bookingReference\\":\\"...\\",\\"type\\":\\"PARKFLOW_RESERVATION\\"}" }`. Returns only minimal entry details and `valid: true/false`. QR contents alone are not trusted.

## Admin and analytics

Admin routes require a JWT for a user with role `admin`. Create one by setting `PARKFLOW_ADMIN_EMAIL` and a 12+ character `PARKFLOW_ADMIN_PASSWORD` in the environment, then running the seed script.

- `GET /api/admin/overview`
- `GET|POST /api/admin/lots`, `PATCH|DELETE /api/admin/lots/:id`
- `GET|POST /api/admin/slots`, `PATCH /api/admin/slots/:id`
- `GET /api/admin/reservations`, `GET /api/admin/users`
- `GET /api/analytics/overview`, `/occupancy`, `/reservations`, `/revenue`

Admin occupancy metrics may be estimates from sample facility data. Revenue includes only on-site payments recorded by staff with the settle endpoint.


## Price quote and on-site payment

`GET /api/lots/:id/quote?hours=2` previews the server-calculated price. `POST /api/reservations/:id/confirm` confirms a held space as `confirmed` with payment due at the facility; it never charges through ParkFlow. `POST /api/reservations/:id/settle` is admin-only and records payment after the facility collects it in person. The QR verifier returns the booking and payment state.

## Occupancy provider reports

`POST /api/occupancy/report` accepts `{ "lotId": "...", "occupied": 85, "observedAt": "2026-10-10T10:00:00.000Z" }` with the `X-Occupancy-Token` header set to `OCCUPANCY_WEBHOOK_SECRET`. Reports are rejected when unauthenticated, out of facility capacity, older than 15 minutes, too far in the future, or older than a previously accepted report. Configure an operator feed to send current occupancy; do not use the sample readings as live supply.
