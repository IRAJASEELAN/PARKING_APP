# ParkFlow

ParkFlow is a MERN parking discovery and reservation app. MongoDB stores user accounts, ParkFlow facility listings, reservations, and operator-reported occupancy. The map can also discover nearby parking places from OpenStreetMap.

## Run locally

1. Put `MONGODB_URI`, a `JWT_SECRET`, and a separate random `QR_SIGNING_SECRET` (each at least 32 characters) in the project-root `.env` file. Keep that file private and out of source control.
2. In one terminal, run `cd server` then `npm run dev`.
3. In another terminal, run `cd client` then `npm run dev`.
4. Open `http://localhost:5173`.

## Judge prototype

The connected demo database has eight Chennai sample facilities. All accept prototype reservations and use simulated availability and sample prices. To add or refresh them in another demo database, run `cd server` then `npm run seed`. These sample values demonstrate the booking flow and are not operator-verified real-world inventory. OpenStreetMap-only listings continue to provide directions and discovery, not direct booking.

## Parking data and live availability

- Place search uses user-submitted searches through Nominatim. The server caches results and spaces requests to respect the public service's usage limits.
- Nearby map listings use the OpenStreetMap Overpass API. Listings can show mapped name, approximate location, access notes, and fee tags. Map data does **not** provide live free-space counts, confirmed prices, or reservations; ParkFlow labels those values as unknown and links to directions.
- In-app turn-by-turn driving directions use OSRM route geometry and steps. `ROUTING_SERVICE_URL` can point at a hosted or self-managed OSRM-compatible endpoint.
- The OpenStreetMap endpoints are configurable using `GEOCODER_SEARCH_URL`, `PARKING_SEARCH_URL`, and `ROUTING_SERVICE_URL`. Public community endpoints are best-effort and may impose limits; move to a hosted provider or self-hosted service before high-volume public launch.
- Reservations can be made against ParkFlow facilities with booking enabled and capacity/rates configured. The app holds inventory, confirms the booking, provides a QR code, and lets drivers pay at the facility. Seeded prototype facilities accept demo bookings; mapped OSM-only places are not directly bookable until an operator is connected.
- Parking owners register using **Create account → Facility owner**, submit their facility with its coordinates, capacity, hours, and rates, then track the review in their owner dashboard. An administrator must approve the owner application and each facility before that facility appears to drivers or accepts bookings.
- At arrival, an owner signs in, opens **Check-in**, and scans the QR shown on the driver's booking. The signed booking token is stored hashed, checked against the reservation, facility ownership, reservation window, and active capacity claim; the first successful scan starts the session. Owners check drivers out from the reservation list, which releases the occupied capacity. The QR cannot check in a booking twice.
- To create an administrator for the review workflow, set a unique `PARKFLOW_ADMIN_EMAIL` and a `PARKFLOW_ADMIN_PASSWORD` of at least 12 characters in the project-root `.env`, then run `npm run seed` from `server`. Keep these credentials private. If the database already has that email as a non-admin account, use a different dedicated email.
- ParkFlow live occupancy requires a participating operator's sensor/camera system to POST updates to `/api/occupancy/report` with `OCCUPANCY_WEBHOOK_SECRET`. Without an operator feed, the database cannot know real parking occupancy. Demo listings are marked as sample data and production defaults to manual occupancy.
- OpenStreetMap data is © OpenStreetMap contributors. Keep map attribution visible.
