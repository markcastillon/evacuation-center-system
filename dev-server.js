// Local development server: `npm run dev`, then open http://localhost:3000
// Serves /public and runs the /api functions the same way Vercel does,
// so no Vercel CLI or npm install is needed to try the project.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(ROOT, "public");
const PORT = Number(process.env.PORT) || 3000;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".json": "application/json",
};

// Load .env without a dependency.
const envPath = path.join(ROOT, ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match && !(match[1] in process.env)) process.env[match[1]] = match[2];
  }
}

// Gives Node's response the res.status().json() helpers Vercel provides.
function withHelpers(res) {
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(body));
    return res;
  };
  return res;
}

async function readBody(req) {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  if (!raw) return undefined;
  if ((req.headers["content-type"] || "").includes("application/json")) {
    try { return JSON.parse(raw); } catch { return raw; }
  }
  return raw;
}

async function handleApi(req, res, name) {
  const file = path.join(ROOT, "api", `${name}.js`);
  if (!/^[a-z0-9-]+$/i.test(name) || !fs.existsSync(file)) {
    return withHelpers(res).status(404).json({ error: "Not found" });
  }
  req.body = await readBody(req);
  const mod = await import(`${pathToFileURL(file).href}?t=${Date.now()}`);
  await mod.default(req, withHelpers(res));
}

function serveStatic(req, res, pathname) {
  const target = path.normalize(path.join(PUBLIC_DIR, pathname === "/" ? "index.html" : pathname));
  if (!target.startsWith(PUBLIC_DIR) || !fs.existsSync(target) || fs.statSync(target).isDirectory()) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    return res.end("Not found");
  }
  res.writeHead(200, { "Content-Type": MIME[path.extname(target)] || "application/octet-stream" });
  fs.createReadStream(target).pipe(res);
}

http
  .createServer(async (req, res) => {
    const { pathname } = new URL(req.url, `http://${req.headers.host}`);
    try {
      const api = pathname.match(/^\/api\/([^/]+)\/?$/);
      if (api) return await handleApi(req, res, api[1]);
      serveStatic(req, res, decodeURIComponent(pathname));
    } catch (err) {
      console.error(err);
      if (!res.headersSent) res.writeHead(500);
      res.end("Server error");
    }
  })
  .listen(PORT, () => {
    const mode = process.env.SHEET_API_URL ? "Google Sheet" : "sample data (no .env found)";
    console.log(`Running at http://localhost:${PORT} using ${mode}`);
  });
