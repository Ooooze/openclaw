import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "..");

// This directory is gitignored and used in dev + as input for prepare-jq-runtime.
const runtimeRoot = path.join(appRoot, ".jq-runtime");

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function listDirSafe(p) {
  try {
    return fs.readdirSync(p);
  } catch {
    return [];
  }
}

function rmrf(p) {
  try {
    fs.rmSync(p, { recursive: true, force: true });
  } catch {
    // ignore
  }
}

function resolveAssetCandidates(platform, arch) {
  if (platform !== "darwin") {
    throw new Error(`unsupported platform for jq bundle: ${platform}`);
  }
  if (arch === "arm64") {
    return [
      /(^|\/)jq-macos-arm64(\.exe)?$/i,
      /(^|\/)jq-osx-arm64(\.exe)?$/i,
      /(^|\/)jq-darwin-arm64(\.exe)?$/i,
      /(^|\/)jq.*macos.*arm64/i,
    ];
  }
  if (arch === "x64") {
    return [
      /(^|\/)jq-macos-amd64(\.exe)?$/i,
      /(^|\/)jq-macos-x86_64(\.exe)?$/i,
      /(^|\/)jq-osx-amd64(\.exe)?$/i,
      /(^|\/)jq-darwin-amd64(\.exe)?$/i,
      /(^|\/)jq.*macos.*(amd64|x86_64)/i,
    ];
  }
  throw new Error(`unsupported arch for jq bundle: ${arch}`);
}

async function fetchJson(url) {
  if (typeof fetch !== "function") {
    throw new Error("global fetch() not available; please run this script with Node 18+");
  }
  const res = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "openclaw-electron-desktop/fetch-jq-runtime",
    },
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
        String(process.env.JQ_FORCE_DOWNLOAD || "").trim() !== "1"
      ) {
        return;
      }
    } catch {
      // Ignore and continue with a download attempt.
    }
  }

  const res = await fetch(url, {
    headers: {
      "User-Agent": "openclaw-electron-desktop/fetch-jq-runtime",
    },
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

function isTarGz(filename) {
  const lower = String(filename || "").toLowerCase();
  return lower.endsWith(".tar.gz") || lower.endsWith(".tgz");
}

function isZip(filename) {
  return String(filename || "")
    .toLowerCase()
    .endsWith(".zip");
}

function extractArchive(params) {
  const { archivePath, extractDir } = params;
  rmrf(extractDir);
  ensureDir(extractDir);

  if (isZip(archivePath)) {
    const res = spawnSync("unzip", ["-q", archivePath, "-d", extractDir], { encoding: "utf-8" });
    if (res.status !== 0) {
      const stderr = String(res.stderr || "").trim();
      throw new Error(`failed to unzip jq archive: ${stderr || "unknown error"}`);
    }
    return;
  }

  if (isTarGz(archivePath)) {
    const res = spawnSync("tar", ["-xzf", archivePath, "-C", extractDir], { encoding: "utf-8" });
    if (res.status !== 0) {
      const stderr = String(res.stderr || "").trim();
      throw new Error(`failed to untar jq archive: ${stderr || "unknown error"}`);
    }
    return;
  }

  throw new Error(`unsupported jq archive type: ${archivePath}`);
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
    throw new Error("fetch-jq-runtime is macOS-only (darwin)");
  }

  const platform = process.platform;
  const arch = process.arch;

  const repo = (process.env.JQ_REPO && String(process.env.JQ_REPO).trim()) || "jqlang/jq";
  const tag = (process.env.JQ_TAG && String(process.env.JQ_TAG).trim()) || "latest";
  const apiUrl =
    tag === "latest"
      ? `https://api.github.com/repos/${repo}/releases/latest`
      : `https://api.github.com/repos/${repo}/releases/tags/${tag}`;

  const release = await fetchJson(apiUrl);
  const tagName = typeof release?.tag_name === "string" ? release.tag_name : "";
  if (!tagName) {
    throw new Error("failed to resolve jq release tag_name from GitHub API");
  }

  const assets = Array.isArray(release?.assets) ? release.assets : [];
  const candidates = resolveAssetCandidates(platform, arch);
  const match = assets.find((a) => {
    const name = a && typeof a.name === "string" ? a.name : "";
    return name && candidates.some((re) => re.test(name));
  });
  const assetName = match && typeof match.name === "string" ? match.name : "";
  const downloadUrl =
    match && typeof match.browser_download_url === "string" ? match.browser_download_url : "";
  if (!downloadUrl) {
    const known = assets
      .map((a) => (a && typeof a.name === "string" ? a.name : ""))
      .filter(Boolean)
      .slice(0, 60)
      .join(", ");
    throw new Error(
      `jq asset not found for ${platform}/${arch}. Known assets (first 60): ${known || "<none>"}`
    );
  }

  const cacheDir = path.join(runtimeRoot, "_cache", `${tagName || tag}`, `${platform}-${arch}`);
  const archivePath = path.join(cacheDir, assetName);
  const extractDir = path.join(cacheDir, "extract");

  console.log(`[electron-desktop] jq runtime dir: ${runtimeRoot}`);
  console.log(`[electron-desktop] jq cache dir: ${cacheDir}`);
  console.log(`[electron-desktop] Downloading jq: ${downloadUrl}`);
  await downloadToFile(downloadUrl, archivePath);

  let extractedBin = null;
  if (isZip(assetName) || isTarGz(assetName)) {
    extractArchive({ archivePath, extractDir });
    extractedBin = findFileRecursive(extractDir, (entryName, fullPath) => {
      if (entryName === "jq" || entryName === "jq.exe") {
        return true;
      }
      // Some archives may contain a suffixed binary; accept only executable-looking file names.
      if (/^jq[-_]/i.test(entryName)) {
        return true;
      }
      // Fall back to a direct path match.
      return /(^|\/)jq(\.exe)?$/i.test(fullPath);
    });
    if (!extractedBin) {
      throw new Error(`failed to locate jq binary in extracted archive (dir: ${extractDir})`);
    }
  } else {
    // Some releases provide a raw binary asset (no archive).
    extractedBin = archivePath;
  }

  const targetDir = path.join(runtimeRoot, `${platform}-${arch}`);
  const targetBin = path.join(targetDir, "jq");
  ensureDir(targetDir);
  copyExecutable(extractedBin, targetBin);

  // Sanity check.
  const res = spawnSync(targetBin, ["--version"], { encoding: "utf-8" });
  if (res.status !== 0) {
    const stderr = String(res.stderr || "").trim();
    const stdout = String(res.stdout || "").trim();
    throw new Error(`downloaded jq failed to run: ${stderr || stdout || "unknown error"}`);
  }

  console.log(`[electron-desktop] jq downloaded to: ${targetBin}`);
}

main().catch((err) => {
  console.error(String(err?.stack || err?.message || err));
  process.exitCode = 1;
});
