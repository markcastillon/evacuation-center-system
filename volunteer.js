// POST /api/volunteer
// Saves a volunteer sign-up as a new row in the "Volunteers" tab.
import { appendRow, isConfigured } from "../lib/sheets.js";

const AVAILABILITY = ["Weekdays", "Weekends", "Anytime during emergencies", "On call only"];
const PH_MOBILE = /^(09|\+639)\d{9}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Best-effort spam guard. Serverless instances are short-lived, so this only
// slows down rapid repeat submissions from the same IP.
const recent = new Map();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 3;

function rateLimited(ip) {
  const now = Date.now();
  const hits = (recent.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  hits.push(now);
  recent.set(ip, hits);
  return hits.length > MAX_PER_WINDOW;
}

function clean(value, max) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function validate(body) {
  const data = {
    fullName: clean(body.fullName, 80),
    contactNumber: clean(body.contactNumber, 20).replace(/[\s-]/g, ""),
    email: clean(body.email, 120),
    availability: clean(body.availability, 40),
    skills: clean(body.skills, 300),
    preferredCenter: clean(body.preferredCenter, 120),
  };
  const errors = {};
  if (data.fullName.length < 2) errors.fullName = "Please enter your full name.";
  if (!PH_MOBILE.test(data.contactNumber)) errors.contactNumber = "Use a PH mobile number, e.g. 09171234567.";
  if (data.email && !EMAIL.test(data.email)) errors.email = "That email address doesn't look right.";
  if (!AVAILABILITY.includes(data.availability)) errors.availability = "Please choose your availability.";
  return { data, errors };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  let body = req.body || {};
  if (typeof body === "string") {
    try {
      body = JSON.parse(body || "{}");
    } catch {
      return res.status(400).json({ error: "Invalid request body." });
    }
  }

  // Honeypot: real visitors never see or fill the "website" field.
  if (body.website) return res.status(200).json({ ok: true });

  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  if (rateLimited(ip)) {
    return res.status(429).json({ error: "Too many submissions. Please wait a minute and try again." });
  }

  const { data, errors } = validate(body);
  if (Object.keys(errors).length) {
    return res.status(400).json({ error: "Please fix the highlighted fields.", fields: errors });
  }

  if (!isConfigured()) {
    // Demo mode: accept the form so the flow can be tested before the sheet exists.
    return res.status(200).json({ ok: true, demo: true });
  }

  try {
    const submittedAt = new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" });
    await appendRow("Volunteers", [
      submittedAt,
      data.fullName,
      data.contactNumber,
      data.email,
      data.availability,
      data.skills,
      data.preferredCenter,
      "Pending review",
    ]);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[volunteer]", err);
    return res.status(502).json({ error: "We couldn't save your sign-up right now. Please try again later." });
  }
}
