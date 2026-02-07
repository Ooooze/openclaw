import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "..");
const outRoot = path.join(appRoot, "vendor", "obsidian-cli");
const runtimeRoot = path.join(appRoot, ".obsidian-cli-runtime");

function rmrf(p) {
  try {
    fs.rmSync(p, { recursive: true, force: true });
  } catch {
    // ignore
  }
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function copyExecutable(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
  fs.chmodSync(dest, 0o755);
}

async function main() {
  if (process.platform !== "darwin") {
    throw new Error("prepare-obsidian-cli-runtime is macOS-only (darwin)");
  }

  const platform = process.platform;
  const arch = process.arch;
  const targetDir = path.join(outRoot, `${platform}-${arch}`);
  const targetBin = path.join(targetDir, "obsidian-cli");

  rmrf(targetDir);
  ensureDir(targetDir);

  const downloadedBin = path.join(runtimeRoot, `${platform}-${arch}`, "obsidian-cli");
  if (!fs.existsSync(downloadedBin)) {
    throw new Error(
      [
        "downloaded obsidian-cli binary not found.",
        `Expected: ${downloadedBin}`,
        "Run: cd apps/electron-desktop && npm run fetch:obsidian-cli",
      ].join("\n")
    );
  }

  console.log(`[electron-desktop] Bundling obsidian-cli from: ${downloadedBin}`);
  copyExecutable(downloadedBin, targetBin);

  // Sanity check.
  const res = spawnSync(targetBin, ["--help"], { encoding: "utf-8" });
  if (res.status !== 0) {
    const stderr = String(res.stderr || "").trim();
    const stdout = String(res.stdout || "").trim();
    throw new Error(`bundled obsidian-cli failed to run: ${stderr || stdout || "unknown error"}`);
  }

  console.log(`[electron-desktop] obsidian-cli runtime ready at: ${targetBin}`);
}

main().catch((err) => {
  console.error(String(err?.stack || err?.message || err));
  process.exitCode = 1;
});
