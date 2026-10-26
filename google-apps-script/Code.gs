// Paste this whole file into your Google Sheet: Extensions > Apps Script.
// Then click Deploy > New deployment > Web app, with
//   Execute as: Me
//   Who has access: Anyone
// and copy the Web app URL into Vercel as SHEET_API_URL.

// Only these tabs can be read by the website (public information).
var READABLE_TABS = ["Centers", "Announcements"];
// Only these tabs can receive new rows from the website.
var WRITABLE_TABS = ["Volunteers"];

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
