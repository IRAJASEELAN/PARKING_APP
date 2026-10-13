import "./config/env.js";
import { connectDb } from "./db.js";
import { Lot } from "./models/Lot.js";
import { ParkingSlot } from "./models/ParkingSlot.js";
import { User } from "./models/User.js";
import bcrypt from "bcryptjs";

const lots = [
  {
    name: "Express Avenue Mall Parking",
    shortName: "Express Avenue",
    address: "49, Whites Road, Royapettah",
    neighborhood: "Royapettah",
    geo: { type: "Point", coordinates: [80.2601, 13.0537] },
    rates: { firstHour: 60, additional: 40, dailyMax: 300, hourly: 60 },
    amenities: ["cctv", "accessible", "ev", "covered"],
    hours: "Open 24 hours",
    safetyScore: 4.9,
    driverRating: 4.7,
    photoUrl:
      "https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&w=1200&q=80",
    totalSpots: 1200,
    occupied: 860,
    entrance: "Enter via Whites Road",
    entranceHint: "Use Gate 2 on Whites Road. Clearance 6 ft 8 in.",
    reviewQuote: "Bright, secure and very easy to find. Staff were helpful.",
    reviewAuthor: "Priya S.",
    reviewCount: 312,
    walkMin: 3,
    driveMin: 5,
    walkMi: 0.15,
    pinColor: "green",
    reservable: true,
    vehicleTypes: ["car", "suv", "van", "motorcycle"],
  },
  {
    name: "Spencer Plaza Parking",
    shortName: "Spencer Plaza",
    address: "769, Anna Salai, Mount Road",
    neighborhood: "Anna Salai",
    geo: { type: "Point", coordinates: [80.2598, 13.0569] },
    rates: { firstHour: 40, additional: 30, dailyMax: 200, hourly: 40 },
    amenities: ["cctv", "covered"],
    hours: "10am – 10pm",
    safetyScore: 4.5,
    driverRating: 4.4,
    photoUrl:
      "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=1200&q=80",
    totalSpots: 600,
    occupied: 480,
    entrance: "Enter from Anna Salai (Mount Road)",
    entranceHint: "Ticket on entry. Height restriction 7 ft.",
    reviewQuote: "Convenient location, right in the heart of the city.",
    reviewAuthor: "Karthik M.",
    reviewCount: 198,
    walkMin: 5,
    driveMin: 6,
    walkMi: 0.25,
    pinColor: "orange",
    reservable: true,
    vehicleTypes: ["car", "suv", "motorcycle"],
  },
  {
    name: "T. Nagar Multi-Level Car Park",
    shortName: "T. Nagar MLCP",
    address: "Usman Road, T. Nagar",
    neighborhood: "T. Nagar",
    geo: { type: "Point", coordinates: [80.2341, 13.0418] },
    rates: { firstHour: 50, additional: 35, dailyMax: 250, hourly: 50 },
    amenities: ["cctv", "accessible", "covered"],
    hours: "Open 24 hours",
    safetyScore: 4.6,
    driverRating: 4.5,
    photoUrl:
      "https://images.unsplash.com/photo-1573348722427-f1a77326865f?auto=format&fit=crop&w=1200&q=80",
    totalSpots: 800,
    occupied: 590,
    entrance: "Enter on Usman Road",
    entranceHint: "Follow blue MLCP signs from Usman Road junction.",
    reviewQuote: "Best option for shopping in T. Nagar — very organized.",
    reviewAuthor: "Deepa R.",
    reviewCount: 265,
    walkMin: 4,
    driveMin: 4,
    walkMi: 0.2,
    pinColor: "green",
    reservable: true,
    vehicleTypes: ["car", "suv", "van", "motorcycle"],
  },
  {
    name: "Egmore CMBT Smart Parking",
    shortName: "Egmore CMBT",
    address: "Esplanade, Egmore",
    neighborhood: "Egmore",
    geo: { type: "Point", coordinates: [80.2659, 13.0762] },
    rates: { firstHour: 30, additional: 25, dailyMax: 150, hourly: 30 },
    amenities: ["cctv", "accessible"],
    hours: "Open 24 hours",
    safetyScore: 4.3,
    driverRating: 4.2,
    photoUrl:
      "https://images.unsplash.com/photo-1470224114660-3f6686c556c4?auto=format&fit=crop&w=1200&q=80",
    totalSpots: 400,
    occupied: 180,
    entrance: "Enter from Esplanade Road",
    entranceHint: "Surface lot adjacent to CMBT bus terminus.",
    reviewQuote: "Affordable and well-lit. Perfect for early morning commuters.",
    reviewAuthor: "Suresh V.",
    reviewCount: 88,
    walkMin: 6,
    driveMin: 5,
    walkMi: 0.3,
    pinColor: "orange",
    reservable: true,
    vehicleTypes: ["car", "suv", "motorcycle"],
  },
  {
    name: "Nungambakkam Smart Parking",
    shortName: "Nungambakkam",
    address: "8, Khader Nawaz Khan Road, Nungambakkam",
    neighborhood: "Nungambakkam",
    geo: { type: "Point", coordinates: [80.2425, 13.0600] },
    rates: { firstHour: 80, additional: 60, dailyMax: 400, hourly: 80 },
    amenities: ["cctv", "ev", "covered", "attendant"],
    hours: "Open 24 hours",
    safetyScore: 4.8,
    driverRating: 4.7,
    photoUrl:
      "https://images.unsplash.com/photo-1486006920555-c77d7e6424fd?auto=format&fit=crop&w=1200&q=80",
    totalSpots: 200,
    occupied: 140,
    entrance: "Enter from KNK Road",
    entranceHint: "EV charging on Level 1. Attendant valet available.",
    reviewQuote: "Premium facility. EV chargers actually worked!",
    reviewAuthor: "Vikram A.",
    reviewCount: 74,
    walkMin: 5,
    driveMin: 7,
    walkMi: 0.25,
    pinColor: "green",
    reservable: true,
    vehicleTypes: ["car", "suv", "van"],
  },
  {
    name: "Mylapore Kapaleeshwarar Car Park",
    shortName: "Mylapore Car Park",
    address: "Kutchery Road, Mylapore",
    neighborhood: "Mylapore",
    geo: { type: "Point", coordinates: [80.2688, 13.0374] },
    rates: { firstHour: 40, additional: 30, dailyMax: 200, hourly: 40 },
    amenities: ["accessible"],
    hours: "6am – 10pm",
    safetyScore: 4.2,
    driverRating: 4.1,
    photoUrl:
      "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1200&q=80",
    totalSpots: 150,
    occupied: 60,
    entrance: "Enter from Kutchery Road",
    entranceHint: "Open surface lot near the temple. Not covered.",
    reviewQuote: "Handy for temple visits. Gets crowded on festival days.",
    reviewAuthor: "Lakshmi P.",
    reviewCount: 43,
    walkMin: 7,
    driveMin: 6,
    walkMi: 0.35,
    pinColor: "orange",
    reservable: true,
    vehicleTypes: ["car", "motorcycle"],
  },
  {
    name: "Anna Nagar Tower Park Parking",
    shortName: "Anna Nagar Tower",
    address: "3rd Avenue, Anna Nagar",
    neighborhood: "Anna Nagar",
    geo: { type: "Point", coordinates: [80.2100, 13.0858] },
    rates: { firstHour: 50, additional: 35, dailyMax: 250, hourly: 50 },
    amenities: ["cctv", "covered", "accessible"],
    hours: "Open 24 hours",
    safetyScore: 4.6,
    driverRating: 4.5,
    photoUrl:
      "https://images.unsplash.com/photo-1461896836934-ffe607ba6851?auto=format&fit=crop&w=1200&q=80",
    totalSpots: 350,
    occupied: 200,
    entrance: "Enter on 3rd Avenue",
    entranceHint: "Look for the blue tower landmark. Ramp on left.",
    reviewQuote: "Great multi-level facility, walking distance to shops.",
    reviewAuthor: "Raj K.",
    reviewCount: 120,
    walkMin: 4,
    driveMin: 8,
    walkMi: 0.2,
    pinColor: "green",
    reservable: true,
    vehicleTypes: ["car", "suv", "van", "motorcycle"],
  },
  {
    name: "Besant Nagar Beach Parking",
    shortName: "Besant Nagar Beach",
    address: "Besant Nagar Beach Road, Besant Nagar",
    neighborhood: "Besant Nagar",
    geo: { type: "Point", coordinates: [80.2704, 12.9987] },
    rates: { firstHour: 30, additional: 25, dailyMax: 150, hourly: 30 },
    amenities: ["accessible"],
    hours: "5am – 11pm",
    safetyScore: 4.0,
    driverRating: 4.0,
    photoUrl:
      "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=1200&q=80",
    totalSpots: 250,
    occupied: 80,
    entrance: "Enter from Beach Road",
    entranceHint: "Open lot along the beach promenade.",
    reviewQuote: "Perfect for evening beach walks. Very affordable.",
    reviewAuthor: "Arun T.",
    reviewCount: 56,
    walkMin: 2,
    driveMin: 10,
    walkMi: 0.1,
    pinColor: "orange",
    reservable: true,
    vehicleTypes: ["car", "suv", "motorcycle"],
  },
];

async function seed() {
  await connectDb(process.env.MONGODB_URI);
  await Lot.bulkWrite(lots.map((lot) => ({ updateOne: { filter: { name: lot.name }, update: { $set: { ...lot, isDemoData: true, occupancySource: "simulation", occupancyUpdatedAt: new Date() } }, upsert: true } })));
  const seededLots = await Lot.find({ name: { $in: lots.map((lot) => lot.name) } });
  for (const lot of seededLots) {
    if (await ParkingSlot.exists({ lotId: lot._id })) continue;
    const sampleSize = Math.min(24, lot.totalSpots);
    const availableSamples = Math.round(sampleSize * (1 - lot.occupied / lot.totalSpots));
    const spaces = Array.from({ length: sampleSize }, (_, index) => ({
      lotId: lot._id,
      slotNumber: `${index < 12 ? "A" : "B"}-${String(index % 12 + 1).padStart(2, "0")}`,
      floor: index < 12 ? "Ground" : "Level 1",
      section: index < 12 ? "North" : "South",
      vehicleType: "car",
      status: index < availableSamples ? "AVAILABLE" : "OCCUPIED",
      isDemoData: true,
    }));
    await ParkingSlot.insertMany(spaces);
  }

  const email = String(process.env.PARKFLOW_DEMO_EMAIL || "").trim().toLowerCase();
  const demoPassword = process.env.PARKFLOW_DEMO_PASSWORD;
  if (email && demoPassword && demoPassword.length >= 8 && !(await User.findOne({ email }))) {
    await User.create({ name: "ParkFlow Demo Driver", email, passwordHash: await bcrypt.hash(demoPassword, 10), savedPlaces: { home: "Adyar, Chennai", work: "T. Nagar, Chennai" }, vehicles: [{ plate: "TN 01 AB 1234", make: "Maruti Swift" }, { plate: "TN 22 CD 5678", make: "Hyundai Creta" }] });
  }  const adminEmail = String(process.env.PARKFLOW_ADMIN_EMAIL || "").trim().toLowerCase();
  const adminPassword = process.env.PARKFLOW_ADMIN_PASSWORD;
  if (adminEmail && adminPassword && adminPassword.length >= 12 && !(await User.findOne({ email: adminEmail }))) {
    await User.create({ name: "ParkFlow Administrator", email: adminEmail, passwordHash: await bcrypt.hash(adminPassword, 12), role: "admin" });
  }
  console.log(`Upserted ${lots.length} Chennai demo lots.`);
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});






