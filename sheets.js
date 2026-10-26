// Talks to the Google Sheet through a small Google Apps Script web app
// (see google-apps-script/Code.gs). The script URL is kept in a Vercel
// environment variable, so visitors never see it.

export function isConfigured() {
  return Boolean(process.env.SHEET_API_URL);
}

async function parseResponse(res) {
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      `Apps Script did not return JSON (HTTP ${res.status}). ` +
        `Make sure the deployment's "Who has access" is set to "Anyone". Response: ${text.slice(0, 120)}`
    );
  }
  if (!res.ok || data.error) throw new Error(`Apps Script error: ${data.error || res.status}`);
  return data;
}

// Turns [[header...], [row...], ...] into [{header: value}, ...].
// Headers are normalized to snake_case so "Last Updated" becomes "last_updated".
function rowsToObjects(values = []) {
  const [headerRow, ...rows] = values;
  if (!headerRow) return [];
  const keys = headerRow.map((h) =>
    String(h).trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")
  );
  return rows
    .filter((row) => row.some((cell) => String(cell).trim() !== ""))
    .map((row) => Object.fromEntries(keys.map((key, i) => [key, row[i] ?? ""])));
}

// Reads several tabs in one request. Returns { TabName: [objects] }.
export async function readTabs(tabNames) {
  const url = new URL(process.env.SHEET_API_URL);
  url.searchParams.set("tabs", tabNames.join(","));
  const data = await parseResponse(await fetch(url, { redirect: "follow" }));
  return Object.fromEntries(tabNames.map((name) => [name, rowsToObjects(data[name])]));
}

// Appends one row to the bottom of a tab.
export async function appendRow(tabName, row) {
  const res = await fetch(process.env.SHEET_API_URL, {
    method: "POST",
    // text/plain avoids a CORS preflight and is what Apps Script handles most reliably.
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ tab: tabName, row }),
    redirect: "follow",
  });
  return parseResponse(res);
}
