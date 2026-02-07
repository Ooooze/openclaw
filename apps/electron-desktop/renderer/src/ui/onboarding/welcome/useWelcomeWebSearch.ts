import React from "react";
import type { ConfigSnapshot, GatewayRpcLike } from "./types";

export type WebSearchProvider = "brave" | "perplexity";

type UseWelcomeWebSearchInput = {
  gw: GatewayRpcLike;
  loadConfig: () => Promise<ConfigSnapshot>;
  setError: (value: string | null) => void;
  setStatus: (value: string | null) => void;
};

export function useWelcomeWebSearch({
  gw,
  loadConfig,
  setError,
  setStatus,
}: UseWelcomeWebSearchInput) {
  const saveWebSearch = React.useCallback(
    async (provider: WebSearchProvider, apiKey: string): Promise<boolean> => {
      const trimmed = apiKey.trim();
      if (!trimmed) {
        setError("API key is required.");
        return false;
      }
      setError(null);
      setStatus("Saving web search settings…");

      const snap = await loadConfig();
      const baseHash = typeof snap.hash === "string" && snap.hash.trim() ? snap.hash.trim() : null;
      if (!baseHash) {
        throw new Error("Config base hash missing. Reload and try again.");
      }

      const patch =
        provider === "perplexity"
          ? {
              tools: {
                web: {
                  search: {
                    enabled: true,
                    provider: "perplexity" as const,
                    perplexity: { apiKey: trimmed },
                  },
                },
              },
            }
          : {
              tools: {
                web: {
                  search: {
                    enabled: true,
                    provider: "brave" as const,
                    apiKey: trimmed,
                  },
                },
              },
            };

      await gw.request("config.patch", {
        baseHash,
        raw: JSON.stringify(patch, null, 2),
        note: `Welcome: configure web_search (${provider})`,
      });

      setStatus("Web search configured.");
      return true;
    },
    [gw, loadConfig, setError, setStatus]
  );

  return { saveWebSearch };
}
