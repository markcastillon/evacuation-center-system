// Shapes raw spreadsheet rows into the public data the landing page shows.
// Only center and announcement data is ever exposed publicly. Evacuee and
// volunteer records stay private inside the spreadsheet.

export const STATUSES = ["Open", "Nearly Full", "Full", "Closed"];
const NEARLY_FULL_RATIO = 0.8;

function toNumber(value) {
  const n = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

function isTruthy(value) {
  return !["no", "false", "0", "inactive", "hidden"].includes(String(value).trim().toLowerCase());
}

// Status comes from the "status_override" column when staff set one,
// otherwise it is computed from occupancy vs capacity.
export function computeStatus(capacity, occupancy, override) {
  const manual = STATUSES.find((s) => s.toLowerCase() === String(override).trim().toLowerCase());
  if (manual) return manual;
  if (capacity <= 0) return "Closed";
  const ratio = occupancy / capacity;
  if (ratio >= 1) return "Full";
  if (ratio >= NEARLY_FULL_RATIO) return "Nearly Full";
  return "Open";
}

export function normalizeCenters(rows) {
  return rows.map((row, i) => {
    const capacity = toNumber(row.capacity);
    const occupancy = toNumber(row.occupancy);
    return {
      id: String(row.center_id || `C-${i + 1}`),
      name: String(row.name || "Unnamed center"),
      location: String(row.location || ""),
      capacity,
      occupancy,
      available: Math.max(capacity - occupancy, 0),
      status: computeStatus(capacity, occupancy, row.status_override),
      contactPerson: String(row.contact_person || ""),
      contactNumber: String(row.contact_number || ""),
      lastUpdated: String(row.last_updated || ""),
    };
  });
}

const PRIORITY_RANK = { urgent: 0, warning: 1, info: 2 };

export function normalizeAnnouncements(rows, limit = 6) {
  return rows
    .filter((row) => isTruthy(row.active) && String(row.title).trim())
    .map((row) => {
      const priority = String(row.priority).trim().toLowerCase();
      return {
        id: String(row.id || ""),
        title: String(row.title),
        message: String(row.message || ""),
        priority: priority in PRIORITY_RANK ? priority : "info",
        postedAt: String(row.posted_at || ""),
      };
    })
    .sort(
      (a, b) =>
        PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
        String(b.postedAt).localeCompare(String(a.postedAt))
    )
    .slice(0, limit);
}

export function summarize(centers) {
  const active = centers.filter((c) => c.status !== "Closed");
  return {
    totalCenters: centers.length,
    openCenters: centers.filter((c) => c.status === "Open" || c.status === "Nearly Full").length,
    evacuees: active.reduce((sum, c) => sum + c.occupancy, 0),
    availableSpaces: active
      .filter((c) => c.status !== "Full")
      .reduce((sum, c) => sum + c.available, 0),
  };
}

// Sample rows used until the Google Sheet is connected, so the page can be
// previewed and demoed right away. Same shape as the real sheet tabs.
export const DEMO_TABS = {
  Centers: [
    { center_id: "EC-01", name: "Pangabugan Elementary School", location: "Purok 3, Brgy. Pangabugan", capacity: 250, occupancy: 142, status_override: "", contact_person: "Center Coordinator A", contact_number: "", last_updated: "2026-10-26 08:30" },
    { center_id: "EC-02", name: "Barangay Covered Court", location: "Purok 1, beside Barangay Hall", capacity: 180, occupancy: 161, status_override: "", contact_person: "Center Coordinator B", contact_number: "", last_updated: "2026-10-26 08:15" },
    { center_id: "EC-03", name: "Barangay Multi-Purpose Hall", location: "Purok 1, Brgy. Pangabugan", capacity: 120, occupancy: 120, status_override: "", contact_person: "Center Coordinator C", contact_number: "", last_updated: "2026-10-26 07:50" },
    { center_id: "EC-04", name: "Day Care Center", location: "Purok 5, Brgy. Pangabugan", capacity: 60, occupancy: 18, status_override: "", contact_person: "Center Coordinator D", contact_number: "", last_updated: "2026-10-26 08:05" },
    { center_id: "EC-05", name: "Chapel Annex", location: "Purok 6, Brgy. Pangabugan", capacity: 80, occupancy: 0, status_override: "Closed", contact_person: "Center Coordinator E", contact_number: "", last_updated: "2026-10-25 18:00" },
  ],
  Announcements: [
    { id: "A-01", title: "Sample: Pre-emptive evacuation for low-lying puroks", message: "Families in flood-prone areas are advised to proceed to the nearest open evacuation center. Bring IDs, medicine, and water.", priority: "urgent", posted_at: "2026-10-26 07:00", active: "yes" },
    { id: "A-02", title: "Sample: Covered Court is nearly full", message: "New arrivals are encouraged to go to Pangabugan Elementary School or the Day Care Center.", priority: "warning", posted_at: "2026-10-26 08:20", active: "yes" },
    { id: "A-03", title: "Sample: Relief goods distribution at 12:00 NN", message: "Family heads, please line up at the center registration desk with your family number.", priority: "info", posted_at: "2026-10-26 06:45", active: "yes" },
  ],
};
