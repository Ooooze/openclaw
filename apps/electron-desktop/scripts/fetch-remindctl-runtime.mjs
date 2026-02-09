import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "..");

// This directory is gitignored and used in dev + as input for prepare-remindctl-runtime.
const runtimeRoot = path.join(appRoot, ".remindctl-runtime");

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function rmrf(p) {
  try {
    fs.rmSync(p, { recursive: true, force: true });
  } catch {
    // ignore
  }
}

function listDirSafe(p) {
  try {
    return fs.readdirSync(p);
  } catch {
    return [];
  }
}

function ghHeaders(userAgent) {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": userAgent,
  };
  // Use GITHUB_TOKEN / GH_TOKEN when available to avoid GitHub API rate limits.
  const token = (process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "").trim();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function fetchJson(url) {
  if (typeof fetch !== "function") {
    throw new Error("global fetch() not available; please run this script with Node 18+");
  }
  const res = await fetch(url, {
    headers: ghHeaders("openclaw-electron-desktop/fetch-remindctl-runtime"),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} fetching ${url}: ${text || res.statusText}`);
  }
  return await res.json();
}

async function downloadToFile(url, destPath) {
  if (typeof fetch !== "function") {
    throw new Error("global fetch() not available; please run this script with Node 18+");
  }

  // Treat an existing non-empty destination as a cache hit.
  if (fs.existsSync(destPath)) {
    try {
      const st = fs.statSync(destPath);
      if (
        st.isFile() &&
        st.size > 0 &&
        String(process.env.REMINDCTL_FORCE_DOWNLOAD || "").trim() !== "1"
      ) {
        return;
      }
    } catch {
      // Ignore and continue with a download attempt.
    }
  }

  const res = await fetch(url, {
    headers: ghHeaders("openclaw-electron-desktop/fetch-remindctl-runtime"),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} downloading ${url}: ${text || res.statusText}`);
  }
  ensureDir(path.dirname(destPath));
  const tmpPath = `${destPath}.tmp`;
  try {
    fs.rmSync(tmpPath, { force: true });
  } catch {
    // ignore
  }
  try {
    const body = res.body;
    if (!body) {
      throw new Error(`empty response body for ${url}`);
    }
    await pipeline(Readable.fromWeb(body), fs.createWriteStream(tmpPath));
    fs.renameSync(tmpPath, destPath);
  } finally {
    try {
      fs.rmSync(tmpPath, { force: true });
    } catch {
      // ignore
    }
  }
}

function extractZip(params) {
  const { archivePath, extractDir } = params;
  rmrf(extractDir);
  ensureDir(extractDir);
  const res = spawnSync("unzip", ["-q", archivePath, "-d", extractDir], { encoding: "utf-8" });
  if (res.status !== 0) {
    const stderr = String(res.stderr || "").trim();
    throw new Error(`failed to unzip remindctl archive: ${stderr || "unknown error"}`);
  }
}

function findFileRecursive(rootDir, matcher) {
  const queue = [rootDir];
  while (queue.length > 0) {
    const dir = queue.shift();
    if (!dir) {
      continue;
    }
    for (const entry of listDirSafe(dir)) {
      const full = path.join(dir, entry);
      let st;
      try {
        st = fs.statSync(full);
      } catch {
        continue;
      }
      if (st.isDirectory()) {
        queue.push(full);
        continue;
      }
      if (st.isFile() && matcher(entry, full)) {
        return full;
      }
    }
  }
  return null;
}

function copyExecutable(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
  fs.chmodSync(dest, 0o755);
}

async function main() {
  if (process.platform !== "darwin") {
    throw new Error("fetch-remindctl-runtime is macOS-only (darwin)");
  }

  const platform = process.platform;
  const arch = process.arch;

  const repo =
    (process.env.REMINDCTL_REPO && String(process.env.REMINDCTL_REPO).trim()) ||
    "steipete/remindctl";
  const tag = (process.env.REMINDCTL_TAG && String(process.env.REMINDCTL_TAG).trim()) || "latest";
  const apiUrl =
    tag === "latest"
      ? `https://api.github.com/repos/${repo}/releases/latest`
      : `https://api.github.com/repos/${repo}/releases/tags/${tag}`;

  const release = await fetchJson(apiUrl);
  const tagName = typeof release?.tag_name === "string" ? release.tag_name : "";
  if (!tagName) {
    throw new Error("failed to resolve remindctl release tag_name from GitHub API");
  }

  const assets = Array.isArray(release?.assets) ? release.assets : [];
  const match = assets.find(
    (a) => a && typeof a.name === "string" && a.name === "remindctl-macos.zip"
  );
  const assetName = match && typeof match.name === "string" ? match.name : "";
  const downloadUrl =
    match && typeof match.browser_download_url === "string" ? match.browser_download_url : "";
  if (!downloadUrl) {
    const known = assets
      .map((a) => (a && typeof a.name === "string" ? a.name : ""))
      .filter(Boolean)
      .slice(0, 40)
      .join(", ");
    throw new Error(
      `remindctl asset not found. Expected remindctl-macos.zip. Known assets: ${known || "<none>"}`
    );
  }

  const cacheDir = path.join(runtimeRoot, "_cache", `${tagName || tag}`, `${platform}-${arch}`);
  const archivePath = path.join(cacheDir, assetName);
  const extractDir = path.join(cacheDir, "extract");

  console.log(`[electron-desktop] remindctl runtime dir: ${runtimeRoot}`);
  console.log(`[electron-desktop] remindctl cache dir: ${cacheDir}`);
  console.log(`[electron-desktop] Downloading remindctl: ${downloadUrl}`);
  await downloadToFile(downloadUrl, archivePath);

  console.log(`[electron-desktop] Extracting remindctl archive...`);
  extractZip({ archivePath, extractDir });

  const extractedBin = findFileRecursive(extractDir, (entryName, fullPath) => {
    if (entryName === "remindctl") {
      return true;
    }
    return /(^|\/)remindctl$/i.test(fullPath);
  });
  if (!extractedBin) {
    throw new Error(`failed to locate remindctl binary in extracted archive (dir: ${extractDir})`);
  }

  const targetDir = path.join(runtimeRoot, `${platform}-${arch}`);
  const targetBin = path.join(targetDir, "remindctl");
  ensureDir(targetDir);
  copyExecutable(extractedBin, targetBin);

  // Sanity check.
  const res = spawnSync(targetBin, ["--help"], { encoding: "utf-8" });
  if (res.status !== 0) {
    const stderr = String(res.stderr || "").trim();
    const stdout = String(res.stdout || "").trim();
    throw new Error(`downloaded remindctl failed to run: ${stderr || stdout || "unknown error"}`);
  }

  console.log(`[electron-desktop] remindctl downloaded to: ${targetBin}`);
}

main().catch((err) => {
  console.error(String(err?.stack || err?.message || err));
  process.exitCode = 1;
});
