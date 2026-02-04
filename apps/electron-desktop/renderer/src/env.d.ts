import type { GogExecResult } from "../../src/main/gog/types";
import type { GatewayState, ResetAndCloseResult } from "../../src/main/types";

export {};

declare global {
  interface Window {
    openclawDesktop?: {
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
      gogAuthAdd: (params: {
        account: string;
        services?: string;
        noInput?: boolean;
      }) => Promise<GogExecResult>;
      gogAuthCredentials: (params: {
        credentialsJson: string;
        filename?: string;
      }) => Promise<GogExecResult>;
      onGatewayState: (cb: (state: GatewayState) => void) => () => void;
    };
  }
}

