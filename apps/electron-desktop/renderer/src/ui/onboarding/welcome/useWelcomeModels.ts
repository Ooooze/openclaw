import React from "react";
import type { ModelEntry } from "../ModelSelectPage";
import type { ConfigSnapshot, GatewayRpcLike, ModelsListResult } from "./types";

type UseWelcomeModelsInput = {
  gw: GatewayRpcLike;
  loadConfig: () => Promise<ConfigSnapshot>;
  setError: (value: string | null) => void;
  setStatus: (value: string | null) => void;
};

export function useWelcomeModels({ gw, loadConfig, setError, setStatus }: UseWelcomeModelsInput) {
  const [models, setModels] = React.useState<ModelEntry[]>([]);
  const [modelsLoading, setModelsLoading] = React.useState(false);
  const [modelsError, setModelsError] = React.useState<string | null>(null);

  const loadModels = React.useCallback(async () => {
    setModelsLoading(true);
    setModelsError(null);
    try {
      const result = await gw.request<ModelsListResult>("models.list", {});
      const entries: ModelEntry[] = (result.models ?? []).map((m) => ({
        id: m.id,
        name: m.name ?? m.id,
        provider: m.provider,
        contextWindow: m.contextWindow,
        reasoning: m.reasoning,
      }));
      setModels(entries);
    } catch (err) {
      setModelsError(String(err));
    } finally {
      setModelsLoading(false);
    }
  }, [gw]);

  const saveDefaultModel = React.useCallback(
    async (modelId: string): Promise<boolean> => {
      setError(null);
      setStatus("Setting default model…");
      const snap = await loadConfig();
      const baseHash = typeof snap.hash === "string" && snap.hash.trim() ? snap.hash.trim() : null;
      if (!baseHash) {
        throw new Error("Config base hash missing. Reload and try again.");
      }
      await gw.request("config.patch", {
        baseHash,
        raw: JSON.stringify(
          {
            agents: {
              defaults: {
                model: {
                  primary: modelId,
                },
                models: {
                  [modelId]: {},
                },
              },
            },
          },
          null,
          2
        ),
        note: "Welcome: set default model",
      });
      setStatus("Default model configured.");
      return true;
    },
    [gw, loadConfig, setError, setStatus]
  );

  return {
    loadModels,
    models,
    modelsError,
    modelsLoading,
    saveDefaultModel,
  };
}
