import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "..");
const repoRoot = path.resolve(appRoot, "..", "..");
const outDir = path.join(appRoot, "vendor", "openclaw");

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, {
    stdio: "inherit",
    ...opts,
  });
  if (result.status !== 0) {
    throw new Error(`${cmd} ${args.join(" ")} failed with exit code ${result.status ?? "?"}`);
  }
}

function rmrfStrict(p) {
  if (!fs.existsSync(p)) {
    return;
  }
  fs.rmSync(p, { recursive: true, force: true });
  if (fs.existsSync(p)) {
    throw new Error(`[electron-desktop] Failed to remove deploy dir: ${p}`);
  }
}

// This produces a self-contained OpenClaw bundle directory that includes:
// - openclaw.mjs
// - dist/** (including dist/control-ui)
// - production node_modules
//
// It uses pnpm's workspace deploy to avoid custom file-copy logic.
// NOTE: Requires pnpm on the developer/build machine.
const PNPM = process.env.PNPM_BIN || "pnpm";

// pnpm deploy requires the target directory to NOT exist (or it must be empty).
// If deletion fails (e.g. permissions), fail fast with a clear error.
rmrfStrict(outDir);
fs.mkdirSync(path.dirname(outDir), { recursive: true });

// Build OpenClaw + Control UI (required for the embedded UI).
//
// Important: `pnpm build` can recreate/clean `dist/` (depending on the bundler configuration).
// If we build the UI first, it may be wiped by the subsequent build step, leaving the
// packaged app without `dist/control-ui` and breaking the embedded "legacy" tab.
run(PNPM, ["-C", repoRoot, "build"]);
run(PNPM, ["-C", repoRoot, "ui:build"]);

const controlUiIndex = path.join(repoRoot, "dist", "control-ui", "index.html");
if (!fs.existsSync(controlUiIndex)) {
  throw new Error(
    `[electron-desktop] Control UI assets missing after build: ${controlUiIndex}. Did ui:build output change?`,
  );
}

// Deploy the workspace package into outDir, excluding devDependencies.
// --legacy avoids requiring inject-workspace-packages configuration.
run(PNPM, ["-C", repoRoot, "--filter", "openclaw", "--prod", "--legacy", "deploy", outDir]);

console.log(`[electron-desktop] OpenClaw bundle prepared at: ${outDir}`);

