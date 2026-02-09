import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "..");

// This directory is gitignored and used in dev + as input for prepare-obsidian-cli-runtime.
const runtimeRoot = path.join(appRoot, ".obsidian-cli-runtime");

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
    headers: ghHeaders("openclaw-electron-desktop/fetch-obsidian-cli-runtime"),
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
        String(process.env.OBSIDIAN_CLI_FORCE_DOWNLOAD || "").trim() !== "1"
      ) {
        return;
      }
    } catch {
      // Ignore and continue with a download attempt.
    }
  }

  const res = await fetch(url, {
    headers: ghHeaders("openclaw-electron-desktop/fetch-obsidian-cli-runtime"),
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
    throw new Error(`failed to unzip obsidian-cli archive: ${stderr || "unknown error"}`);
  }
}

function extractTarGz(params) {
  const { archivePath, extractDir } = params;
  rmrf(extractDir);
  ensureDir(extractDir);
  const res = spawnSync("tar", ["-xzf", archivePath, "-C", extractDir], { encoding: "utf-8" });
  if (res.status !== 0) {
    const stderr = String(res.stderr || "").trim();
    throw new Error(`failed to extract obsidian-cli archive: ${stderr || "unknown error"}`);
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

function normalizeArch(arch) {
  if (arch === "arm64") {
    return "arm64";
  }
  if (arch === "x64") {
    return "amd64";
  }
  return arch;
}

function pickAsset(assets, arch) {
  const known = assets.map((a) => (a && typeof a.name === "string" ? a.name : "")).filter(Boolean);

  const normArch = normalizeArch(arch);
  const scored = known
    .map((name) => {
      const lower = name.toLowerCase();
      let score = 0;
      // Platform signals.
      if (
        lower.includes("darwin") ||
        lower.includes("mac") ||
        lower.includes("macos") ||
        lower.includes("osx")
      ) {
        score += 50;
      }
      // Architecture signals.
      if (lower.includes(normArch)) {
        score += 30;
      }
      if (normArch === "arm64" && (lower.includes("aarch64") || lower.includes("apple"))) {
        score += 10;
      }
      // Archive type.
      if (lower.endsWith(".zip")) {
        score += 5;
      }
      if (lower.endsWith(".tar.gz") || lower.endsWith(".tgz")) {
        score += 5;
      }
      // Prefer smaller/more specific artifacts.
      if (lower.includes("checksums") || lower.includes("sha256")) {
        score -= 100;
      }
      if (lower.includes("source") || lower.endsWith(".txt")) {
        score -= 50;
      }
      return { name, score };
    })
    .filter((x) => x.score > 0)
    .toSorted((a, b) => b.score - a.score);

  const best = scored[0]?.name || "";
  if (!best) {
    return { assetName: "", downloadUrl: "", known };
  }

  const match = assets.find((a) => a && typeof a.name === "string" && a.name === best);
  const downloadUrl =
    match && typeof match.browser_download_url === "string" ? match.browser_download_url : "";
  return { assetName: best, downloadUrl, known };
}

async function main() {
  if (process.platform !== "darwin") {
    throw new Error("fetch-obsidian-cli-runtime is macOS-only (darwin)");
  }

  const platform = process.platform;
  const arch = process.arch;

  const repo =
    (process.env.OBSIDIAN_CLI_REPO && String(process.env.OBSIDIAN_CLI_REPO).trim()) ||
    "Yakitrak/obsidian-cli";
  const tag =
    (process.env.OBSIDIAN_CLI_TAG && String(process.env.OBSIDIAN_CLI_TAG).trim()) || "latest";
  const apiUrl =
    tag === "latest"
      ? `https://api.github.com/repos/${repo}/releases/latest`
      : `https://api.github.com/repos/${repo}/releases/tags/${tag}`;

  const release = await fetchJson(apiUrl);
  const tagName = typeof release?.tag_name === "string" ? release.tag_name : "";
  if (!tagName) {
    throw new Error("failed to resolve obsidian-cli release tag_name from GitHub API");
  }

  const assets = Array.isArray(release?.assets) ? release.assets : [];
  const picked = pickAsset(assets, arch);
  if (!picked.downloadUrl) {
    throw new Error(
      `obsidian-cli asset not found for darwin/${arch}. Known assets: ${picked.known.slice(0, 40).join(", ") || "<none>"}`
    );
  }

  const cacheDir = path.join(runtimeRoot, "_cache", `${tagName || tag}`, `${platform}-${arch}`);
  const archivePath = path.join(cacheDir, picked.assetName);
  const extractDir = path.join(cacheDir, "extract");

  console.log(`[electron-desktop] obsidian-cli runtime dir: ${runtimeRoot}`);
  console.log(`[electron-desktop] obsidian-cli cache dir: ${cacheDir}`);
  console.log(`[electron-desktop] Downloading obsidian-cli: ${picked.downloadUrl}`);
  await downloadToFile(picked.downloadUrl, archivePath);

  console.log(`[electron-desktop] Extracting obsidian-cli archive...`);
  if (picked.assetName.toLowerCase().endsWith(".zip")) {
    extractZip({ archivePath, extractDir });
  } else if (
    picked.assetName.toLowerCase().endsWith(".tar.gz") ||
    picked.assetName.toLowerCase().endsWith(".tgz")
  ) {
    extractTarGz({ archivePath, extractDir });
  } else {
    throw new Error(`unsupported obsidian-cli asset type: ${picked.assetName}`);
  }

  const extractedBin = findFileRecursive(extractDir, (entryName, fullPath) => {
    if (entryName === "obsidian-cli") {
      return true;
    }
    return /(^|\/)obsidian-cli$/i.test(fullPath);
  });
  if (!extractedBin) {
    throw new Error(
      `failed to locate obsidian-cli binary in extracted archive (dir: ${extractDir})`
    );
  }

  const targetDir = path.join(runtimeRoot, `${platform}-${arch}`);
  const targetBin = path.join(targetDir, "obsidian-cli");
  ensureDir(targetDir);
  copyExecutable(extractedBin, targetBin);

  // Sanity check.
  const res = spawnSync(targetBin, ["--help"], { encoding: "utf-8" });
  if (res.status !== 0) {
    const stderr = String(res.stderr || "").trim();
    const stdout = String(res.stdout || "").trim();
    throw new Error(
      `downloaded obsidian-cli failed to run: ${stderr || stdout || "unknown error"}`
    );
  }

  console.log(`[electron-desktop] obsidian-cli downloaded to: ${targetBin}`);
}

main().catch((err) => {
  console.error(String(err?.stack || err?.message || err));
  process.exitCode = 1;
});
