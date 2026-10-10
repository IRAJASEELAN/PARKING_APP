import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
export const usersRouter = Router();
usersRouter.get("/me", requireAuth, (req, res) => res.json(req.user.toSafeJSON()));
usersRouter.patch("/me", requireAuth, async (req, res) => {
  try {
    const { name, vehicles, savedPlaces } = req.body || {};
    if (name !== undefined && (typeof name !== "string" || name.trim().length > 80)) return res.status(400).json({ success: false, message: "Name must be 80 characters or fewer" });
    if (name !== undefined) req.user.name = name.trim();
    if (vehicles !== undefined) {
      if (!Array.isArray(vehicles) || vehicles.length > 5) return res.status(400).json({ success: false, message: "Save up to 5 vehicles" });
      const normalized = [];
      for (const vehicle of vehicles) {
        const plate = String(vehicle?.plate || "").trim().toUpperCase().replace(/\s+/g, " ");
        const make = String(vehicle?.make || "").trim();
        if (!/^[A-Z0-9 -]{3,15}$/.test(plate) || make.length > 60) return res.status(400).json({ success: false, message: "Enter a valid vehicle registration and a make under 60 characters" });
        if (normalized.some((saved) => saved.plate === plate)) return res.status(400).json({ success: false, message: "Vehicle registrations must be unique" });
        normalized.push({ plate, make });
      }
      req.user.vehicles = normalized;
    }
    if (savedPlaces !== undefined) {
      if (!savedPlaces || typeof savedPlaces !== "object" || Array.isArray(savedPlaces)) return res.status(400).json({ success: false, message: "Saved places are invalid" });
      const allowed = ["home", "work"];
      for (const key of Object.keys(savedPlaces)) if (!allowed.includes(key)) return res.status(400).json({ success: false, message: "Only home and work can be saved" });
      for (const key of allowed) if (savedPlaces[key] !== undefined && (typeof savedPlaces[key] !== "string" || savedPlaces[key].length > 160)) return res.status(400).json({ success: false, message: "Saved place must be 160 characters or fewer" });
      req.user.savedPlaces = { ...req.user.savedPlaces, ...savedPlaces };
    }
    await req.user.save();
    res.json(req.user.toSafeJSON());
  } catch (err) {
    console.error("Profile update failed", err);
    res.status(500).json({ success: false, message: "Unable to update your profile right now" });
  }
});

