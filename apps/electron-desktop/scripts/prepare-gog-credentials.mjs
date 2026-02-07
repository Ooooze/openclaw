import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "..");
const runtimeRoot = path.join(appRoot, ".gog-runtime");

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function readSourceJson() {
  const fromPath =
    (process.env.OPENCLAW_GOG_OAUTH_CLIENT_SECRET_PATH &&
      String(process.env.OPENCLAW_GOG_OAUTH_CLIENT_SECRET_PATH).trim()) ||
    (process.env.GOG_OAUTH_CLIENT_SECRET_PATH &&
      String(process.env.GOG_OAUTH_CLIENT_SECRET_PATH).trim()) ||
    "";

  if (fromPath) {
    if (!fs.existsSync(fromPath)) {
      throw new Error(`OAuth client secret JSON file not found: ${fromPath}`);
    }
    return fs.readFileSync(fromPath, "utf-8");
  }

  const fromB64Raw =
    (process.env.OPENCLAW_GOG_OAUTH_CLIENT_SECRET_B64 &&
      String(process.env.OPENCLAW_GOG_OAUTH_CLIENT_SECRET_B64).trim()) ||
    (process.env.OPENCLAW_GOG_OAUTH_CLIENT_SECRET_BASE64 &&
      String(process.env.OPENCLAW_GOG_OAUTH_CLIENT_SECRET_BASE64).trim()) ||
    (process.env.GOG_OAUTH_CLIENT_SECRET_B64 &&
      String(process.env.GOG_OAUTH_CLIENT_SECRET_B64).trim()) ||
    (process.env.GOG_OAUTH_CLIENT_SECRET_BASE64 &&
      String(process.env.GOG_OAUTH_CLIENT_SECRET_BASE64).trim()) ||
    "";

  if (fromB64Raw) {
    const compact = fromB64Raw.replace(/\s+/g, "");
    try {
      const decoded = Buffer.from(compact, "base64").toString("utf-8");
      if (!decoded.trim()) {
        throw new Error("decoded content is empty");
      }
      return decoded;
    } catch (err) {
      throw new Error(`Failed to decode OAuth client secret base64: ${String(err)}`, {
        cause: err,
      });
    }
  }

  const fromJson =
    (process.env.OPENCLAW_GOG_OAUTH_CLIENT_SECRET_JSON &&
      String(process.env.OPENCLAW_GOG_OAUTH_CLIENT_SECRET_JSON)) ||
    (process.env.GOG_OAUTH_CLIENT_SECRET_JSON &&
      String(process.env.GOG_OAUTH_CLIENT_SECRET_JSON)) ||
    "";

  if (fromJson.trim()) {
    return fromJson;
  }

  throw new Error(
    [
      "Missing OAuth client secret JSON for gogcli.",
      "Set one of:",
      "- OPENCLAW_GOG_OAUTH_CLIENT_SECRET_PATH=/path/to/client_secret.json",
      "- OPENCLAW_GOG_OAUTH_CLIENT_SECRET_B64='<base64>'",
      "- OPENCLAW_GOG_OAUTH_CLIENT_SECRET_JSON='{...json...}'",
    ].join("\n")
  );
}

function validateOAuthClientSecretJson(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("OAuth client secret is not valid JSON");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("OAuth client secret JSON must be an object");
  }
  const obj = parsed;
  const installed = obj.installed && typeof obj.installed === "object" ? obj.installed : null;
  const web = obj.web && typeof obj.web === "object" ? obj.web : null;
  const container = installed || web || null;
  const clientId =
    (container && typeof container.client_id === "string" ? container.client_id : null) ||
    (typeof obj.client_id === "string" ? obj.client_id : null);
  if (!clientId || !clientId.includes(".apps.googleusercontent.com")) {
    throw new Error("OAuth client secret JSON missing a valid client_id");
  }
}

function writeDeterministicFile(destPath, text) {
  ensureDir(path.dirname(destPath));
  const payload = text.endsWith("\n") ? text : `${text}\n`;
  const tmpPath = `${destPath}.tmp`;
  fs.writeFileSync(tmpPath, payload, { encoding: "utf-8" });
  try {
    fs.chmodSync(tmpPath, 0o600);
  } catch {
    // ignore
  }
  fs.renameSync(tmpPath, destPath);
  try {
    fs.chmodSync(destPath, 0o600);
  } catch {
    // ignore
  }
}

function main() {
  const text = readSourceJson();
  validateOAuthClientSecretJson(text);

  const outDir = path.join(runtimeRoot, "credentials");
  const outPath = path.join(outDir, "gog-client-secret.json");
  writeDeterministicFile(outPath, text);

  console.log(`[electron-desktop] gog OAuth client secret staged at: ${outPath}`);
}

try {
  main();
} catch (err) {
  console.error(String(err?.stack || err?.message || err));
  process.exitCode = 1;
}
