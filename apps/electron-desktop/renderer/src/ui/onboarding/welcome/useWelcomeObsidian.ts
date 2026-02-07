import React from "react";
import type { ConfigSnapshot, GatewayRpcLike } from "./types";
import { getObject, getStringArray, unique } from "./utils";

type UseWelcomeObsidianInput = {
  gw: GatewayRpcLike;
  loadConfig: () => Promise<ConfigSnapshot>;
  setError: (value: string | null) => void;
  setStatus: (value: string | null) => void;
};

type ExecApprovalsAllowlistEntry = {
  id?: string;
  pattern: string;
  lastUsedAt?: number;
  lastUsedCommand?: string;
  lastResolvedPath?: string;
};

type ExecApprovalsFile = {
  version: 1;
  socket?: { path?: string; token?: string };
  defaults?: {
    security?: string;
    ask?: string;
    askFallback?: string;
    autoAllowSkills?: boolean;
  };
  agents?: Record<
    string,
    {
      security?: string;
      ask?: string;
      askFallback?: string;
      autoAllowSkills?: boolean;
      allowlist?: ExecApprovalsAllowlistEntry[];
    }
  >;
};

type ExecApprovalsSnapshot = {
  path: string;
  exists: boolean;
  hash: string;
  file: ExecApprovalsFile;
};

function mergeAllowlistEntries(
  existing: ExecApprovalsAllowlistEntry[] | undefined,
  patterns: string[]
): ExecApprovalsAllowlistEntry[] {
  const list = Array.isArray(existing) ? existing : [];
  const seen = new Set(list.map((e) => e.pattern.trim().toLowerCase()).filter(Boolean));
  const next = [...list];
  for (const pattern of patterns) {
    const normalized = pattern.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    next.push({ pattern });
  }
  return next;
}

export function useWelcomeObsidian({
  gw,
  loadConfig,
  setError,
  setStatus,
}: UseWelcomeObsidianInput) {
  const enableObsidian = React.useCallback(
    async (params?: { obsidianCliResolvedPath?: string | null }): Promise<boolean> => {
      setError(null);
      setStatus("Enabling Obsidian skill…");

      const snap = await loadConfig();
      const baseHash = typeof snap.hash === "string" && snap.hash.trim() ? snap.hash.trim() : null;
      if (!baseHash) {
        throw new Error("Config base hash missing. Reload and try again.");
      }

      const cfg = getObject(snap.config);
      const tools = getObject(cfg.tools);
      const exec = getObject(tools.exec);
      const existingSafeBins = getStringArray(exec.safeBins);
      // `head` is commonly used for piping/previewing output without introducing file-path args.
      const safeBins = unique(
        [...existingSafeBins, "obsidian-cli", "which", "head"].map((v) => v.toLowerCase())
      );

      const hostRaw = typeof exec.host === "string" ? exec.host.trim() : "";
      // Obsidian uses a bundled binary that is guaranteed on the gateway host PATH. In sandbox
      // mode it may not resolve, causing repeated exec approvals. Prefer host=gateway.
      const host = !hostRaw || hostRaw === "sandbox" ? "gateway" : hostRaw;
      const securityRaw = typeof exec.security === "string" ? exec.security.trim() : "";
      const security = securityRaw || "allowlist";
      const askRaw = typeof exec.ask === "string" ? exec.ask.trim() : "";
      const ask = askRaw || "on-miss";

      await gw.request("config.patch", {
        baseHash,
        raw: JSON.stringify(
          {
            skills: {
              entries: {
                obsidian: {
                  enabled: true,
                },
              },
            },
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
        note: "Welcome: enable Obsidian (obsidian-cli) skill",
      });

      try {
        setStatus("Allowing obsidian-cli (exec approvals)…");
        const approvals = await gw.request<ExecApprovalsSnapshot>("exec.approvals.get", {});
        const file = approvals.file ?? { version: 1 };
        const agents = file.agents ?? {};

        const resolvedPath =
          typeof params?.obsidianCliResolvedPath === "string" &&
          params.obsidianCliResolvedPath.trim()
            ? params.obsidianCliResolvedPath.trim()
            : null;
        const patterns = resolvedPath
          ? ["**/obsidian-cli", "**/which", resolvedPath]
          : ["**/obsidian-cli", "**/which"];

        // Apply both to "*" (wildcard) and "main" to avoid mismatches when the active agent id
        // differs from our onboarding assumption.
        const wildcard = agents["*"] ?? {};
        const wildcardAllowlist = mergeAllowlistEntries(wildcard.allowlist, patterns);

        const agentId = "main";
        const agent = agents[agentId] ?? {};
        const allowlist = mergeAllowlistEntries(agent.allowlist, patterns);

        const nextFile: ExecApprovalsFile = {
          ...file,
          version: 1,
          agents: {
            ...agents,
            "*": {
              ...wildcard,
              allowlist: wildcardAllowlist,
            },
            [agentId]: {
              ...agent,
              allowlist,
            },
          },
        };
        await gw.request("exec.approvals.set", {
          baseHash: approvals.hash,
          file: nextFile,
        });
      } catch (err) {
        // Best-effort: skill enablement is already saved; don't block onboarding.
        void err;
      }

      setStatus("Obsidian enabled.");
      return true;
    },
    [gw, loadConfig, setError, setStatus]
  );

  return { enableObsidian };
}
