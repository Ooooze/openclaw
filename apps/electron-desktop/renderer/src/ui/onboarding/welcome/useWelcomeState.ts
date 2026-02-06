import React from "react";
import type { NavigateFunction } from "react-router-dom";
import { useGatewayRpc } from "../../../gateway/context";
import { useAppDispatch } from "../../../store/hooks";
import { setOnboarded } from "../../../store/slices/onboardingSlice";
import type { GatewayState } from "../../../../../src/main/types";
import { routes } from "../../routes";
import type { Provider } from "../ProviderSelectPage";
import { useWelcomeApiKey } from "./useWelcomeApiKey";
import { useWelcomeAppleNotes } from "./useWelcomeAppleNotes";
import { useWelcomeAppleReminders } from "./useWelcomeAppleReminders";
import { useWelcomeConfig } from "./useWelcomeConfig";
import { useWelcomeGog } from "./useWelcomeGog";
import { useWelcomeModels } from "./useWelcomeModels";
import { useWelcomeNotion } from "./useWelcomeNotion";
import { useWelcomeObsidian } from "./useWelcomeObsidian";
import { useWelcomeSlack } from "./useWelcomeSlack";
import { useWelcomeGitHub } from "./useWelcomeGitHub";
import { useWelcomeTrello } from "./useWelcomeTrello";
import { useWelcomeTelegram } from "./useWelcomeTelegram";
import { useWelcomeWebSearch, type WebSearchProvider } from "./useWelcomeWebSearch";
import { getObject } from "./utils";
import { addToastError } from "../../toast";

type WelcomeStateInput = {
  state: Extract<GatewayState, { kind: "ready" }>;
  navigate: NavigateFunction;
};

type SkillId =
  | "google-workspace"
  | "media-understanding"
  | "web-search"
  | "notion"
  | "trello"
  | "apple-notes"
  | "apple-reminders"
  | "obsidian"
  | "github"
  | "slack";
type SkillStatus = "connect" | "connected";
type ConnectionStatus = "connect" | "connected";

type ObsidianVault = {
  name: string;
  path: string;
  open: boolean;
};

export function useWelcomeState({ state, navigate }: WelcomeStateInput) {
  const gw = useGatewayRpc();
  const dispatch = useAppDispatch();

  const [startBusy, setStartBusy] = React.useState(false);
  const [status, setStatus] = React.useState<string | null>(null);
  const [error, setErrorState] = React.useState<string | null>(null);

  const setError = React.useCallback((value: string | null) => {
    if (value) {
      addToastError(value);
    }
    setErrorState(value);
  }, []);

  const [selectedProvider, setSelectedProvider] = React.useState<Provider | null>(null);
  const [apiKeyBusy, setApiKeyBusy] = React.useState(false);
  const [notionBusy, setNotionBusy] = React.useState(false);
  const [trelloBusy, setTrelloBusy] = React.useState(false);
  const [webSearchBusy, setWebSearchBusy] = React.useState(false);
  const [mediaUnderstandingBusy, setMediaUnderstandingBusy] = React.useState(false);
  const [appleNotesBusy, setAppleNotesBusy] = React.useState(false);
  const [appleRemindersBusy, setAppleRemindersBusy] = React.useState(false);
  const [obsidianBusy, setObsidianBusy] = React.useState(false);
  const [githubBusy, setGitHubBusy] = React.useState(false);
  const [slackBusy, setSlackBusy] = React.useState(false);
  const [telegramStatus, setTelegramStatus] = React.useState<ConnectionStatus>("connect");
  const [obsidianVaultsLoading, setObsidianVaultsLoading] = React.useState(false);
  const [obsidianVaults, setObsidianVaults] = React.useState<ObsidianVault[]>([]);
  const [selectedObsidianVaultName, setSelectedObsidianVaultName] = React.useState("");
  const [hasOpenAiProvider, setHasOpenAiProvider] = React.useState(false);
  const [skills, setSkills] = React.useState<Record<SkillId, SkillStatus>>({
    "google-workspace": "connect",
    "media-understanding": "connect",
    "web-search": "connect",
    notion: "connect",
    trello: "connect",
    "apple-notes": "connect",
    "apple-reminders": "connect",
    obsidian: "connect",
    github: "connect",
    slack: "connect",
  });

  const { configPath, ensureExtendedConfig, loadConfig } = useWelcomeConfig({
    gw,
    state,
    setError,
    setStatus,
  });
  const { saveApiKey } = useWelcomeApiKey({ gw, loadConfig, setError, setStatus });
  const { enableAppleNotes } = useWelcomeAppleNotes({ gw, loadConfig, setError, setStatus });
  const { enableAppleReminders } = useWelcomeAppleReminders({ gw, loadConfig, setError, setStatus });
  const { enableObsidian } = useWelcomeObsidian({ gw, loadConfig, setError, setStatus });
  const { enableGitHub } = useWelcomeGitHub({ gw, loadConfig, setError, setStatus });
  const { saveNotionApiKey } = useWelcomeNotion({ gw, loadConfig, setError, setStatus });
  const { saveTrello } = useWelcomeTrello({ gw, loadConfig, setError, setStatus });
  const { saveSlackConfig } = useWelcomeSlack({ gw, loadConfig, setError, setStatus });
  const { saveWebSearch } = useWelcomeWebSearch({ gw, loadConfig, setError, setStatus });
  const { loadModels, models, modelsError, modelsLoading, saveDefaultModel } = useWelcomeModels({
    gw,
    loadConfig,
    setError,
    setStatus,
  });
  const {
    channelsProbe,
    saveTelegramAllowFrom,
    saveTelegramToken,
    setTelegramToken,
    setTelegramUserId,
    telegramToken,
    telegramUserId,
  } = useWelcomeTelegram({ gw, loadConfig, setError, setStatus });
  const { gogAccount, gogBusy, gogError, gogOutput, onGogAuthAdd, onGogAuthList, setGogAccount } = useWelcomeGog({
    gw,
  });

  const finish = React.useCallback(() => {
    void dispatch(setOnboarded(true));
    void navigate(routes.chat, { replace: true });
  }, [dispatch, navigate]);

  const start = React.useCallback(async () => {
    setError(null);
    setStatus(null);
    setStartBusy(true);
    try {
      await ensureExtendedConfig();
      void navigate(`${routes.welcome}/provider-select`);
    } catch (err) {
      setError(String(err));
    } finally {
      setStartBusy(false);
    }
  }, [ensureExtendedConfig, navigate]);

  const goApiKey = React.useCallback(() => {
    void navigate(`${routes.welcome}/api-key`);
  }, [navigate]);
  const goModelSelect = React.useCallback(() => {
    void navigate(`${routes.welcome}/model-select`);
  }, [navigate]);
  const goWebSearch = React.useCallback(() => {
    void navigate(`${routes.welcome}/web-search`);
  }, [navigate]);
  const goMediaUnderstanding = React.useCallback(
    () => {
      void refreshProviderFlags();
      void navigate(`${routes.welcome}/media-understanding`);
    },
    [navigate],
  );
  const goSkills = React.useCallback(() => {
    void navigate(`${routes.welcome}/skills`);
  }, [navigate]);
  const goNotion = React.useCallback(() => {
    void navigate(`${routes.welcome}/notion`);
  }, [navigate]);
  const goTrello = React.useCallback(() => {
    void navigate(`${routes.welcome}/trello`);
  }, [navigate]);
  const goTelegramToken = React.useCallback(() => {
    void navigate(`${routes.welcome}/telegram-token`);
  }, [navigate]);
  const goTelegramUser = React.useCallback(() => {
    void navigate(`${routes.welcome}/telegram-user`);
  }, [navigate]);
  const goGog = React.useCallback(() => {
    void navigate(`${routes.welcome}/gog`);
  }, [navigate]);
  const goGogGoogleWorkspace = React.useCallback(() => {
    void navigate(`${routes.welcome}/gog-google-workspace`);
  }, [navigate]);
  const goProviderSelect = React.useCallback(() => {
    void navigate(`${routes.welcome}/provider-select`);
  }, [navigate]);
  const goAppleNotes = React.useCallback(() => {
    void navigate(`${routes.welcome}/apple-notes`);
  }, [navigate]);
  const goAppleReminders = React.useCallback(() => {
    void navigate(`${routes.welcome}/apple-reminders`);
  }, [navigate]);
  const goGitHub = React.useCallback(() => {
    void navigate(`${routes.welcome}/github`);
  }, [navigate]);
  const goConnections = React.useCallback(() => {
    void navigate(`${routes.welcome}/connections`);
  }, [navigate]);

  const slackReturnToRef = React.useRef<"skills" | "connections">("skills");
  const goSlackFromSkills = React.useCallback(() => {
    slackReturnToRef.current = "skills";
    void navigate(`${routes.welcome}/slack`);
  }, [navigate]);
  const goSlackFromConnections = React.useCallback(() => {
    slackReturnToRef.current = "connections";
    void navigate(`${routes.welcome}/slack`);
  }, [navigate]);
  const goSlackBack = React.useCallback(() => {
    if (slackReturnToRef.current === "connections") {
      goConnections();
      return;
    }
    goSkills();
  }, [goConnections, goSkills]);

  const refreshObsidianVaults = React.useCallback(async (): Promise<void> => {
    const api = window.openclawDesktop;
    if (!api) {
      throw new Error("Desktop API not available");
    }
    setObsidianVaultsLoading(true);
    try {
      const res = await api.obsidianVaultsList();
      if (!res.ok) {
        const stderr = res.stderr?.trim();
        const stdout = res.stdout?.trim();
        throw new Error(stderr || stdout || "failed to list Obsidian vaults");
      }
      const parsed = JSON.parse(res.stdout || "[]") as unknown;
      const list: ObsidianVault[] = Array.isArray(parsed)
        ? parsed
            .map((v) => {
              if (!v || typeof v !== "object" || Array.isArray(v)) {
                return null;
              }
              const o = v as { name?: unknown; path?: unknown; open?: unknown };
              const name = typeof o.name === "string" ? o.name : "";
              const vaultPath = typeof o.path === "string" ? o.path : "";
              const open = o.open === true;
              if (!name || !vaultPath) {
                return null;
              }
              return { name, path: vaultPath, open };
            })
            .filter((v): v is ObsidianVault => Boolean(v))
        : [];
      setObsidianVaults(list);
      // Prefer the currently-open vault (Obsidian app), otherwise keep user selection, otherwise pick the first.
      const openVault = list.find((v) => v.open);
      setSelectedObsidianVaultName((prev) => prev || openVault?.name || list[0]?.name || "");
    } finally {
      setObsidianVaultsLoading(false);
    }
  }, []);

  const goObsidian = React.useCallback(() => {
    setError(null);
    setStatus("Loading Obsidian vaults…");
    void (async () => {
      try {
        await refreshObsidianVaults();
        setStatus(null);
        void navigate(`${routes.welcome}/obsidian`);
      } catch (err) {
        setError(String(err));
        setStatus(null);
      }
    })();
  }, [navigate, refreshObsidianVaults, setError, setStatus]);

  const markSkillConnected = React.useCallback((skillId: SkillId) => {
    setSkills((prev) => {
      if (prev[skillId] === "connected") {
        return prev;
      }
      return { ...prev, [skillId]: "connected" };
    });
  }, []);

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
      if (!selectedProvider) {
        return;
      }
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
        goSkills();
      } catch (err) {
        setError(String(err));
      }
    },
    [saveDefaultModel, goSkills],
  );

  const refreshProviderFlags = React.useCallback(async () => {
    try {
      const snap = await loadConfig();
      const cfg = getObject(snap.config);
      const auth = getObject(cfg.auth);
      const profiles = getObject(auth.profiles);
      const order = getObject(auth.order);
      const hasProfile = Object.values(profiles).some((p) => {
        if (!p || typeof p !== "object" || Array.isArray(p)) {
          return false;
        }
        return (p as { provider?: unknown }).provider === "openai";
      });
      const hasOrder = Object.prototype.hasOwnProperty.call(order, "openai");
      setHasOpenAiProvider(Boolean(hasProfile || hasOrder));
    } catch {
      // Best-effort; keep false on failures.
      setHasOpenAiProvider(false);
    }
  }, [loadConfig]);

  const onWebSearchSubmit = React.useCallback(
    async (provider: WebSearchProvider, apiKey: string) => {
      setWebSearchBusy(true);
      setError(null);
      setStatus(null);
      try {
        const ok = await saveWebSearch(provider, apiKey);
        if (ok) {
          markSkillConnected("web-search");
          goSkills();
        }
      } catch (err) {
        setError(String(err));
        setStatus(null);
      } finally {
        setWebSearchBusy(false);
      }
    },
    [goSkills, markSkillConnected, saveWebSearch],
  );

  const onMediaUnderstandingSubmit = React.useCallback(
    async (settings: { image: boolean; audio: boolean }) => {
      setMediaUnderstandingBusy(true);
      setError(null);
      setStatus("Saving media understanding settings…");
      try {
        const snap = await loadConfig();
        const baseHash = typeof snap.hash === "string" && snap.hash.trim() ? snap.hash.trim() : null;
        if (!baseHash) {
          throw new Error("Config base hash missing. Reload and try again.");
        }
        await gw.request("config.patch", {
          baseHash,
          raw: JSON.stringify(
            {
              tools: {
                media: {
                  image: { enabled: settings.image },
                  audio: { enabled: settings.audio },
                  video: { enabled: false },
                },
              },
            },
            null,
            2,
          ),
          note: "Welcome: configure media understanding",
        });
        markSkillConnected("media-understanding");
        setStatus("Media understanding enabled.");
        goSkills();
      } catch (err) {
        setError(String(err));
        setStatus(null);
      } finally {
        setMediaUnderstandingBusy(false);
      }
    },
    [goSkills, gw, loadConfig, markSkillConnected, setError, setStatus],
  );

  const _mediaProvidersDetected = React.useMemo(() => {
    const providers = new Set((models ?? []).map((m) => m.provider).filter(Boolean));
    const image = ["openai", "google", "anthropic", "minimax"].filter((p) => providers.has(p));
    const audio = ["openai", "google", "groq"].filter((p) => providers.has(p));
    return { image, audio };
  }, [models]);

  const onMediaProviderKeySubmit = React.useCallback(
    async (provider: "openai", apiKey: string) => {
      // Save an additional provider key without re-running model selection flow.
      const ok = await saveApiKey(provider, apiKey);
      if (ok) {
        await loadModels();
        await refreshProviderFlags();
      }
      return ok;
    },
    [loadModels, refreshProviderFlags, saveApiKey],
  );

  const onNotionApiKeySubmit = React.useCallback(
    async (apiKey: string) => {
      setNotionBusy(true);
      setError(null);
      setStatus(null);
      try {
        const ok = await saveNotionApiKey(apiKey);
        if (ok) {
          markSkillConnected("notion");
          goSkills();
        }
      } catch (err) {
        setError(String(err));
        setStatus(null);
      } finally {
        setNotionBusy(false);
      }
    },
    [goSkills, markSkillConnected, saveNotionApiKey, setError, setStatus],
  );

  const onTrelloSubmit = React.useCallback(
    async (apiKey: string, token: string) => {
      setTrelloBusy(true);
      setError(null);
      setStatus(null);
      try {
        const ok = await saveTrello(apiKey, token);
        if (ok) {
          markSkillConnected("trello");
          goSkills();
        }
      } catch (err) {
        setError(String(err));
        setStatus(null);
      } finally {
        setTrelloBusy(false);
      }
    },
    [goSkills, markSkillConnected, saveTrello, setError, setStatus],
  );

  const onAppleNotesCheckAndEnable = React.useCallback(async () => {
    setAppleNotesBusy(true);
    setError(null);
    setStatus("Checking memo…");
    try {
      const api = window.openclawDesktop;
      if (!api) {
        throw new Error("Desktop API not available");
      }
      const res = await api.memoCheck();
      if (!res.ok) {
        const stderr = res.stderr?.trim();
        const stdout = res.stdout?.trim();
        throw new Error(stderr || stdout || "memo check failed");
      }
      const ok = await enableAppleNotes({ memoResolvedPath: res.resolvedPath });
      if (ok) {
        markSkillConnected("apple-notes");
        goSkills();
      }
    } catch (err) {
      setError(String(err));
      setStatus(null);
    } finally {
      setAppleNotesBusy(false);
    }
  }, [enableAppleNotes, goSkills, markSkillConnected]);

  const onAppleRemindersAuthorizeAndEnable = React.useCallback(async () => {
    setAppleRemindersBusy(true);
    setError(null);
    setStatus("Authorizing remindctl…");
    try {
      const api = window.openclawDesktop;
      if (!api) {
        throw new Error("Desktop API not available");
      }
      const authorizeRes = await api.remindctlAuthorize();
      if (!authorizeRes.ok) {
        const stderr = authorizeRes.stderr?.trim();
        const stdout = authorizeRes.stdout?.trim();
        throw new Error(stderr || stdout || "remindctl authorize failed");
      }

      setStatus("Checking Reminders access…");
      const todayRes = await api.remindctlTodayJson();
      if (!todayRes.ok) {
        const stderr = todayRes.stderr?.trim();
        const stdout = todayRes.stdout?.trim();
        throw new Error(stderr || stdout || "remindctl check failed");
      }

      const resolvedPath = todayRes.resolvedPath ?? authorizeRes.resolvedPath ?? null;
      const ok = await enableAppleReminders({ remindctlResolvedPath: resolvedPath });
      if (ok) {
        markSkillConnected("apple-reminders");
        goSkills();
      }
    } catch (err) {
      setError(String(err));
      setStatus(null);
    } finally {
      setAppleRemindersBusy(false);
    }
  }, [enableAppleReminders, goSkills, markSkillConnected]);

  const onObsidianRecheck = React.useCallback(async () => {
    setObsidianBusy(true);
    setError(null);
    setStatus("Checking obsidian-cli…");
    try {
      const api = window.openclawDesktop;
      if (!api) {
        throw new Error("Desktop API not available");
      }

      const checkRes = await api.obsidianCliCheck();
      if (!checkRes.ok) {
        const stderr = checkRes.stderr?.trim();
        const stdout = checkRes.stdout?.trim();
        throw new Error(stderr || stdout || "obsidian-cli check failed");
      }

      // Enable skill + allowlist regardless of default vault state.
      await enableObsidian({ obsidianCliResolvedPath: checkRes.resolvedPath });

      setStatus("Checking default vault…");
      const defaultRes = await api.obsidianCliPrintDefaultPath();
      if (defaultRes.ok) {
        markSkillConnected("obsidian");
        goSkills();
        return;
      }

      // Keep the skill enabled, but don't mark as connected until default vault is set.
      setStatus('Obsidian enabled. Set a default vault, then click "Check & enable" again.');
    } catch (err) {
      setError(String(err));
      setStatus(null);
    } finally {
      setObsidianBusy(false);
    }
  }, [enableObsidian, goSkills, markSkillConnected]);

  const onObsidianSetDefaultAndEnable = React.useCallback(
    async (vaultName: string) => {
      setObsidianBusy(true);
      setError(null);
      setStatus("Checking obsidian-cli…");
      try {
        const api = window.openclawDesktop;
        if (!api) {
          throw new Error("Desktop API not available");
        }

        const checkRes = await api.obsidianCliCheck();
        if (!checkRes.ok) {
          const stderr = checkRes.stderr?.trim();
          const stdout = checkRes.stdout?.trim();
          throw new Error(stderr || stdout || "obsidian-cli check failed");
        }

        setStatus("Setting default vault…");
        const setRes = await api.obsidianCliSetDefault({ vaultName });
        if (!setRes.ok) {
          const stderr = setRes.stderr?.trim();
          const stdout = setRes.stdout?.trim();
          throw new Error(stderr || stdout || "failed to set default vault");
        }

        // Enable skill + allowlist with the resolved path we actually run.
        const resolvedPath = checkRes.resolvedPath ?? setRes.resolvedPath ?? null;
        await enableObsidian({ obsidianCliResolvedPath: resolvedPath });

        setStatus("Checking default vault…");
        const defaultRes = await api.obsidianCliPrintDefaultPath();
        if (!defaultRes.ok) {
          const stderr = defaultRes.stderr?.trim();
          const stdout = defaultRes.stdout?.trim();
          throw new Error(stderr || stdout || "default vault check failed");
        }

        markSkillConnected("obsidian");
        goSkills();
      } catch (err) {
        setError(String(err));
        setStatus(null);
      } finally {
        setObsidianBusy(false);
      }
    },
    [enableObsidian, goSkills, markSkillConnected],
  );

  const onGitHubConnect = React.useCallback(
    async (pat: string) => {
      setGitHubBusy(true);
      setError(null);
      setStatus("Checking gh…");
      try {
        const api = window.openclawDesktop;
        if (!api) {
          throw new Error("Desktop API not available");
        }

        const checkRes = await api.ghCheck();
        if (!checkRes.ok) {
          const stderr = checkRes.stderr?.trim();
          const stdout = checkRes.stdout?.trim();
          throw new Error(stderr || stdout || "gh check failed");
        }

        setStatus("Signing in to GitHub…");
        const loginRes = await api.ghAuthLoginPat({ pat });
        if (!loginRes.ok) {
          const stderr = loginRes.stderr?.trim();
          const stdout = loginRes.stdout?.trim();
          throw new Error(stderr || stdout || "gh auth login failed");
        }

        setStatus("Verifying authentication…");
        const statusRes = await api.ghAuthStatus();
        if (!statusRes.ok) {
          const stderr = statusRes.stderr?.trim();
          const stdout = statusRes.stdout?.trim();
          throw new Error(stderr || stdout || "gh auth status failed");
        }

        const userRes = await api.ghApiUser();
        if (!userRes.ok) {
          const stderr = userRes.stderr?.trim();
          const stdout = userRes.stdout?.trim();
          throw new Error(stderr || stdout || "gh api user failed");
        }

        const resolvedPath = checkRes.resolvedPath ?? loginRes.resolvedPath ?? null;
        const ok = await enableGitHub({ ghResolvedPath: resolvedPath });
        if (ok) {
          markSkillConnected("github");
          goSkills();
        }
      } catch (err) {
        setError(String(err));
        setStatus(null);
      } finally {
        setGitHubBusy(false);
      }
    },
    [enableGitHub, goSkills, markSkillConnected],
  );

  const onSlackConnect = React.useCallback(
    async (settings: {
      botName: string;
      botToken: string;
      appToken: string;
      groupPolicy: "open" | "allowlist" | "disabled";
      channelAllowlist: string[];
      dmPolicy: "pairing" | "allowlist" | "open" | "disabled";
      dmAllowFrom: string[];
    }) => {
      setSlackBusy(true);
      setError(null);
      setStatus(null);
      try {
        const ok = await saveSlackConfig(settings);
        if (ok) {
          markSkillConnected("slack");
          if (slackReturnToRef.current === "connections") {
            goConnections();
          } else {
            goSkills();
          }
        }
      } catch (err) {
        setError(String(err));
        setStatus(null);
      } finally {
        setSlackBusy(false);
      }
    },
    [goConnections, goSkills, markSkillConnected, saveSlackConfig],
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
        setTelegramStatus("connected");
        goConnections();
      }
    } catch (err) {
      setError(String(err));
      setStatus(null);
    }
  }, [goConnections, saveTelegramAllowFrom]);

  return {
    appleNotesBusy,
    appleRemindersBusy,
    obsidianBusy,
    githubBusy,
    slackBusy,
    apiKeyBusy,
    channelsProbe,
    configPath,
    error,
    finish,
    goApiKey,
    goGog,
    goGogGoogleWorkspace,
    goAppleNotes,
    goAppleReminders,
    goObsidian,
    goGitHub,
    goConnections,
    goSlackFromSkills,
    goSlackFromConnections,
    goSlackBack,
    goModelSelect,
    goMediaUnderstanding,
    goWebSearch,
    goNotion,
    goTrello,
    goProviderSelect,
    goSkills,
    goTelegramToken,
    goTelegramUser,
    gogAccount,
    gogBusy,
    gogError,
    gogOutput,
    loadModels,
    markSkillConnected,
    models,
    modelsError,
    modelsLoading,
    mediaUnderstandingBusy,
    hasOpenAiProvider,
    onMediaUnderstandingSubmit,
    onMediaProviderKeySubmit,
    notionBusy,
    trelloBusy,
    onWebSearchSubmit,
    onNotionApiKeySubmit,
    onTrelloSubmit,
    onAppleNotesCheckAndEnable,
    onAppleRemindersAuthorizeAndEnable,
    obsidianVaultsLoading,
    obsidianVaults,
    selectedObsidianVaultName,
    setSelectedObsidianVaultName,
    onObsidianSetDefaultAndEnable,
    onObsidianRecheck,
    onGitHubConnect,
    onSlackConnect,
    onApiKeySubmit,
    onGogAuthAdd,
    onGogAuthList,
    onModelSelect,
    onProviderSelect,
    onTelegramTokenNext,
    onTelegramUserNext,
    selectedProvider,
    setGogAccount,
    setTelegramToken,
    setTelegramUserId,
    skills,
    start,
    startBusy,
    status,
    telegramToken,
    telegramUserId,
    telegramStatus,
    webSearchBusy,
  };
}
