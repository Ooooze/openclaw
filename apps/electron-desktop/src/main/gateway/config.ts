import * as fs from "node:fs";
import * as path from "node:path";

import JSON5 from "json5";

import { ensureDir } from "../util/fs";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function readGatewayTokenFromConfig(configPath: string): string | null {
  try {
    if (!fs.existsSync(configPath)) {
      return null;
    }
    const text = fs.readFileSync(configPath, "utf-8");
    const parsed: unknown = JSON5.parse(text);
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
  ensureDir(path.dirname(params.configPath));
  const minimal = (token: string) => ({
    gateway: {
      mode: "local",
      bind: "loopback",
      auth: {
        mode: "token",
        token,
      },
      // Electron's renderer loads from a file:// URL which becomes an Origin of "null" in browsers.
      // Allow "null" so the embedded Control UI client can connect to the local loopback gateway.
      controlUi: {
        allowedOrigins: ["null"],
      },
    },
    // Enable debug logging by default to help diagnose provider/model errors.
    logging: {
      level: "debug",
      consoleLevel: "debug",
    },
  });

  if (!fs.existsSync(params.configPath)) {
    // Write JSON (JSON5-compatible) to keep it simple and deterministic.
    fs.writeFileSync(
      params.configPath,
      `${JSON.stringify(minimal(params.token), null, 2)}\n`,
      "utf-8"
    );
    return;
  }

  // Patch existing configs (created by earlier desktop versions) so onboarding doesn't fail on Origin checks.
  try {
    const text = fs.readFileSync(params.configPath, "utf-8");
    const parsed: unknown = JSON5.parse(text);
    if (!isPlainObject(parsed)) {
      return;
    }
    const cfg = parsed;
    const gateway = isPlainObject(cfg.gateway) ? cfg.gateway : {};
    const mode = typeof gateway.mode === "string" ? gateway.mode.trim() : "";
    const bind = typeof gateway.bind === "string" ? gateway.bind.trim() : "";
    if (mode !== "local" || bind !== "loopback") {
      return;
    }

    const controlUi = isPlainObject(gateway.controlUi) ? gateway.controlUi : {};
    const allowedOrigins = Array.isArray(controlUi.allowedOrigins)
      ? controlUi.allowedOrigins.map((v) => String(v).trim()).filter(Boolean)
      : [];

    if (allowedOrigins.includes("null")) {
      return;
    }

    const next = {
      ...cfg,
      gateway: {
        ...gateway,
        controlUi: {
          ...controlUi,
          allowedOrigins: [...allowedOrigins, "null"],
        },
      },
    };
    fs.writeFileSync(params.configPath, `${JSON.stringify(next, null, 2)}\n`, "utf-8");
  } catch {
    // ignore
  }
}
