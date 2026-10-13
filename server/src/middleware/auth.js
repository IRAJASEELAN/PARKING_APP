import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ success: false, message: "Sign in required" });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ success: false, message: "Account not found" });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ success: false, message: "Session expired" });
  }
}

export function signToken(user) {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is not configured");
  return jwt.sign({ sub: String(user._id) }, process.env.JWT_SECRET, { expiresIn: "7d" });
}


export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") return res.status(403).json({ success: false, message: "Administrator access required" });
  next();
}

export function requireOwner(req, res, next) {
  if (!req.user || req.user.role !== "owner" || !req.user.organizationId) return res.status(403).json({ success: false, message: "Facility owner access required" });
  next();
}
