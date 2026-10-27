// GET /api/status
// Public, read-only snapshot of evacuation centers, active announcements,
// barangay policies, and vulnerable-group counts (numbers only, no names).
import { isConfigured, readTabs } from "../lib/sheets.js";
import {
  DEMO_TABS,
  normalizeAnnouncements,
  normalizeCenters,
  normalizePolicies,
  normalizeVulnerable,
  summarize,
} from "../lib/data.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const live = isConfigured();
    const tabs = live
      ? await readTabs(["Centers", "Announcements", "Policies", "VulnerableSummary"])
      : DEMO_TABS;
    const centers = normalizeCenters(tabs.Centers);

    // Cache at Vercel's edge for 30s so a traffic spike during a typhoon
    // doesn't exhaust the Google Sheets API quota.
    res.setHeader("Cache-Control", "public, s-maxage=30, stale-while-revalidate=120");
    return res.status(200).json({
      source: live ? "sheet" : "demo",
      fetchedAt: new Date().toISOString(),
      summary: summarize(centers),
      centers,
      announcements: normalizeAnnouncements(tabs.Announcements),
      policies: normalizePolicies(tabs.Policies || []),
      vulnerable: normalizeVulnerable(tabs.VulnerableSummary || []),
    });
  } catch (err) {
    console.error("[status]", err);
    return res.status(502).json({ error: "Could not load evacuation data. Please try again shortly." });
  }
}
