import { app, ipcMain, session } from "electron";
import * as fs from "node:fs";
import * as path from "node:path";

import { clearGogAuthTokens } from "../gog/gog";
import type { ResetAndCloseResult } from "../types";

export function registerResetAndCloseIpcHandler(params: {
  userData: string;
  stateDir: string;
  logsDir: string;
  gogBin: string;
  openclawDir: string;
  stopGatewayChild: () => Promise<void>;
}) {
  const { userData, stateDir, logsDir, gogBin, openclawDir, stopGatewayChild } = params;

  ipcMain.handle("reset-and-close", async () => {
    const warnings: string[] = [];

    try {
      await stopGatewayChild();
    } catch (err) {
      warnings.push(`failed to stop gateway: ${String(err)}`);
    }

    try {
      await clearGogAuthTokens({ gogBin, openclawDir, warnings });
    } catch (err) {
      warnings.push(`failed to clear gog auth tokens: ${String(err)}`);
    }

    // Clear the embedded OpenClaw state/logs plus any temp files we created under userData.
    const tmpDir = path.join(userData, "tmp");
    for (const dir of [stateDir, logsDir, tmpDir]) {
      try {
        fs.rmSync(dir, { recursive: true, force: true });
      } catch (err) {
        warnings.push(`failed to delete ${dir}: ${String(err)}`);
      }
    }

    // Clear renderer storage (localStorage/IndexedDB/etc.) so onboarding state is reset too.
    try {
      await session.defaultSession.clearStorageData();
    } catch (err) {
      warnings.push(`failed to clear renderer storage: ${String(err)}`);
    }

    // Let the IPC reply resolve before quitting.
    setTimeout(() => {
      try {
        app.quit();
      } catch {
        // ignore
      }
      setTimeout(() => {
        try {
          app.exit(0);
        } catch {
          // ignore
        }
      }, 2000);
    }, 25);

    const res: ResetAndCloseResult = warnings.length > 0 ? { ok: true, warnings } : { ok: true };
    return res;
  });
}
