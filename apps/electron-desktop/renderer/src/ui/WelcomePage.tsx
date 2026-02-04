import React from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { useGatewayRpc } from "../gateway/context";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { setOnboarded } from "../store/slices/onboardingSlice";
import { ActionButton, ButtonRow, GlassCard, HeroPageLayout, InlineError, PrimaryButton, TextInput } from "./kit";
import type { GatewayState } from "../../../src/main/types";
import { routes } from "./routes";
import { ApiKeyPage } from "./onboarding/ApiKeyPage";
import { GogPage } from "./onboarding/GogPage";
import { IntroPage } from "./onboarding/IntroPage";
import { ModelSelectPage, type ModelEntry } from "./onboarding/ModelSelectPage";
import { ProviderSelectPage, type Provider } from "./onboarding/ProviderSelectPage";
import { TelegramTokenPage } from "./onboarding/TelegramTokenPage";
import { TelegramUserPage } from "./onboarding/TelegramUserPage";

type ConfigSnapshot = {
  path?: string;
  exists?: boolean;
  valid?: boolean;
  hash?: string;
  config?: unknown;
};

type ChannelsStatusResult = {
  channelAccounts?: Record<string, Array<{ accountId?: string; configured?: boolean; lastError?: string }>>;
};

type GogExecResult = {
  ok: boolean;
  code: number | null;
  stdout: string;
  stderr: string;
};

type ModelsListResult = {
  models?: Array<{
    id: string;
    name?: string;
    provider: string;
    contextWindow?: number;
    reasoning?: boolean;
  }>;
};

const DEFAULT_GOG_SERVICES = "gmail,calendar,drive,docs,sheets,contacts";

function inferWorkspaceDirFromConfigPath(configPath: string | undefined): string {
  const raw = typeof configPath === "string" ? configPath.trim() : "";
  if (!raw) {
    return "~/openclaw-workspace";
  }
  const sep = raw.includes("\\") ? "\\" : "/";
  const idx = raw.lastIndexOf(sep);
  if (idx <= 0) {
    return "~/openclaw-workspace";
  }
  const dir = raw.slice(0, idx);
  return `${dir}${sep}workspace`;
}

function getObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function getStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((v) => String(v).trim()).filter(Boolean);
}

function unique(list: string[]): string[] {
  return Array.from(new Set(list));
}

export function WelcomePage({ state }: { state: Extract<GatewayState, { kind: "ready" }> }) {
  const gw = useGatewayRpc();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const onboarded = useAppSelector((s) => s.onboarding.onboarded);

  const [startBusy, setStartBusy] = React.useState(false);
  const [status, setStatus] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const [telegramToken, setTelegramToken] = React.useState("");
  const [telegramUserId, setTelegramUserId] = React.useState("");
  const [gogAccount, setGogAccount] = React.useState("");
  const [gogBusy, setGogBusy] = React.useState(false);
  const [gogError, setGogError] = React.useState<string | null>(null);
  const [gogOutput, setGogOutput] = React.useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = React.useState<Provider | null>(null);
  const [apiKeyBusy, setApiKeyBusy] = React.useState(false);
  const [models, setModels] = React.useState<ModelEntry[]>([]);
  const [modelsLoading, setModelsLoading] = React.useState(false);
  const [modelsError, setModelsError] = React.useState<string | null>(null);

  const [configPath, setConfigPath] = React.useState<string | null>(null);
  const [channelsProbe, setChannelsProbe] = React.useState<ChannelsStatusResult | null>(null);

  React.useEffect(() => {
    if (onboarded) {
      navigate("/chat", { replace: true });
    }
  }, [navigate, onboarded]);

  const loadConfig = React.useCallback(async () => {
    const snap = (await gw.request("config.get", {})) as ConfigSnapshot;
    setConfigPath(typeof snap.path === "string" ? snap.path : null);
    return snap;
  }, [gw]);

  const ensureExtendedConfig = React.useCallback(async () => {
    setError(null);
    setStatus("Ensuring config…");
    const snap = await loadConfig();
    const cfg = getObject(snap.config);
    const gateway = getObject(cfg.gateway);
    const gatewayAuth = getObject(gateway.auth);
    const agents = getObject(cfg.agents);
    const defaults = getObject(agents.defaults);

    const currentWorkspace = typeof defaults.workspace === "string" ? defaults.workspace.trim() : "";
    const workspace = currentWorkspace || inferWorkspaceDirFromConfigPath(snap.path);

    const patch: Record<string, unknown> = {};

    const authToken = typeof gatewayAuth.token === "string" ? gatewayAuth.token.trim() : "";
    const authMode = typeof gatewayAuth.mode === "string" ? gatewayAuth.mode.trim() : "";
    const port = typeof gateway.port === "number" && Number.isFinite(gateway.port) ? gateway.port : null;
    const bind = typeof gateway.bind === "string" ? gateway.bind.trim() : "";
    const mode = typeof gateway.mode === "string" ? gateway.mode.trim() : "";
    const needsGateway =
      mode !== "local" ||
      bind !== "loopback" ||
      port !== state.port ||
      authMode !== "token" ||
      authToken !== state.token;
    if (needsGateway) {
      patch.gateway = {
        ...gateway,
        mode: "local",
        bind: "loopback",
        port: state.port,
        auth: {
          ...gatewayAuth,
          mode: "token",
          token: state.token,
        },
      };
    }

    if (!currentWorkspace) {
      patch.agents = {
        ...agents,
        defaults: {
          ...defaults,
          workspace,
        },
      };
    }

    if (snap.exists === false) {
      const seeded = { ...cfg, ...patch };
      await gw.request("config.set", { raw: JSON.stringify(seeded, null, 2) });
      setStatus("Config created.");
      return;
    }
    if (Object.keys(patch).length === 0) {
      setStatus("Config already looks good.");
      return;
    }
    const baseHash = typeof snap.hash === "string" && snap.hash.trim() ? snap.hash.trim() : null;
    if (!baseHash) {
      throw new Error("Config base hash missing. Reload and try again.");
    }
    await gw.request("config.patch", {
      baseHash,
      raw: JSON.stringify(patch, null, 2),
      note: "Welcome: ensure onboarding defaults (workspace/gateway)",
    });
    setStatus("Config updated.");
  }, [gw, loadConfig, state.port, state.token]);

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
          2,
        ),
        note: `Welcome: enable ${provider} api_key profile`,
      });
      setStatus(`${provider} API key saved.`);
      return true;
    },
    [gw, loadConfig],
  );

  const loadModels = React.useCallback(async () => {
    setModelsLoading(true);
    setModelsError(null);
    try {
      const result = (await gw.request("models.list", {})) as ModelsListResult;
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
          2,
        ),
        note: "Welcome: set default model",
      });
      setStatus("Default model configured.");
      return true;
    },
    [gw, loadConfig],
  );

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
        2,
      ),
      note: "Welcome: configure Telegram bot token",
    });
    setTelegramToken("");
    setStatus("Telegram token saved.");
    return true;
  }, [gw, loadConfig, telegramToken]);

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
        2,
      ),
      note: "Welcome: configure Telegram allowFrom",
    });

    // Kick: probe channel status to surface immediate errors/config state.
    try {
      const probe = (await gw.request("channels.status", { probe: true, timeoutMs: 12_000 })) as ChannelsStatusResult;
      setChannelsProbe(probe);
    } catch {
      // ignore probe failures; config patch is the primary action
    }
    setStatus("Telegram allowlist updated.");
    return true;
  }, [gw, loadConfig, telegramUserId]);

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
        setGogError(res.stderr?.trim() || "gog command failed");
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
    const snap = (await gw.request("config.get", {})) as ConfigSnapshot;
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
      typeof exec.security === "string" && exec.security.trim() ? exec.security.trim() : "allowlist";
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
        2,
      ),
      note: "Welcome: ensure gog exec defaults",
    });
  }, [gw]);

  const finish = React.useCallback(() => {
    void dispatch(setOnboarded(true));
    navigate(routes.chat, { replace: true });
  }, [dispatch, navigate]);

  const start = React.useCallback(async () => {
    setError(null);
    setStatus(null);
    setStartBusy(true);
    try {
      await ensureExtendedConfig();
      navigate(`${routes.welcome}/provider-select`);
    } catch (err) {
      setError(String(err));
    } finally {
      setStartBusy(false);
    }
  }, [ensureExtendedConfig, navigate]);

  const goApiKey = React.useCallback(() => navigate(`${routes.welcome}/api-key`), [navigate]);
  const goModelSelect = React.useCallback(() => navigate(`${routes.welcome}/model-select`), [navigate]);
  const goTelegramToken = React.useCallback(() => navigate(`${routes.welcome}/telegram-token`), [navigate]);
  const goTelegramUser = React.useCallback(() => navigate(`${routes.welcome}/telegram-user`), [navigate]);
  const goGog = React.useCallback(() => navigate(`${routes.welcome}/gog`), [navigate]);
  const goProviderSelect = React.useCallback(() => navigate(`${routes.welcome}/provider-select`), [navigate]);

  const onProviderSelect = React.useCallback(
    (provider: Provider) => {
      setSelectedProvider(provider);
      setError(null);
      setStatus(null);
      goApiKey();
    },
    [goApiKey],
  );

  const onApiKeySubmit = React.useCallback(
    async (apiKey: string) => {
      if (!selectedProvider) return;
      setApiKeyBusy(true);
      setError(null);
      try {
        const ok = await saveApiKey(selectedProvider, apiKey);
        if (ok) {
          // Load models after saving API key
          await loadModels();
          goModelSelect();
        }
      } catch (err) {
        setError(String(err));
      } finally {
        setApiKeyBusy(false);
      }
    },
    [selectedProvider, saveApiKey, loadModels, goModelSelect],
  );

  const onModelSelect = React.useCallback(
    async (modelId: string) => {
      setError(null);
      try {
        await saveDefaultModel(modelId);
        goTelegramToken();
      } catch (err) {
        setError(String(err));
      }
    },
    [saveDefaultModel, goTelegramToken],
  );

  const onTelegramTokenNext = React.useCallback(async () => {
    setError(null);
    setStatus(null);
    try {
      const ok = await saveTelegramToken();
      if (ok) {
        goTelegramUser();
      }
    } catch (err) {
      setError(String(err));
      setStatus(null);
    }
  }, [goTelegramUser, saveTelegramToken]);

  const onTelegramUserNext = React.useCallback(async () => {
    setError(null);
    setStatus(null);
    try {
      const ok = await saveTelegramAllowFrom();
      if (ok) {
        goGog();
      }
    } catch (err) {
      setError(String(err));
      setStatus(null);
    }
  }, [goGog, saveTelegramAllowFrom]);

  return (
    <Routes>
      <Route
        index
        element={
          <IntroPage
            startBusy={startBusy}
            error={error}
            onStart={() => {
              void start();
            }}
          />
        }
      />

      <Route
        path="provider-select"
        element={<ProviderSelectPage error={error} onSelect={onProviderSelect} />}
      />

      <Route
        path="api-key"
        element={
          selectedProvider ? (
            <ApiKeyPage
              provider={selectedProvider}
              status={status}
              error={error}
              busy={apiKeyBusy}
              onSubmit={onApiKeySubmit}
              onBack={goProviderSelect}
            />
          ) : (
            <Navigate to={`${routes.welcome}/provider-select`} replace />
          )
        }
      />

      <Route
        path="model-select"
        element={
          <ModelSelectPage
            models={models}
            filterProvider={selectedProvider ?? undefined}
            loading={modelsLoading}
            error={modelsError}
            onSelect={(modelId) => void onModelSelect(modelId)}
            onBack={goApiKey}
            onRetry={() => void loadModels()}
          />
        }
      />

      <Route
        path="telegram-token"
        element={
          <TelegramTokenPage
            status={status}
            error={error}
            telegramToken={telegramToken}
            setTelegramToken={setTelegramToken}
            onNext={() => void onTelegramTokenNext()}
            onSkip={() => void goGog()}
          />
        }
      />

      <Route
        path="telegram-user"
        element={
          <TelegramUserPage
            status={status}
            error={error}
            telegramUserId={telegramUserId}
            setTelegramUserId={setTelegramUserId}
            channelsProbe={channelsProbe}
            onNext={() => void onTelegramUserNext()}
            onSkip={() => void goGog()}
          />
        }
      />

      <Route
        path="gog"
        element={
          <GogPage
            status={status}
            error={error}
            gogBusy={gogBusy}
            gogError={gogError}
            gogOutput={gogOutput}
            gogAccount={gogAccount}
            setGogAccount={setGogAccount}
            onRunAuthAdd={() =>
              void runGog(async () => {
                const api = window.openclawDesktop;
                if (!api) {
                  throw new Error("Desktop API not available");
                }
                const res = await api.gogAuthAdd({
                  account: gogAccount.trim(),
                  services: DEFAULT_GOG_SERVICES,
                });
                if (res.ok) {
                  await ensureGogExecDefaults();
                }
                return res;
              })
            }
            onRunAuthList={() =>
              void runGog(async () => {
                const api = window.openclawDesktop;
                if (!api) {
                  throw new Error("Desktop API not available");
                }
                return await api.gogAuthList();
              })
            }
            onFinish={() => finish()}
          />
        }
      />

      <Route path="*" element={<Navigate to={routes.welcome} replace />} />
    </Routes>
  );
}

