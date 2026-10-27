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

export function normalizePolicies(rows) {
  return rows
    .filter((row) => String(row.title).trim())
    .map((row) => ({
      id: String(row.policy_id || ""),
      type: String(row.type || "Policy").trim(),
      title: String(row.title),
      summary: String(row.summary || ""),
      legalBasis: String(row.legal_basis || ""),
      isDraft: /draft/i.test(String(row.status)),
    }));
}

// Counts per vulnerable group, already aggregated by the Apps Script.
// No names or health details ever reach the website.
export function normalizeVulnerable(rows) {
  return rows
    .map((row) => ({ group: String(row.group || "").trim(), count: toNumber(row.count) }))
    .filter((row) => row.group);
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
  Policies: [
    { policy_id: "P-01", type: "Ordinance", title: "DRAFT Barangay Ordinance No. ___, Series of 2026: Adopting the Community Evacuation Center Management System", summary: "Adopts the system as the official record of evacuees, evacuation centers, supplies, and announcements during disasters. Designates the BDRRM Committee as system administrator and requires all evacuation center staff to record evacuees through the system.", legal_basis: "RA 10121 (Philippine DRRM Act of 2010); RA 10173 (Data Privacy Act of 2012)", status: "Draft (sample)" },
    { policy_id: "P-02", type: "Policy", title: "Registration of evacuees", summary: "Every family is registered upon arrival at an evacuation center, with the head of family as the main contact. Each member is listed with age, sex, relationship, and vulnerable group, if any.", legal_basis: "RA 10121", status: "Draft (sample)" },
    { policy_id: "P-03", type: "Policy", title: "Priority for vulnerable groups", summary: "Senior citizens, persons with disability, pregnant and lactating women, infants, and children receive priority in space allocation, relief distribution, and health checks.", legal_basis: "RA 10821 (Children's Emergency Relief and Protection Act); RA 9994 (Expanded Senior Citizens Act of 2010); RA 7277 (Magna Carta for Disabled Persons)", status: "Draft (sample)" },
    { policy_id: "P-04", type: "Rule", title: "Evacuation center house rules", summary: "Follow the instructions of center coordinators. Keep your assigned area clean. No alcohol, gambling, or weapons. Quiet hours from 9:00 PM to 5:00 AM. Report illness or injury to the health desk immediately.", legal_basis: "Barangay policy (to be confirmed)", status: "Draft (sample)" },
    { policy_id: "P-05", type: "Policy", title: "Relief distribution", summary: "Relief goods are released per family to the head of family or an authorized adult member, and every release is recorded in the distribution list with the receiver's signature.", legal_basis: "RA 10121", status: "Draft (sample)" },
    { policy_id: "P-06", type: "Policy", title: "Health records and data privacy", summary: "Health information of evacuees is sensitive personal information. Only health workers and the system administrator may view or update it, and it is used only to provide assistance. It is never shown on the public website.", legal_basis: "RA 10173 (Data Privacy Act of 2012)", status: "Draft (sample)" },
    { policy_id: "P-07", type: "Policy", title: "Evacuation center capacity", summary: "A center is marked Nearly Full at 80% of capacity and Full at 100%. New arrivals at a full center are directed to the nearest open center.", legal_basis: "Barangay policy (to be confirmed)", status: "Draft (sample)" },
  ],
  VulnerableSummary: [
    { group: "Senior Citizen", count: 3 },
    { group: "PWD", count: 1 },
    { group: "Pregnant", count: 1 },
    { group: "Lactating", count: 1 },
    { group: "Infant", count: 2 },
    { group: "Chronic Illness", count: 1 },
  ],
};
