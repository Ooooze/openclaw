import { spawn } from "node:child_process";
import * as fs from "node:fs";

import { resolveGogCredentialsPaths } from "../openclaw/paths";
import type { GogExecResult } from "./types";

export function runGog(params: {
  bin: string;
  args: string[];
  cwd: string;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
}): Promise<GogExecResult> {
  const timeoutMs = typeof params.timeoutMs === "number" ? params.timeoutMs : 120_000;
  return new Promise<GogExecResult>((resolve) => {
    const child = spawn(params.bin, params.args, {
      cwd: params.cwd,
      env: params.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    const onData = (buf: Buffer, which: "stdout" | "stderr") => {
      const text = buf.toString("utf-8");
      if (which === "stdout") {
        stdout += text;
      } else {
        stderr += text;
      }
    };
    child.stdout?.on("data", (b: Buffer) => onData(b, "stdout"));
    child.stderr?.on("data", (b: Buffer) => onData(b, "stderr"));

    let killed = false;
    const timer = setTimeout(() => {
      killed = true;
      try {
        child.kill("SIGKILL");
      } catch {
        // ignore
      }
    }, timeoutMs);

    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({
        ok: !killed && code === 0,
        code: typeof code === "number" ? code : null,
        stdout,
        stderr,
      });
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({
        ok: false,
        code: null,
        stdout,
        stderr: `${stderr}${stderr ? "\n" : ""}${String(err)}`,
      });
    });
  });
}

export function parseGogAuthListEmails(jsonText: string): string[] {
  try {
    const parsed = JSON.parse(jsonText || "{}") as { accounts?: unknown };
    const accounts = Array.isArray(parsed.accounts) ? parsed.accounts : [];
    const emails = accounts
      .map((a) => (a && typeof a === "object" ? (a as { email?: unknown }).email : undefined))
      .map((v) => (typeof v === "string" ? v.trim() : ""))
      .filter(Boolean);
    return Array.from(new Set(emails));
  } catch {
    return [];
  }
}

export async function clearGogAuthTokens(params: {
  gogBin: string;
  openclawDir: string;
  warnings: string[];
}) {
  if (!fs.existsSync(params.gogBin)) {
    params.warnings.push(`gog binary not found at: ${params.gogBin}`);
    return;
  }
  const list = await runGog({
    bin: params.gogBin,
    args: ["auth", "list", "--json", "--no-input"],
    cwd: params.openclawDir,
    timeoutMs: 15_000,
  });
  if (!list.ok) {
    const msg = (list.stderr || list.stdout || "").trim();
    params.warnings.push(`gog auth list failed: ${msg || "unknown error"}`);
    return;
  }
  const emails = parseGogAuthListEmails(list.stdout);
  for (const email of emails) {
    const res = await runGog({
      bin: params.gogBin,
      args: ["auth", "remove", email, "--force", "--no-input"],
      cwd: params.openclawDir,
      timeoutMs: 15_000,
    });
    if (!res.ok) {
      const msg = (res.stderr || res.stdout || "").trim();
      params.warnings.push(`gog auth remove failed for ${email}: ${msg || "unknown error"}`);
    }
  }
}

export async function ensureGogCredentialsConfigured(params: {
  gogBin: string;
  openclawDir: string;
  credentialsJsonPath: string;
}): Promise<void> {
  if (!fs.existsSync(params.gogBin)) {
    return;
  }
  if (!fs.existsSync(params.credentialsJsonPath)) {
    return;
  }

  // If credentials already exist (file-based or gog-managed), do not override user config.
  if (resolveGogCredentialsPaths().some((p) => fs.existsSync(p))) {
    return;
  }
  try {
    const list = await runGog({
      bin: params.gogBin,
      args: ["auth", "credentials", "list", "--json", "--no-input"],
      cwd: params.openclawDir,
      timeoutMs: 15_000,
    });
    if (list.ok) {
      try {
        const parsed = JSON.parse(list.stdout || "{}") as { clients?: unknown };
        if (Array.isArray(parsed.clients) && parsed.clients.length > 0) {
          return;
        }
      } catch {
        // ignore and proceed to set
      }
    }
  } catch {
    // ignore and proceed to set
  }

  const res = await runGog({
    bin: params.gogBin,
    args: ["auth", "credentials", "set", params.credentialsJsonPath, "--no-input"],
    cwd: params.openclawDir,
    timeoutMs: 30_000,
  });
  if (!res.ok) {
    const stderr = res.stderr.trim();
    const stdout = res.stdout.trim();
    console.warn(
      `[electron-desktop] gog auth credentials set failed: ${stderr || stdout || "unknown error"} (bin: ${params.gogBin})`
    );
  }
}
