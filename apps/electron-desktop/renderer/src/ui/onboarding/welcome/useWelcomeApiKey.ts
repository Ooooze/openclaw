import React from "react";
import type { Provider } from "../ProviderSelectPage";
import type { ConfigSnapshot, GatewayRpcLike } from "./types";

type UseWelcomeApiKeyInput = {
  gw: GatewayRpcLike;
  loadConfig: () => Promise<ConfigSnapshot>;
  setError: (value: string | null) => void;
  setStatus: (value: string | null) => void;
};

export function useWelcomeApiKey({ gw, loadConfig, setError, setStatus }: UseWelcomeApiKeyInput) {
  const saveApiKey = React.useCallback(
    async (provider: Provider, apiKey: string): Promise<boolean> => {
      if (!apiKey.trim()) {
        setError("API key is required.");
        return false;
      }
      setError(null);
      setStatus(`Saving ${provider} API key…`);
      await window.openclawDesktop?.setApiKey(provider, apiKey.trim());

      // Update config with auth profile
      const snap = await loadConfig();
      const baseHash = typeof snap.hash === "string" && snap.hash.trim() ? snap.hash.trim() : null;
      if (!baseHash) {
        throw new Error("Config base hash missing. Reload and try again.");
      }
      const profileId = `${provider}:default`;
      await gw.request("config.patch", {
        baseHash,
        raw: JSON.stringify(
          {
            auth: {
              profiles: {
                [profileId]: { provider, mode: "api_key" },
              },
              order: {
                [provider]: [profileId],
              },
            },
          },
          null,
          2
        ),
        note: `Welcome: enable ${provider} api_key profile`,
      });
      setStatus(`${provider} API key saved.`);
      return true;
    },
    [gw, loadConfig, setError, setStatus]
  );

  return { saveApiKey };
}
