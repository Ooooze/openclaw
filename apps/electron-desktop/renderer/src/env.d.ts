import type { ExecResult } from "../../src/shared/types";
import type { GogExecResult } from "../../src/main/gog/types";
import type { GatewayState, ResetAndCloseResult } from "../../src/main/types";

type UpdateAvailablePayload = {
  version: string;
  releaseDate?: string;
};

type UpdateDownloadProgressPayload = {
  percent: number;
  bytesPerSecond: number;
  transferred: number;
  total: number;
};

type UpdateDownloadedPayload = {
  version: string;
};

type UpdateErrorPayload = {
  message: string;
};

declare global {
  interface Window {
    openclawDesktop?: {
      version: string;
      openLogs: () => Promise<void>;
      openWorkspaceFolder: () => Promise<void>;
      openOpenclawFolder: () => Promise<void>;
      toggleDevTools: () => Promise<void>;
      retry: () => Promise<void>;
      resetAndClose: () => Promise<ResetAndCloseResult>;
      getGatewayInfo: () => Promise<{ state: GatewayState | null }>;
      getConsentInfo: () => Promise<{ accepted: boolean }>;
      acceptConsent: () => Promise<{ ok: true }>;
      startGateway: () => Promise<{ ok: true }>;
      openExternal: (url: string) => Promise<void>;
      setApiKey: (provider: string, apiKey: string) => Promise<{ ok: true }>;
      validateApiKey: (
        provider: string,
        apiKey: string,
      ) => Promise<{ valid: boolean; error?: string }>;
      authHasApiKey: (provider: string) => Promise<{ configured: boolean }>;
      gogAuthList: () => Promise<GogExecResult>;
      gogAuthAdd: (params: {
        account: string;
        services?: string;
        noInput?: boolean;
      }) => Promise<GogExecResult>;
      gogAuthCredentials: (params: {
        credentialsJson: string;
        filename?: string;
      }) => Promise<GogExecResult>;
      memoCheck: () => Promise<ExecResult>;
      remindctlAuthorize: () => Promise<ExecResult>;
      remindctlTodayJson: () => Promise<ExecResult>;
      obsidianCliCheck: () => Promise<ExecResult>;
      obsidianCliPrintDefaultPath: () => Promise<ExecResult>;
      obsidianVaultsList: () => Promise<ExecResult>;
      obsidianCliSetDefault: (params: { vaultName: string }) => Promise<ExecResult>;
      ghCheck: () => Promise<ExecResult>;
      ghAuthLoginPat: (params: { pat: string }) => Promise<ExecResult>;
      ghAuthStatus: () => Promise<ExecResult>;
      ghApiUser: () => Promise<ExecResult>;
      onGatewayState: (cb: (state: GatewayState) => void) => () => void;
      // OpenClaw config (openclaw.json)
      readConfig: () => Promise<{ ok: boolean; content: string; error?: string }>;
      writeConfig: (content: string) => Promise<{ ok: boolean; error?: string }>;
      // Launch at login (auto-start)
      getLaunchAtLogin: () => Promise<{ enabled: boolean }>;
      setLaunchAtLogin: (enabled: boolean) => Promise<{ ok: true }>;
      // App version
      getAppVersion: () => Promise<{ version: string }>;
      fetchReleaseNotes: (
        version: string,
        owner: string,
        repo: string,
      ) => Promise<{ ok: boolean; body: string; htmlUrl: string }>;
      // Auto-updater
      checkForUpdate: () => Promise<void>;
      downloadUpdate: () => Promise<void>;
      installUpdate: () => Promise<void>;
      onUpdateAvailable: (cb: (payload: UpdateAvailablePayload) => void) => () => void;
      onUpdateDownloadProgress: (
        cb: (payload: UpdateDownloadProgressPayload) => void,
      ) => () => void;
      onUpdateDownloaded: (cb: (payload: UpdateDownloadedPayload) => void) => () => void;
      onUpdateError: (cb: (payload: UpdateErrorPayload) => void) => () => void;
      // Custom skills
      installCustomSkill: (data: string) => Promise<{
        ok: boolean;
        skill?: { name: string; description: string; emoji: string; dirName: string };
        error?: string;
      }>;
      listCustomSkills: () => Promise<{
        ok: boolean;
        skills: Array<{ name: string; description: string; emoji: string; dirName: string }>;
      }>;
      removeCustomSkill: (dirName: string) => Promise<{ ok: boolean; error?: string }>;
      // Embedded terminal (PTY) — multi-session
      terminalCreate: () => Promise<{ id: string }>;
      terminalWrite: (id: string, data: string) => Promise<void>;
      terminalResize: (id: string, cols: number, rows: number) => Promise<void>;
      terminalKill: (id: string) => Promise<void>;
      terminalList: () => Promise<Array<{ id: string; alive: boolean }>>;
      terminalGetBuffer: (id: string) => Promise<string>;
      onTerminalData: (cb: (payload: { id: string; data: string }) => void) => () => void;
      onTerminalExit: (
        cb: (payload: { id: string; exitCode: number; signal?: number }) => void,
      ) => () => void;
    };
  }
}
