import "./config/env.js";
import express from "express";
import cors from "cors";
import { connectDb } from "./db.js";
import { occupancyService } from "./services/occupancy.js";
import { authRouter } from "./routes/auth.js";
import { usersRouter } from "./routes/users.js";
import { lotsRouter } from "./routes/lots.js";
import { geocodeRouter } from "./routes/geocode.js";
import { parkingRouter } from "./routes/parking.js";
import { directionsRouter } from "./routes/directions.js";
import { reservationsRouter } from "./routes/reservations.js";
import { adminRouter } from "./routes/admin.js";
import { analyticsRouter } from "./routes/analytics.js";
import { occupancyRouter } from "./routes/occupancy.js";
import { ownerRouter } from "./routes/owner.js";

const app = express();
const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
app.disable("x-powered-by");
app.use((req,res,next)=>{ res.set("X-Content-Type-Options","nosniff"); res.set("X-Frame-Options","DENY"); res.set("Referrer-Policy","strict-origin-when-cross-origin"); next(); });
const allowedOrigins = new Set([clientUrl, "https://localhost", "http://localhost", "capacitor://localhost"]);
app.use(cors({ origin(origin, callback) {
  if (!origin || allowedOrigins.has(origin)) return callback(null, true);
  return callback(new Error("Origin is not allowed by ParkFlow API"));
}, credentials: true }));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true, name: "ParkFlow" }));
app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/owner", ownerRouter);
app.use("/api/lots", lotsRouter);
app.use("/api/geocode", geocodeRouter);
app.use("/api/parking", parkingRouter);
app.use("/api/directions", directionsRouter);
app.use("/api/occupancy", occupancyRouter);
app.use("/api/reservations", reservationsRouter);
app.use("/api/admin", adminRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api", (_req, res) => res.status(404).json({ success: false, message: "API endpoint not found" }));
app.use((err, _req, res, _next) => {
  console.error("Unhandled API error", err);
  res.status(err.statusCode || 500).json({ success: false, message: "An unexpected server error occurred" });
});

async function start() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error("JWT_SECRET must be configured with at least 32 characters");
  await connectDb(process.env.MONGODB_URI);
  console.log("Mongo connected");
  setInterval(() => occupancyService.refresh().catch((err) => console.error("Occupancy refresh failed", err)), 60 * 1000);
  const port = process.env.PORT || 5000;
  app.listen(port, () => console.log(`ParkFlow API on :${port}`));
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});







