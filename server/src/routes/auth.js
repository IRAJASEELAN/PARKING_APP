import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { User } from "../models/User.js";
import { Organization } from "../models/Organization.js";
import { signToken } from "../middleware/auth.js";
import { getEmailConfiguration, sendPasswordResetEmail } from "../services/email.js";

export const authRouter = Router();
const hashResetToken = (token) => crypto.createHash("sha256").update(token).digest("hex");
const attempts = new Map();
authRouter.use((req, res, next) => {
  const key = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  let bucket = attempts.get(key);
  if (!bucket || bucket.until <= now) { bucket = { count: 0, until: now + 15 * 60 * 1000 }; attempts.set(key, bucket); }
  if (attempts.size > 10000) for (const [ip, entry] of attempts) if (entry.until <= now) attempts.delete(ip);
  if (++bucket.count > 30) return res.status(429).json({ success: false, message: "Too many authentication requests. Try again later." });
  next();
});

authRouter.post("/register", async (req, res) => {
  try {
    const { name, email, password, accountType = "driver", organizationName, phone, businessAddress } = req.body || {};
    const normalizedEmail = String(email || "").trim().toLowerCase();
    if (!["driver", "owner"].includes(accountType)) return res.status(400).json({ success: false, message: "Choose a valid account type" });
    const normalizedPhone = String(phone || "").trim();
    if (accountType === "owner" && (String(organizationName || "").trim().length < 2 || String(organizationName).trim().length > 120 || !/^[+\d() -]{7,24}$/.test(normalizedPhone))) return res.status(400).json({ success: false, message: "Facility owners need a business name and valid contact phone" });
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail) || typeof password !== "string") return res.status(400).json({ success: false, message: "A valid email and password are required" });
    if (password.length < 8 || password.length > 128) return res.status(400).json({ success: false, message: "Password must be 8 to 128 characters" });
    if (await User.findOne({ email: normalizedEmail })) return res.status(409).json({ success: false, message: "An account already exists for this email" });
    const user = await User.create({ name: typeof name === "string" ? name.trim().slice(0, 80) : "", email: normalizedEmail, passwordHash: await bcrypt.hash(password, 10), role: accountType });
    if (accountType === "owner") {
      try {
        const organization = await Organization.create({ name: String(organizationName).trim(), primaryOwner: user._id, phone: normalizedPhone, address: String(businessAddress || "").trim().slice(0, 240) });
        user.organizationId = organization._id;
        await user.save();
      } catch (organizationError) {
        await User.deleteOne({ _id: user._id }).catch(() => {});
        throw organizationError;
      }
    }
    res.status(201).json({ success: true, token: signToken(user), user: user.toSafeJSON() });
  } catch (err) {
    if (err?.code === 11000) return res.status(409).json({ success: false, message: "An account already exists for this email" });
    console.error("Registration failed", err);
    res.status(500).json({ success: false, message: "Unable to create account right now" });
  }
});

authRouter.post("/login", async (req, res) => {
  try {
    const { email, password, portal = "user" } = req.body || {};
    if (!["user", "owner"].includes(portal)) return res.status(400).json({ success: false, message: "Choose a valid sign-in type" });
    const user = await User.findOne({ email: String(email || "").trim().toLowerCase() });
    if (!user || typeof password !== "string" || password.length > 128 || !(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json({ success: false, message: "Invalid email or password" });
    if (portal === "owner" && user.role !== "owner") return res.status(403).json({ success: false, message: "This is the facility owner sign-in. Use driver sign-in for this account." });
    if (portal === "user" && !["driver", "admin"].includes(user.role)) return res.status(403).json({ success: false, message: "This is a facility owner account. Use owner sign-in." });
    res.json({ success: true, token: signToken(user), user: user.toSafeJSON() });
  } catch (err) {
    console.error("Login failed", err);
    res.status(500).json({ success: false, message: "Unable to sign in right now" });
  }
});

authRouter.post("/forgot", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ success: false, message: "Enter a valid email address" });
    const emailConfig = getEmailConfiguration();
    if (emailConfig.provider === "disabled" && process.env.NODE_ENV === "production") return res.status(503).json({ success: false, message: "Password reset email is not configured. Contact the ParkFlow administrator." });
    const user = await User.findOne({ email });
    if (user) {
      const token = crypto.randomBytes(32).toString("hex");
      user.resetTokenHash = hashResetToken(token);
      user.resetTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
      await user.save();
      if (emailConfig.provider === "resend") await sendPasswordResetEmail(email, token);
      else console.info(`[ParkFlow local reset link] ${process.env.CLIENT_URL || "http://localhost:5173"}/reset-password?token=${token}`);
      return res.json({ success: true, message: "If that email is on file, a reset link was sent.", ...(emailConfig.provider === "disabled" ? { resetUrl: `${process.env.CLIENT_URL || "http://localhost:5173"}/reset-password?token=${token}` } : {}) });
    }
    res.json({ success: true, message: "If that email is on file, a reset link was sent." });
  } catch (err) {
    console.error("Password reset request failed", err);
    res.status(502).json({ success: false, message: "Unable to deliver the reset email right now. Try again later." });
  }
});

authRouter.post("/reset", async (req, res) => {
  try {
    const { token, password } = req.body || {};
    if (typeof password !== "string" || password.length < 8 || password.length > 128) return res.status(400).json({ success: false, message: "Password must be 8 to 128 characters" });
    if (typeof token !== "string" || token.length > 256) return res.status(400).json({ success: false, message: "Reset link is invalid or expired" });
    const user = await User.findOne({ resetTokenHash: hashResetToken(token), resetTokenExpiresAt: { $gt: new Date() } });
    if (!user) return res.status(400).json({ success: false, message: "Reset link is invalid or expired" });
    user.passwordHash = await bcrypt.hash(password, 10);
    user.resetTokenHash = undefined;
    user.resetTokenExpiresAt = undefined;
    await user.save();
    res.json({ success: true, message: "Password updated. Sign in with your new password." });
  } catch (err) {
    console.error("Password reset failed", err);
    res.status(500).json({ success: false, message: "Unable to reset password right now" });
  }
});
