import { contextBridge, ipcRenderer } from "electron";

import type { GogExecResult } from "./main/gog/types";
import type { GatewayState, ResetAndCloseResult } from "./main/types";

type OpenclawDesktopApi = {
  version: string;
  openLogs: () => Promise<void>;
  toggleDevTools: () => Promise<void>;
  retry: () => Promise<void>;
  resetAndClose: () => Promise<ResetAndCloseResult>;
  getGatewayInfo: () => Promise<{ state: GatewayState | null }>;
  getConsentInfo: () => Promise<{ accepted: boolean }>;
  acceptConsent: () => Promise<{ ok: true }>;
  startGateway: () => Promise<{ ok: true }>;
  openExternal: (url: string) => Promise<void>;
  setApiKey: (provider: string, apiKey: string) => Promise<{ ok: true }>;
  gogAuthList: () => Promise<GogExecResult>;
  gogAuthAdd: (params: { account: string; services?: string; noInput?: boolean }) => Promise<GogExecResult>;
  gogAuthCredentials: (params: { credentialsJson: string; filename?: string }) => Promise<GogExecResult>;
  onGatewayState: (cb: (state: GatewayState) => void) => () => void;
};

// Expose only the bare minimum to the renderer. The Control UI is served by the Gateway and
// does not require Electron privileged APIs.
const api: OpenclawDesktopApi = {
  version: "0.0.0",
  openLogs: async () => ipcRenderer.invoke("open-logs"),
  toggleDevTools: async () => ipcRenderer.invoke("devtools-toggle"),
  retry: async () => ipcRenderer.invoke("gateway-retry"),
  resetAndClose: async () => ipcRenderer.invoke("reset-and-close"),
  getGatewayInfo: async () => ipcRenderer.invoke("gateway-get-info"),
  getConsentInfo: async () => ipcRenderer.invoke("consent-get"),
  acceptConsent: async () => ipcRenderer.invoke("consent-accept"),
  startGateway: async () => ipcRenderer.invoke("gateway-start"),
  openExternal: async (url: string) => ipcRenderer.invoke("open-external", { url }),
  setApiKey: async (provider: string, apiKey: string) => ipcRenderer.invoke("auth-set-api-key", { provider, apiKey }),
  gogAuthList: async () => ipcRenderer.invoke("gog-auth-list"),
  gogAuthAdd: async (params: { account: string; services?: string; noInput?: boolean }) =>
    ipcRenderer.invoke("gog-auth-add", params),
  gogAuthCredentials: async (params: { credentialsJson: string; filename?: string }) =>
    ipcRenderer.invoke("gog-auth-credentials", params),
  onGatewayState: (cb: (state: GatewayState) => void) => {
    const handler = (_evt: unknown, state: GatewayState) => cb(state);
    ipcRenderer.on("gateway-state", handler);
    return () => {
      ipcRenderer.removeListener("gateway-state", handler);
    };
  },
};

contextBridge.exposeInMainWorld("openclawDesktop", api);

