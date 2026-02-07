import React from "react";
import type { ConfigSnapshot, GatewayRpcLike } from "./types";

type GroupPolicy = "open" | "allowlist" | "disabled";
type DmPolicy = "pairing" | "allowlist" | "open" | "disabled";

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const next: string[] = [];
  for (const v of values) {
    const trimmed = String(v ?? "").trim();
    if (!trimmed) {
      continue;
    }
    const key = trimmed.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    next.push(trimmed);
  }
  return next;
}

function addWildcardAllowFrom(existing: string[] | undefined): string[] {
  const list = Array.isArray(existing) ? existing : [];
  const merged = uniqueStrings([...list, "*"]);
  return merged;
}

type UseWelcomeSlackInput = {
  gw: GatewayRpcLike;
  loadConfig: () => Promise<ConfigSnapshot>;
  setError: (value: string | null) => void;
  setStatus: (value: string | null) => void;
};

export function useWelcomeSlack({ gw, loadConfig, setError, setStatus }: UseWelcomeSlackInput) {
  const saveSlackConfig = React.useCallback(
    async (settings: {
      botName: string;
      botToken: string;
      appToken: string;
      groupPolicy: GroupPolicy;
      channelAllowlist: string[];
      dmPolicy: DmPolicy;
      dmAllowFrom: string[];
    }): Promise<boolean> => {
      const botToken = settings.botToken.trim();
      const appToken = settings.appToken.trim();
      if (!botToken || !appToken) {
        setError("Slack bot token and app token are required.");
        return false;
      }
      if (settings.dmPolicy === "allowlist" && uniqueStrings(settings.dmAllowFrom).length === 0) {
        setError("Slack DM allowlist requires at least one allowFrom entry.");
        return false;
      }

      setError(null);
      setStatus("Saving Slack settings…");

      const snap = await loadConfig();
      const baseHash = typeof snap.hash === "string" && snap.hash.trim() ? snap.hash.trim() : null;
      if (!baseHash) {
        throw new Error("Config base hash missing. Reload and try again.");
      }

      const groupPolicy = settings.groupPolicy;
      const channelAllowlist = uniqueStrings(settings.channelAllowlist);
      const channels =
        groupPolicy === "allowlist"
          ? Object.fromEntries(channelAllowlist.map((key) => [key, { allow: true }]))
          : undefined;

      const dmPolicy = settings.dmPolicy;
      const dmAllowFrom =
        dmPolicy === "open"
          ? addWildcardAllowFrom(settings.dmAllowFrom)
          : dmPolicy === "allowlist"
            ? uniqueStrings(settings.dmAllowFrom)
            : undefined;

      await gw.request("config.patch", {
        baseHash,
        raw: JSON.stringify(
          {
            channels: {
              slack: {
                enabled: true,
                botToken,
                appToken,
                groupPolicy,
                ...(channels ? { channels } : {}),
                dm: {
                  enabled: dmPolicy !== "disabled",
                  policy: dmPolicy,
                  ...(dmAllowFrom ? { allowFrom: dmAllowFrom } : {}),
                },
              },
            },
          },
          null,
          2
        ),
        note: "Welcome: configure Slack tokens and access",
      });

      setStatus("Slack configured.");
      return true;
    },
    [gw, loadConfig, setError, setStatus]
  );

  return { saveSlackConfig };
}
