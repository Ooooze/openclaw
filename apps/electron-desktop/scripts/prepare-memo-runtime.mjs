import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "..");
const outRoot = path.join(appRoot, "vendor", "memo");
const runtimeRoot = path.join(appRoot, ".memo-runtime");

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
    throw new Error("prepare-memo-runtime is macOS-only (darwin)");
  }

  const platform = process.platform;
  const arch = process.arch;
  const targetDir = path.join(outRoot, `${platform}-${arch}`);
  const targetBin = path.join(targetDir, "memo");

  rmrf(targetDir);
  ensureDir(targetDir);

  const builtBin = path.join(runtimeRoot, `${platform}-${arch}`, "memo");
  if (!fs.existsSync(builtBin)) {
    throw new Error(
      [
        "built memo binary not found.",
        `Expected: ${builtBin}`,
        "Run: cd apps/electron-desktop && npm run fetch:memo && npm run build:memo",
      ].join("\n")
    );
  }

  console.log(`[electron-desktop] Bundling memo from: ${builtBin}`);
  copyExecutable(builtBin, targetBin);

  // Sanity check.
  const res = spawnSync(targetBin, ["--help"], { encoding: "utf-8" });
  if (res.status !== 0) {
    const stderr = String(res.stderr || "").trim();
    const stdout = String(res.stdout || "").trim();
    throw new Error(`bundled memo failed to run: ${stderr || stdout || "unknown error"}`);
  }

  console.log(`[electron-desktop] memo runtime ready at: ${targetBin}`);
}

main().catch((err) => {
  console.error(String(err?.stack || err?.message || err));
  process.exitCode = 1;
});
