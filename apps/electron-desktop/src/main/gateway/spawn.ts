import { spawn, type ChildProcess } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

import { ensureDir } from "../util/fs";
import type { TailBuffer } from "../util/net";

export function spawnGateway(params: {
  port: number;
  logsDir: string;
  stateDir: string;
  configPath: string;
  token: string;
  openclawDir: string;
  nodeBin: string;
  gogBin?: string;
  jqBin?: string;
  memoBin?: string;
  remindctlBin?: string;
  electronRunAsNode?: boolean;
  stderrTail: TailBuffer;
}): ChildProcess {
  const {
    port,
    logsDir,
    stateDir,
    configPath,
    token,
    openclawDir,
    nodeBin,
    gogBin,
    jqBin,
    memoBin,
    remindctlBin,
    electronRunAsNode,
    stderrTail,
  } = params;

  ensureDir(logsDir);
  ensureDir(stateDir);

  const stdoutPath = path.join(logsDir, "gateway.stdout.log");
  const stderrPath = path.join(logsDir, "gateway.stderr.log");
  const stdout = fs.createWriteStream(stdoutPath, { flags: "a" });
  const stderr = fs.createWriteStream(stderrPath, { flags: "a" });

  const script = path.join(openclawDir, "openclaw.mjs");
  // Important: first-run embedded app starts without a config file. Allow the Gateway to start
  // so the Control UI/WebChat + wizard flows can create config.
  // --verbose enables debug-level logging to help diagnose provider/model errors.
  const args = [script, "gateway", "--bind", "loopback", "--port", String(port), "--allow-unconfigured", "--verbose"];

  const envPath = typeof process.env.PATH === "string" ? process.env.PATH : "";
  const extraBinDirs = [jqBin, gogBin, memoBin, remindctlBin]
    .map((bin) => (bin ? path.dirname(bin) : ""))
    .filter(Boolean);
  const uniqueExtraBinDirs = Array.from(new Set(extraBinDirs));
  const mergedPath =
    uniqueExtraBinDirs.length > 0
      ? `${uniqueExtraBinDirs.join(path.delimiter)}${path.delimiter}${envPath}`
      : envPath;

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    // Keep all OpenClaw state inside the Electron app's userData directory.
    OPENCLAW_STATE_DIR: stateDir,
    OPENCLAW_CONFIG_PATH: configPath,
    OPENCLAW_GATEWAY_PORT: String(port),
    OPENCLAW_GATEWAY_TOKEN: token,
    // Ensure the embedded Gateway resolves bundled binaries via PATH (gog, jq, ...).
    PATH: mergedPath,
    // Reduce noise in embedded contexts.
    NO_COLOR: "1",
    FORCE_COLOR: "0",
  };

  // If we're spawning via Electron, force it into "Node mode" (otherwise it tries to launch a GUI process).
  if (electronRunAsNode) {
    env.ELECTRON_RUN_AS_NODE = "1";
  }

  const child = spawn(nodeBin, args, {
    cwd: openclawDir,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stderr.on("data", (chunk) => {
    try {
      stderrTail.push(String(chunk));
    } catch {
      // ignore
    }
  });

  child.stdout.pipe(stdout);
  child.stderr.pipe(stderr);

  return child;
}

