import React from "react";
import type { ChannelsStatusResult, ConfigSnapshot, GatewayRpcLike } from "./types";
import { getObject, getStringArray, unique } from "./utils";

type UseWelcomeTelegramInput = {
  gw: GatewayRpcLike;
  loadConfig: () => Promise<ConfigSnapshot>;
  setError: (value: string | null) => void;
  setStatus: (value: string | null) => void;
};

export function useWelcomeTelegram({
  gw,
  loadConfig,
  setError,
  setStatus,
}: UseWelcomeTelegramInput) {
  const [telegramToken, setTelegramToken] = React.useState("");
  const [telegramUserId, setTelegramUserId] = React.useState("");
  const [channelsProbe, setChannelsProbe] = React.useState<ChannelsStatusResult | null>(null);

  const saveTelegramToken = React.useCallback(async (): Promise<boolean> => {
    const token = telegramToken.trim();
    if (!token) {
      setError("Telegram bot token is required.");
      return false;
    }
    setError(null);
    setStatus("Saving Telegram bot token…");
    const snap = await loadConfig();
    const baseHash = typeof snap.hash === "string" && snap.hash.trim() ? snap.hash.trim() : null;
    if (!baseHash) {
      throw new Error("Config base hash missing. Reload and try again.");
    }
    await gw.request("config.patch", {
      baseHash,
      raw: JSON.stringify(
        {
          channels: {
            telegram: {
              enabled: true,
              botToken: token,
            },
          },
        },
        null,
        2
      ),
      note: "Welcome: configure Telegram bot token",
    });
    setTelegramToken("");
    setStatus("Telegram token saved.");
    return true;
  }, [gw, loadConfig, setError, setStatus, telegramToken]);

  const saveTelegramAllowFrom = React.useCallback(async (): Promise<boolean> => {
    const raw = telegramUserId.trim();
    if (!raw) {
      setError("Telegram user id is required.");
      return false;
    }
    // Accept numeric id or prefixed forms; normalize to digits when possible.
    const stripped = raw.replace(/^(telegram|tg):/i, "").trim();
    const id = /^\d+$/.test(stripped) ? stripped : raw;
    setError(null);
    setStatus("Adding Telegram allowFrom entry…");
    const snap = await loadConfig();
    const cfg = getObject(snap.config);
    const channels = getObject(cfg.channels);
    const telegram = getObject(channels.telegram);
    const allowFrom = getStringArray(telegram.allowFrom);
    const merged = unique([...allowFrom, id]);
    const baseHash = typeof snap.hash === "string" && snap.hash.trim() ? snap.hash.trim() : null;
    if (!baseHash) {
      throw new Error("Config base hash missing. Reload and try again.");
    }
    await gw.request("config.patch", {
      baseHash,
      raw: JSON.stringify(
        {
          channels: {
            telegram: {
              enabled: true,
              dmPolicy: "allowlist",
              allowFrom: merged,
            },
          },
        },
        null,
        2
      ),
      note: "Welcome: configure Telegram allowFrom",
    });

    // Kick: probe channel status to surface immediate errors/config state.
    try {
      const probe = await gw.request<ChannelsStatusResult>("channels.status", {
        probe: true,
        timeoutMs: 12_000,
      });
      setChannelsProbe(probe);
    } catch {
      // ignore probe failures; config patch is the primary action
    }
    setStatus("Telegram allowlist updated.");
    return true;
  }, [gw, loadConfig, setError, setStatus, telegramUserId]);

  return {
    channelsProbe,
    saveTelegramAllowFrom,
    saveTelegramToken,
    setTelegramToken,
    setTelegramUserId,
    telegramToken,
    telegramUserId,
  };
}
