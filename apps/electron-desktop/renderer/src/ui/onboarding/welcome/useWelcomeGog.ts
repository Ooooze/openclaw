import React from "react";
import { DEFAULT_GOG_SERVICES } from "./constants";
import type { ConfigSnapshot, GatewayRpcLike, GogExecResult } from "./types";
import { getObject, getStringArray, unique } from "./utils";

type UseWelcomeGogInput = {
  gw: GatewayRpcLike;
};

export function useWelcomeGog({ gw }: UseWelcomeGogInput) {
  const [gogAccount, setGogAccount] = React.useState("");
  const [gogBusy, setGogBusy] = React.useState(false);
  const [gogError, setGogError] = React.useState<string | null>(null);
  const [gogOutput, setGogOutput] = React.useState<string | null>(null);

  const runGog = React.useCallback(async (fn: () => Promise<GogExecResult>) => {
    setGogError(null);
    setGogBusy(true);
    try {
      const res = await fn();
      const out = [
        `ok: ${res.ok ? "true" : "false"}`,
        `code: ${res.code ?? "null"}`,
        res.stderr ? `stderr:\n${res.stderr.trim()}` : "",
        res.stdout ? `stdout:\n${res.stdout.trim()}` : "",
      ]
        .filter(Boolean)
        .join("\n\n");
      setGogOutput(out || "(no output)");
      if (!res.ok) {
        setGogError(res.stderr?.trim() || "Google Workspace connection failed");
      }
      return res;
    } catch (err) {
      setGogError(String(err));
      setGogOutput(null);
      throw err;
    } finally {
      setGogBusy(false);
    }
  }, []);

  const ensureGogExecDefaults = React.useCallback(async () => {
    const snap = await gw.request<ConfigSnapshot>("config.get", {});
    const baseHash = typeof snap.hash === "string" && snap.hash.trim() ? snap.hash.trim() : null;
    if (!baseHash) {
      throw new Error("Config base hash missing. Reload and try again.");
    }
    const cfg = getObject(snap.config);
    const tools = getObject(cfg.tools);
    const exec = getObject(tools.exec);
    const existingSafeBins = getStringArray(exec.safeBins);
    const safeBins = unique([...existingSafeBins, "gog"].map((v) => v.toLowerCase()));

    const host = typeof exec.host === "string" && exec.host.trim() ? exec.host.trim() : "gateway";
    const security =
      typeof exec.security === "string" && exec.security.trim()
        ? exec.security.trim()
        : "allowlist";
    const ask = typeof exec.ask === "string" && exec.ask.trim() ? exec.ask.trim() : "on-miss";

    await gw.request("config.patch", {
      baseHash,
      raw: JSON.stringify(
        {
          tools: {
            exec: {
              host,
              security,
              ask,
              safeBins,
            },
          },
        },
        null,
        2
      ),
      note: "Welcome: ensure gog exec defaults",
    });
  }, [gw]);

  const onGogAuthAdd = React.useCallback(
    async (services?: string) => {
      const servicesCsv =
        typeof services === "string" && services.trim() ? services.trim() : DEFAULT_GOG_SERVICES;
      return await runGog(async () => {
        const api = window.openclawDesktop;
        if (!api) {
          throw new Error("Desktop API not available");
        }
        const res = await api.gogAuthAdd({
          account: gogAccount.trim(),
          services: servicesCsv,
        });
        if (res.ok) {
          await ensureGogExecDefaults();
        }
        return res;
      });
    },
    [ensureGogExecDefaults, gogAccount, runGog]
  );

  const onGogAuthList = React.useCallback(async () => {
    return await runGog(async () => {
      const api = window.openclawDesktop;
      if (!api) {
        throw new Error("Desktop API not available");
      }
      return await api.gogAuthList();
    });
  }, [runGog]);

  return {
    gogAccount,
    gogBusy,
    gogError,
    gogOutput,
    onGogAuthAdd,
    onGogAuthList,
    setGogAccount,
  };
}
