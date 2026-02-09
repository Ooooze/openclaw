import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "..");

// This directory is gitignored and used in dev + as input for build/prepare scripts.
const runtimeRoot = path.join(appRoot, ".memo-runtime");

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
    headers: ghHeaders("openclaw-electron-desktop/fetch-memo-runtime"),
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
  // This avoids flaky rebuilds when the cache dir already contains the asset.
  if (fs.existsSync(destPath)) {
    try {
      const st = fs.statSync(destPath);
      if (
        st.isFile() &&
        st.size > 0 &&
        String(process.env.MEMO_FORCE_DOWNLOAD || "").trim() !== "1"
      ) {
        return;
      }
    } catch {
      // Ignore stat errors and continue with a download attempt.
    }
  }

  const res = await fetch(url, {
    headers: ghHeaders("openclaw-electron-desktop/fetch-memo-runtime"),
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

function extractTarGz(params) {
  const { archivePath, extractDir } = params;
  rmrf(extractDir);
  ensureDir(extractDir);
  const res = spawnSync("tar", ["-xzf", archivePath, "-C", extractDir], { encoding: "utf-8" });
  if (res.status !== 0) {
    const stderr = String(res.stderr || "").trim();
    throw new Error(`failed to untar memo archive: ${stderr || "unknown error"}`);
  }
}

function listDirSafe(p) {
  try {
    return fs.readdirSync(p, { withFileTypes: true });
  } catch {
    return [];
  }
}

function findSingleChildDir(rootDir) {
  const dirs = listDirSafe(rootDir)
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
  if (dirs.length === 1) {
    return path.join(rootDir, dirs[0]);
  }
  return null;
}

async function main() {
  if (process.platform !== "darwin") {
    throw new Error("fetch-memo-runtime is macOS-only (darwin)");
  }

  const repo =
    (process.env.MEMO_REPO && String(process.env.MEMO_REPO).trim()) || "antoniorodr/memo";
  const tag = (process.env.MEMO_TAG && String(process.env.MEMO_TAG).trim()) || "latest";
  const apiUrl =
    tag === "latest"
      ? `https://api.github.com/repos/${repo}/releases/latest`
      : `https://api.github.com/repos/${repo}/releases/tags/${tag}`;

  const release = await fetchJson(apiUrl);
  const tagName = typeof release?.tag_name === "string" ? release.tag_name : "";
  if (!tagName) {
    throw new Error(
      `failed to resolve memo release tag_name from GitHub API (repo: ${repo}, tag: ${tag})`
    );
  }

  const tarballUrl = typeof release?.tarball_url === "string" ? release.tarball_url : "";
  if (!tarballUrl) {
    throw new Error(`failed to resolve memo tarball_url from GitHub API (tag: ${tagName})`);
  }

  const cacheDir = path.join(runtimeRoot, "_cache", `${tagName || tag}`);
  const archivePath = path.join(cacheDir, `memo-${tagName}.tar.gz`);
  const extractDir = path.join(cacheDir, "extract");
  const srcDir = path.join(cacheDir, "src");

  console.log(`[electron-desktop] memo runtime dir: ${runtimeRoot}`);
  console.log(`[electron-desktop] memo cache dir: ${cacheDir}`);
  console.log(`[electron-desktop] Downloading memo source tarball: ${tarballUrl}`);
  await downloadToFile(tarballUrl, archivePath);

  console.log(`[electron-desktop] Extracting memo source...`);
  extractTarGz({ archivePath, extractDir });

  // GitHub tarballs contain a single top-level directory.
  rmrf(srcDir);
  const root = findSingleChildDir(extractDir);
  if (!root) {
    throw new Error(
      `unexpected memo tarball layout; could not find single root dir (dir: ${extractDir})`
    );
  }
  fs.renameSync(root, srcDir);
  rmrf(extractDir);

  console.log(`[electron-desktop] memo source ready at: ${srcDir}`);
  console.log(`[electron-desktop] Next: npm run build:memo`);
}

main().catch((err) => {
  console.error(String(err?.stack || err?.message || err));
  process.exitCode = 1;
});
