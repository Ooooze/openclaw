import * as fs from "node:fs";
import * as path from "node:path";

import JSON5 from "json5";

import { ensureDir } from "../util/fs";

export function readGatewayTokenFromConfig(configPath: string): string | null {
  try {
    if (!fs.existsSync(configPath)) {
      return null;
    }
    const text = fs.readFileSync(configPath, "utf-8");
    const parsed = JSON5.parse(text) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    const cfg = parsed as {
      gateway?: { auth?: { token?: unknown } };
    };
    const token = cfg.gateway?.auth?.token;
    return typeof token === "string" && token.trim().length > 0 ? token.trim() : null;
  } catch {
    return null;
  }
}

export function ensureGatewayConfigFile(params: { configPath: string; token: string }) {
  if (fs.existsSync(params.configPath)) {
    return;
  }
  ensureDir(path.dirname(params.configPath));
  const minimal = {
    gateway: {
      mode: "local",
      bind: "loopback",
      auth: {
        mode: "token",
        token: params.token,
      },
    },
    // Enable debug logging by default to help diagnose provider/model errors.
    logging: {
      level: "debug",
      consoleLevel: "debug",
    },
  };
  // Write JSON (JSON5-compatible) to keep it simple and deterministic.
  fs.writeFileSync(params.configPath, `${JSON.stringify(minimal, null, 2)}\n`, "utf-8");
}

