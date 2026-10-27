// Community Evacuation Center Management System (CECMS): Google Sheet script
//
// Paste this whole file into your Google Sheet: Extensions > Apps Script.
// 1. Choose "setupSheet" in the function menu at the top and click Run.
//    It creates any missing tab and fills empty tabs with DRAFT sample data.
//    Tabs that already have data are never touched, so it is safe to run again.
// 2. Reload the Google Sheet. A new "CECMS" menu appears with the form generators.
// 3. Website connection: Deploy > New deployment > Web app, with
//      Execute as: Me
//      Who has access: Anyone
//    and copy the Web app URL into Vercel as SHEET_API_URL.
//    After changing this script, use Deploy > Manage deployments > Edit > New version
//    so the website uses the update without changing the URL.
//
// Everything marked DRAFT is placeholder content. Replace it with the barangay's
// real forms, ordinance, and policies once they are gathered.

// Only these tabs can be read by the website (public information).
// Evacuees, Families, and HealthRecords are private and never leave the sheet.
var READABLE_TABS = ["Centers", "Announcements"];
// Only these tabs can receive new rows from the website.
var WRITABLE_TABS = ["Volunteers"];

var BARANGAY = "BARANGAY PANGABUGAN";
var CITY = "City of Butuan";
var TIMEZONE = "Asia/Manila";
var VULNERABLE_GROUPS = ["Senior Citizen", "PWD", "Pregnant", "Lactating", "Infant", "Chronic Illness"];

// ---------------------------------------------------------------------------
// Tab layout and DRAFT sample data used by setupSheet()
// ---------------------------------------------------------------------------

var TABS = {
  Centers: {
    headers: ["center_id", "name", "location", "capacity", "occupancy", "status_override", "contact_person", "contact_number", "last_updated"],
    rows: [
      ["EC-01", "Pangabugan Elementary School", "Purok 3, Brgy. Pangabugan", 250, 142, "", "Center Coordinator A", "", "2026-10-26 08:30"],
      ["EC-02", "Barangay Covered Court", "Purok 1, beside Barangay Hall", 180, 161, "", "Center Coordinator B", "", "2026-10-26 08:15"],
      ["EC-03", "Barangay Multi-Purpose Hall", "Purok 1, Brgy. Pangabugan", 120, 120, "", "Center Coordinator C", "", "2026-10-26 07:50"],
      ["EC-04", "Day Care Center", "Purok 5, Brgy. Pangabugan", 60, 18, "", "Center Coordinator D", "", "2026-10-26 08:05"],
      ["EC-05", "Chapel Annex", "Purok 6, Brgy. Pangabugan", 80, 0, "Closed", "Center Coordinator E", "", "2026-10-25 18:00"]
    ]
  },
  Announcements: {
    headers: ["id", "title", "message", "priority", "posted_at", "active"],
    rows: [
      ["A-01", "Pre-emptive evacuation for low-lying puroks", "Families in flood-prone areas are advised to proceed to the nearest open evacuation center. Bring IDs, medicine, and water.", "urgent", "2026-10-26 07:00", "yes"],
      ["A-02", "Covered Court is nearly full", "New arrivals are encouraged to go to Pangabugan Elementary School or the Day Care Center.", "warning", "2026-10-26 08:20", "yes"],
      ["A-03", "Relief goods distribution at 12:00 NN", "Family heads, please line up at the center registration desk with your family number.", "info", "2026-10-26 06:45", "yes"]
    ]
  },
  Volunteers: {
    headers: ["submitted_at", "full_name", "contact_number", "email", "availability", "skills", "preferred_center", "status"],
    rows: []
  },
  // DRAFT family registration, modeled on a family access card (one row per family).
  Families: {
    headers: ["family_id", "head_of_family", "purok", "contact_number", "center_id", "date_registered", "house_damage", "status", "remarks"],
    rows: [
      ["F-001", "Juan Dela Cruz", "Purok 3", "09170000001", "EC-01", "2026-10-26", "Partially damaged", "Sheltered", "Sample family"],
      ["F-002", "Maria Santos", "Purok 2", "09170000002", "EC-01", "2026-10-26", "None", "Sheltered", "Sample family"],
      ["F-003", "Pedro Reyes", "Purok 1", "09170000003", "EC-02", "2026-10-26", "Totally damaged", "Sheltered", "Sample family"],
      ["F-004", "Ana Garcia", "Purok 5", "09170000004", "EC-04", "2026-10-26", "None", "Sheltered", "Sample family"],
      ["F-005", "Roberto Mendoza", "Purok 3", "09170000005", "EC-02", "2026-10-26", "Partially damaged", "Sheltered", "Sample family"],
      ["F-006", "Lorna Villanueva", "Purok 6", "09170000006", "EC-04", "2026-10-25", "None", "Returned home", "Sample family"]
    ]
  },
  // The first 9 columns keep their positions so the occupancy formula
  // (center_id in G, status in I) keeps working.
  Evacuees: {
    headers: ["evacuee_id", "family_id", "full_name", "age", "sex", "contact_number", "center_id", "date_arrived", "status", "relationship", "vulnerable_group"],
    rows: [
      ["E-001", "F-001", "Juan Dela Cruz", 45, "M", "09170000001", "EC-01", "2026-10-26", "Sheltered", "Head", ""],
      ["E-002", "F-001", "Rosa Dela Cruz", 42, "F", "", "EC-01", "2026-10-26", "Sheltered", "Spouse", ""],
      ["E-003", "F-001", "Miguel Dela Cruz", 12, "M", "", "EC-01", "2026-10-26", "Sheltered", "Child", ""],
      ["E-004", "F-001", "Carmen Dela Cruz", 71, "F", "", "EC-01", "2026-10-26", "Sheltered", "Parent", "Senior Citizen"],
      ["E-005", "F-002", "Maria Santos", 34, "F", "09170000002", "EC-01", "2026-10-26", "Sheltered", "Head", "Pregnant"],
      ["E-006", "F-002", "Joshua Santos", 6, "M", "", "EC-01", "2026-10-26", "Sheltered", "Child", ""],
      ["E-007", "F-002", "Althea Santos", 1, "F", "", "EC-01", "2026-10-26", "Sheltered", "Child", "Infant"],
      ["E-008", "F-003", "Pedro Reyes", 58, "M", "09170000003", "EC-02", "2026-10-26", "Sheltered", "Head", "Chronic Illness"],
      ["E-009", "F-003", "Lito Reyes", 25, "M", "", "EC-02", "2026-10-26", "Sheltered", "Child", "PWD"],
      ["E-010", "F-004", "Ana Garcia", 29, "F", "09170000004", "EC-04", "2026-10-26", "Sheltered", "Head", "Lactating"],
      ["E-011", "F-004", "Liam Garcia", 0, "M", "", "EC-04", "2026-10-26", "Sheltered", "Child", "Infant"],
      ["E-012", "F-005", "Roberto Mendoza", 63, "M", "09170000005", "EC-02", "2026-10-26", "Sheltered", "Head", "Senior Citizen"],
      ["E-013", "F-005", "Elena Mendoza", 60, "F", "", "EC-02", "2026-10-26", "Sheltered", "Spouse", "Senior Citizen"],
      ["E-014", "F-005", "Mark Mendoza", 19, "M", "", "EC-02", "2026-10-26", "Sheltered", "Child", ""],
      ["E-015", "F-006", "Lorna Villanueva", 50, "F", "09170000006", "EC-04", "2026-10-25", "Returned home", "Head", ""],
      ["E-016", "F-006", "Jessa Villanueva", 17, "F", "", "EC-04", "2026-10-25", "Returned home", "Child", ""]
    ]
  },
  // DRAFT health records. Sensitive personal information under RA 10173:
  // only health workers and the administrator should have access.
  HealthRecords: {
    headers: ["record_id", "date", "evacuee_id", "full_name", "center_id", "blood_pressure", "temperature_c", "complaints", "allergies", "maintenance_medicine", "action_taken", "referred_to", "recorded_by"],
    rows: [
      ["H-001", "2026-10-26", "E-004", "Carmen Dela Cruz", "EC-01", "150/90", "36.8", "Dizziness", "None", "Amlodipine 5mg", "Monitored", "", "BHW on duty (sample)"],
      ["H-002", "2026-10-26", "E-005", "Maria Santos", "EC-01", "110/70", "36.6", "Prenatal check, 7 months", "None", "Prenatal vitamins", "Monitored", "", "Midwife (sample)"],
      ["H-003", "2026-10-26", "E-007", "Althea Santos", "EC-01", "", "38.2", "Fever", "None", "None", "Referred", "Barangay Health Center", "BHW on duty (sample)"],
      ["H-004", "2026-10-26", "E-008", "Pedro Reyes", "EC-02", "160/100", "36.9", "Headache", "Penicillin", "Losartan 50mg", "Referred", "City Health Office", "Nurse (sample)"],
      ["H-005", "2026-10-26", "E-009", "Lito Reyes", "EC-02", "120/80", "36.5", "Needs wheelchair access", "None", "None", "Assisted", "", "BHW on duty (sample)"],
      ["H-006", "2026-10-26", "E-011", "Liam Garcia", "EC-04", "", "37.1", "Mild cough", "None", "None", "Monitored", "", "BHW on duty (sample)"]
    ]
  },
  // "remaining" is filled with a formula (received minus released) by setupSheet().
  Supplies: {
    headers: ["supply_id", "center_id", "item", "unit", "quantity_received", "quantity_released", "remaining", "last_updated"],
    rows: [
      ["S-001", "EC-01", "Family food packs", "packs", 100, 2, "", "2026-10-26 12:00"],
      ["S-002", "EC-01", "Bottled water", "bottles", 300, 14, "", "2026-10-26 12:00"],
      ["S-003", "EC-01", "Hygiene kits", "kits", 50, 2, "", "2026-10-26 12:00"],
      ["S-004", "EC-01", "Blankets", "pcs", 80, 7, "", "2026-10-26 12:00"],
      ["S-005", "EC-02", "Family food packs", "packs", 80, 2, "", "2026-10-26 12:00"],
      ["S-006", "EC-02", "Sleeping mats", "pcs", 60, 5, "", "2026-10-26 12:00"],
      ["S-007", "EC-04", "Family food packs", "packs", 30, 1, "", "2026-10-26 12:00"],
      ["S-008", "EC-04", "Infant formula", "cans", 20, 2, "", "2026-10-26 12:00"]
    ]
  },
  Distributions: {
    headers: ["dist_id", "date", "center_id", "family_id", "head_of_family", "item", "quantity", "received_by", "released_by"],
    rows: [
      ["D-001", "2026-10-26", "EC-01", "F-001", "Juan Dela Cruz", "Family food packs", 1, "Juan Dela Cruz", "Volunteer (sample)"],
      ["D-002", "2026-10-26", "EC-01", "F-001", "Juan Dela Cruz", "Blankets", 4, "Juan Dela Cruz", "Volunteer (sample)"],
      ["D-003", "2026-10-26", "EC-01", "F-002", "Maria Santos", "Family food packs", 1, "Maria Santos", "Volunteer (sample)"],
      ["D-004", "2026-10-26", "EC-02", "F-003", "Pedro Reyes", "Family food packs", 1, "Lito Reyes", "Volunteer (sample)"],
      ["D-005", "2026-10-26", "EC-02", "F-005", "Roberto Mendoza", "Sleeping mats", 3, "Elena Mendoza", "Volunteer (sample)"],
      ["D-006", "2026-10-26", "EC-04", "F-004", "Ana Garcia", "Infant formula", 2, "Ana Garcia", "Volunteer (sample)"]
    ]
  },
  // DRAFT ordinance and policies. Replace with the barangay's actual documents.
  Policies: {
    headers: ["policy_id", "type", "title", "summary", "legal_basis", "status"],
    rows: [
      ["P-01", "Ordinance", "DRAFT Barangay Ordinance No. ___, Series of 2026: Adopting the Community Evacuation Center Management System",
        "Adopts the system as the official record of evacuees, evacuation centers, supplies, and announcements during disasters. Designates the BDRRM Committee as system administrator and requires all evacuation center staff to record evacuees through the system.",
        "RA 10121 (Philippine DRRM Act of 2010); RA 10173 (Data Privacy Act of 2012)", "Draft (sample)"],
      ["P-02", "Policy", "Registration of evacuees",
        "Every family is registered upon arrival at an evacuation center, with the head of family as the main contact. Each member is listed with age, sex, relationship, and vulnerable group, if any.",
        "RA 10121", "Draft (sample)"],
      ["P-03", "Policy", "Priority for vulnerable groups",
        "Senior citizens, persons with disability, pregnant and lactating women, infants, and children receive priority in space allocation, relief distribution, and health checks.",
        "RA 10821 (Children's Emergency Relief and Protection Act); RA 9994 (Expanded Senior Citizens Act of 2010); RA 7277 (Magna Carta for Disabled Persons)", "Draft (sample)"],
      ["P-04", "Rule", "Evacuation center house rules",
        "Follow the instructions of center coordinators. Keep your assigned area clean. No alcohol, gambling, or weapons. Quiet hours from 9:00 PM to 5:00 AM. Report illness or injury to the health desk immediately.",
        "Barangay policy (to be confirmed)", "Draft (sample)"],
      ["P-05", "Policy", "Relief distribution",
        "Relief goods are released per family to the head of family or an authorized adult member, and every release is recorded in the distribution list with the receiver's signature.",
        "RA 10121", "Draft (sample)"],
      ["P-06", "Policy", "Health records and data privacy",
        "Health information of evacuees is sensitive personal information. Only health workers and the system administrator may view or update it, and it is used only to provide assistance. It is never shown on the public website.",
        "RA 10173 (Data Privacy Act of 2012)", "Draft (sample)"],
      ["P-07", "Policy", "Evacuation center capacity",
        "A center is marked Nearly Full at 80% of capacity and Full at 100%. New arrivals at a full center are directed to the nearest open center.",
        "Barangay policy (to be confirmed)", "Draft (sample)"]
    ]
  }
};

// Run from the Apps Script editor (or CECMS > Create missing tabs).
// Creates any missing tab. A tab that only has a heading row (or is empty)
// gets the latest headings and sample rows. Tabs with data are left untouched.
function setupSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(TABS).forEach(function (name) {
    var def = TABS[name];
    var sheet = ss.getSheetByName(name) || ss.insertSheet(name);
    if (sheet.getLastRow() > 1) return;
    sheet.clear();
    var rows = def.rows.map(function (row, i) {
      if (name !== "Supplies") return row;
      var r = i + 2;
      return row.slice(0, 6).concat(["=E" + r + "-F" + r], row.slice(7));
    });
    var all = [def.headers].concat(rows);
    sheet.getRange(1, 1, all.length, def.headers.length).setValues(all);
    sheet.getRange(1, 1, 1, def.headers.length).setFontWeight("bold").setBackground("#d9ead3");
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, def.headers.length);
  });
  ss.setActiveSheet(ss.getSheetByName("Centers"));
  ss.toast("All tabs are ready.", "CECMS");
}

// ---------------------------------------------------------------------------
// Website connection
// ---------------------------------------------------------------------------

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var requested = String((e && e.parameter && e.parameter.tabs) || READABLE_TABS.join(",")).split(",");
  var result = {};
  requested.forEach(function (name) {
    if (READABLE_TABS.indexOf(name) === -1) return;
    var sheet = ss.getSheetByName(name);
    result[name] = sheet ? sheet.getDataRange().getDisplayValues() : [];
  });
  return respond(result);
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    if (WRITABLE_TABS.indexOf(body.tab) === -1) return respond({ error: "Tab not writable: " + body.tab });
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(body.tab);
    if (!sheet) return respond({ error: "Tab not found: " + body.tab });
    var row = (body.row || []).slice(0, 20).map(asText);
    sheet.appendRow(row);
    return respond({ ok: true });
  } catch (err) {
    return respond({ error: String(err) });
  }
}

// Saves every value as plain text. This keeps the leading 0 in phone numbers
// and stops typed text like "=IMPORTXML(...)" from running as a formula.
function asText(value) {
  var text = String(value == null ? "" : value);
  return text ? "'" + text : "";
}

function respond(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

// ---------------------------------------------------------------------------
// CECMS menu: generates printable forms and reports as Google Docs
// ---------------------------------------------------------------------------

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("CECMS")
    .addItem("Family registration form (selected family)", "generateFamilyForm")
    .addItem("Health record (selected evacuee)", "generateHealthRecord")
    .addItem("Daily evacuation center report", "generateDailyReport")
    .addItem("Relief distribution list", "generateDistributionList")
    .addSeparator()
    .addItem("Link center occupancy to Evacuees tab", "linkOccupancy")
    .addItem("Create missing tabs", "setupSheet")
    .addToUi();
}

// Reads a tab as an array of objects keyed by heading. Blank rows are kept
// so that rows[i] always matches sheet row i + 2.
function readTab(name) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sheet || sheet.getLastRow() < 1) return [];
  var values = sheet.getDataRange().getDisplayValues();
  var headers = values[0].map(function (h) { return String(h).trim(); });
  return values.slice(1).map(function (row) {
    var obj = {};
    headers.forEach(function (h, i) { obj[h] = row[i]; });
    return obj;
  });
}

function nonEmpty(rows, key) {
  return rows.filter(function (r) { return String(r[key] || "").trim() !== ""; });
}

function toNum(value) {
  var n = Number(String(value).replace(/,/g, ""));
  return isFinite(n) && n > 0 ? n : 0;
}

function today() {
  return Utilities.formatDate(new Date(), TIMEZONE, "yyyy-MM-dd");
}

function centerName(centers, id) {
  for (var i = 0; i < centers.length; i++) {
    if (centers[i].center_id === id) return centers[i].name;
  }
  return id || "";
}

// Same rule as the website: override, else Full at 100%, Nearly Full at 80%.
function centerStatus(capacity, occupancy, override) {
  var manual = ["Open", "Nearly Full", "Full", "Closed"].filter(function (s) {
    return s.toLowerCase() === String(override || "").trim().toLowerCase();
  })[0];
  if (manual) return manual;
  if (capacity <= 0) return "Closed";
  if (occupancy >= capacity) return "Full";
  if (occupancy / capacity >= 0.8) return "Nearly Full";
  return "Open";
}

// Returns the data row (as an object) the user has selected on the given tab,
// or null after showing an explanation.
function selectedRow(tabName, idKey, what) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ui = SpreadsheetApp.getUi();
  var sheet = ss.getActiveSheet();
  if (sheet.getName() !== tabName) {
    ui.alert("Open the " + tabName + " tab and click any cell in the " + what + "'s row, then try again.");
    return null;
  }
  var row = ss.getActiveRange().getRow();
  var record = readTab(tabName)[row - 2];
  if (row < 2 || !record || !record[idKey]) {
    ui.alert("Click a cell in a " + what + "'s row (not the heading row), then try again.");
    return null;
  }
  return record;
}

// ----- Google Docs helpers -----

function newDoc(title, subtitle) {
  var doc = DocumentApp.create(title + " " + today());
  var body = doc.getBody();
  body.setMarginTop(40).setMarginBottom(40).setMarginLeft(48).setMarginRight(48);
  var first = body.getParagraphs()[0];
  first.setText("Republic of the Philippines").setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  body.appendParagraph(CITY).setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  body.appendParagraph(BARANGAY).setAlignment(DocumentApp.HorizontalAlignment.CENTER).editAsText().setBold(true);
  body.appendParagraph("Barangay Disaster Risk Reduction and Management Committee").setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  body.appendParagraph(title.toUpperCase())
    .setHeading(DocumentApp.ParagraphHeading.HEADING1)
    .setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  if (subtitle) body.appendParagraph(subtitle).setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  body.appendParagraph("DRAFT FORMAT: to be replaced with the barangay's official form.")
    .setAlignment(DocumentApp.HorizontalAlignment.CENTER)
    .editAsText().setItalic(true).setFontSize(9);
  return doc;
}

function heading(body, text) {
  body.appendParagraph(text).setHeading(DocumentApp.ParagraphHeading.HEADING3);
}

// rows: array of arrays. The first row is bold when hasHeader is true.
function table(body, rows, hasHeader) {
  var cells = rows.map(function (r) { return r.map(function (c) { return String(c == null ? "" : c); }); });
  var t = body.appendTable(cells);
  t.editAsText().setFontSize(9);
  if (hasHeader) t.getRow(0).editAsText().setBold(true);
  return t;
}

function signatures(body, labels) {
  body.appendParagraph("");
  table(body, [
    labels.map(function () { return "\n\n______________________________"; }),
    labels
  ], false).setBorderWidth(0);
}

function finish(doc) {
  doc.saveAndClose();
  var url = doc.getUrl();
  var html = HtmlService.createHtmlOutput(
    '<div style="font-family:Arial,sans-serif;font-size:14px">' +
      "<p>Your document is ready. It was saved to your Google Drive.</p>" +
      '<p><a href="' + url + '" target="_blank" style="font-weight:bold">Open document</a></p>' +
      "<p>In the document, use File &gt; Print or File &gt; Download &gt; PDF.</p></div>"
  ).setWidth(380).setHeight(170);
  SpreadsheetApp.getUi().showModalDialog(html, "Form ready");
}

// ----- Generators -----

function generateFamilyForm() {
  var family = selectedRow("Families", "family_id", "family");
  if (!family) return;
  var centers = readTab("Centers");
  var members = readTab("Evacuees").filter(function (e) { return e.family_id === family.family_id; });
  var health = readTab("HealthRecords");

  var doc = newDoc("Family Registration Form", "Family ID: " + family.family_id);
  var body = doc.getBody();

  heading(body, "A. Family information");
  table(body, [
    ["Head of family", family.head_of_family, "Family ID", family.family_id],
    ["Purok / Address", family.purok + ", Brgy. Pangabugan", "Contact number", family.contact_number],
    ["Evacuation center", centerName(centers, family.center_id), "Date registered", family.date_registered],
    ["House damage", family.house_damage, "Number of members", members.length]
  ], false);

  heading(body, "B. Family members");
  var memberRows = [["No.", "Full name", "Relationship", "Age", "Sex", "Vulnerable group", "Status"]];
  members.forEach(function (m, i) {
    memberRows.push([i + 1, m.full_name, m.relationship, m.age, m.sex, m.vulnerable_group || "None", m.status]);
  });
  if (members.length === 0) memberRows.push(["", "No members recorded in the Evacuees tab", "", "", "", "", ""]);
  table(body, memberRows, true);

  heading(body, "C. Health notes (latest check per member)");
  var ids = members.map(function (m) { return m.evacuee_id; });
  var notes = [["Name", "Date", "Complaints", "Allergies", "Action taken"]];
  ids.forEach(function (id) {
    var recs = health.filter(function (h) { return h.evacuee_id === id; });
    var last = recs[recs.length - 1];
    if (last) notes.push([last.full_name, last.date, last.complaints, last.allergies, last.action_taken]);
  });
  if (notes.length === 1) notes.push(["No health records yet", "", "", "", ""]);
  table(body, notes, true);

  body.appendParagraph("I certify that the information above is true and correct.").editAsText().setItalic(true);
  signatures(body, ["Signature of head of family", "Registered by (name and signature)"]);
  finish(doc);
}

function generateHealthRecord() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tab = ss.getActiveSheet().getName();
  // Works from either the Evacuees tab or the HealthRecords tab.
  var picked = tab === "HealthRecords"
    ? selectedRow("HealthRecords", "evacuee_id", "health record")
    : selectedRow("Evacuees", "evacuee_id", "evacuee");
  if (!picked) return;

  var evacuee = readTab("Evacuees").filter(function (e) { return e.evacuee_id === picked.evacuee_id; })[0] || picked;
  var centers = readTab("Centers");
  var visits = readTab("HealthRecords").filter(function (h) { return h.evacuee_id === picked.evacuee_id; });

  var doc = newDoc("Evacuee Health Record", "CONFIDENTIAL: sensitive personal information (RA 10173)");
  var body = doc.getBody();

  heading(body, "A. Personal information");
  table(body, [
    ["Full name", evacuee.full_name, "Evacuee ID", evacuee.evacuee_id],
    ["Age", evacuee.age || "", "Sex", evacuee.sex || ""],
    ["Family ID", evacuee.family_id || "", "Evacuation center", centerName(centers, evacuee.center_id)],
    ["Vulnerable group", evacuee.vulnerable_group || "None", "Status", evacuee.status || ""]
  ], false);

  heading(body, "B. Health checks");
  var rows = [["Date", "BP", "Temp (°C)", "Complaints", "Allergies", "Maintenance medicine", "Action", "Referred to", "Recorded by"]];
  visits.forEach(function (v) {
    rows.push([v.date, v.blood_pressure, v.temperature_c, v.complaints, v.allergies, v.maintenance_medicine, v.action_taken, v.referred_to, v.recorded_by]);
  });
  if (visits.length === 0) rows.push(["No health checks recorded yet", "", "", "", "", "", "", "", ""]);
  table(body, rows, true);

  signatures(body, ["Health worker (name and signature)", "Noted by"]);
  finish(doc);
}

function generateDailyReport() {
  var centers = nonEmpty(readTab("Centers"), "center_id");
  var evacuees = nonEmpty(readTab("Evacuees"), "evacuee_id").filter(function (e) { return e.status === "Sheltered"; });
  var families = nonEmpty(readTab("Families"), "family_id").filter(function (f) { return f.status === "Sheltered"; });
  var supplies = nonEmpty(readTab("Supplies"), "supply_id");
  var health = nonEmpty(readTab("HealthRecords"), "record_id");
  var useRegistry = evacuees.length > 0;

  var doc = newDoc("Daily Evacuation Center Report", "As of " + Utilities.formatDate(new Date(), TIMEZONE, "MMMM d, yyyy h:mm a"));
  var body = doc.getBody();

  heading(body, "A. Evacuation center status");
  var statusRows = [["Center", "Capacity", "Families", "Persons", "Available", "Status"]];
  var totals = { capacity: 0, families: 0, persons: 0, available: 0 };
  centers.forEach(function (c) {
    var capacity = toNum(c.capacity);
    var persons = useRegistry
      ? evacuees.filter(function (e) { return e.center_id === c.center_id; }).length
      : toNum(c.occupancy);
    var fams = families.filter(function (f) { return f.center_id === c.center_id; }).length;
    var status = centerStatus(capacity, persons, c.status_override);
    var available = status === "Closed" ? 0 : Math.max(capacity - persons, 0);
    totals.capacity += capacity; totals.families += fams; totals.persons += persons; totals.available += available;
    statusRows.push([c.name, capacity, fams, persons, available, status]);
  });
  statusRows.push(["TOTAL", totals.capacity, totals.families, totals.persons, totals.available, ""]);
  table(body, statusRows, true);
  if (!useRegistry) body.appendParagraph("Persons taken from the Centers tab (no sheltered evacuees registered yet).").editAsText().setItalic(true).setFontSize(9);

  heading(body, "B. Vulnerable groups (sheltered)");
  var vRows = [["Center"].concat(VULNERABLE_GROUPS)];
  centers.forEach(function (c) {
    var here = evacuees.filter(function (e) { return e.center_id === c.center_id; });
    vRows.push([c.name].concat(VULNERABLE_GROUPS.map(function (g) {
      return here.filter(function (e) { return e.vulnerable_group === g; }).length;
    })));
  });
  table(body, vRows, true);

  heading(body, "C. Supplies on hand");
  var sRows = [["Center", "Item", "Unit", "Received", "Released", "Remaining"]];
  supplies.forEach(function (s) {
    sRows.push([centerName(centers, s.center_id), s.item, s.unit, s.quantity_received, s.quantity_released,
      s.remaining || (toNum(s.quantity_received) - toNum(s.quantity_released))]);
  });
  if (supplies.length === 0) sRows.push(["No supplies recorded", "", "", "", "", ""]);
  table(body, sRows, true);

  heading(body, "D. Health summary");
  var referred = health.filter(function (h) { return h.action_taken === "Referred"; }).length;
  table(body, [
    ["Health checks recorded", health.length],
    ["Referred to health facility", referred],
    ["Health checks today (" + today() + ")", health.filter(function (h) { return h.date === today(); }).length]
  ], false);

  signatures(body, ["Prepared by (center coordinator)", "Noted by (Barangay Captain)"]);
  finish(doc);
}

function generateDistributionList() {
  var ui = SpreadsheetApp.getUi();
  var centers = nonEmpty(readTab("Centers"), "center_id");
  var ids = centers.map(function (c) { return c.center_id; });
  var answer = ui.prompt("Relief distribution list", "Enter the center ID (" + ids.join(", ") + "):", ui.ButtonSet.OK_CANCEL);
  if (answer.getSelectedButton() !== ui.Button.OK) return;
  var centerId = answer.getResponseText().trim().toUpperCase();
  if (ids.indexOf(centerId) === -1) {
    ui.alert("Center ID \"" + centerId + "\" was not found. Use one of: " + ids.join(", "));
    return;
  }

  var families = nonEmpty(readTab("Families"), "family_id").filter(function (f) {
    return f.center_id === centerId && f.status === "Sheltered";
  });
  var evacuees = readTab("Evacuees");
  var dists = readTab("Distributions");

  var doc = newDoc("Relief Distribution List", centerName(centers, centerId) + " | Date: ____________");
  var body = doc.getBody();

  var rows = [["No.", "Family ID", "Head of family", "Members", "Items already received", "Item / Qty released today", "Signature"]];
  families.forEach(function (f, i) {
    var members = evacuees.filter(function (e) { return e.family_id === f.family_id && e.status === "Sheltered"; }).length;
    var received = dists.filter(function (d) { return d.family_id === f.family_id; })
      .map(function (d) { return d.item + " x" + d.quantity; }).join("; ");
    rows.push([i + 1, f.family_id, f.head_of_family, members, received || "None", "", ""]);
  });
  if (families.length === 0) rows.push(["", "", "No sheltered families in this center", "", "", "", ""]);
  table(body, rows, true);

  signatures(body, ["Released by (name and signature)", "Noted by (Barangay Captain)"]);
  finish(doc);
}

// Replaces the Centers occupancy numbers with a live count of sheltered
// evacuees, so the website matches the Evacuees tab.
function linkOccupancy() {
  var ui = SpreadsheetApp.getUi();
  var ok = ui.alert("Link occupancy",
    "This replaces the numbers in Centers > occupancy with an automatic count of sheltered evacuees from the Evacuees tab. Continue?",
    ui.ButtonSet.YES_NO);
  if (ok !== ui.Button.YES) return;

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var centers = ss.getSheetByName("Centers");
  var evac = ss.getSheetByName("Evacuees");
  var cHead = centers.getRange(1, 1, 1, centers.getLastColumn()).getDisplayValues()[0];
  var eHead = evac.getRange(1, 1, 1, evac.getLastColumn()).getDisplayValues()[0];
  var idCol = cHead.indexOf("center_id") + 1;
  var occCol = cHead.indexOf("occupancy") + 1;
  var eCenter = columnLetter(eHead.indexOf("center_id") + 1);
  var eStatus = columnLetter(eHead.indexOf("status") + 1);
  if (!idCol || !occCol || eCenter === "" || eStatus === "") {
    ui.alert("Could not find the center_id, occupancy, or status headings. Check row 1 of Centers and Evacuees.");
    return;
  }
  var idLetter = columnLetter(idCol);
  var last = centers.getLastRow();
  for (var r = 2; r <= last; r++) {
    centers.getRange(r, occCol).setFormula(
      "=COUNTIFS(Evacuees!" + eCenter + ":" + eCenter + ", " + idLetter + r + ", Evacuees!" + eStatus + ":" + eStatus + ", \"Sheltered\")"
    );
  }
  ss.toast("Occupancy now updates automatically from the Evacuees tab.", "CECMS");
}

function columnLetter(n) {
  var s = "";
  while (n > 0) {
    var m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}
