import React from "react";
import type { GatewayState } from "../../../../../src/main/types";
import type { ConfigSnapshot, GatewayRpcLike } from "./types";
import { getObject, inferWorkspaceDirFromConfigPath } from "./utils";

type UseWelcomeConfigInput = {
  gw: GatewayRpcLike;
  state: Extract<GatewayState, { kind: "ready" }>;
  setError: (value: string | null) => void;
  setStatus: (value: string | null) => void;
};

export function useWelcomeConfig({ gw, state, setError, setStatus }: UseWelcomeConfigInput) {
  const [configPath, setConfigPath] = React.useState<string | null>(null);

  const loadConfig = React.useCallback(async () => {
    const snap = await gw.request<ConfigSnapshot>("config.get", {});
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
    const hooks = getObject(cfg.hooks);
    const hooksInternal = getObject(hooks.internal);
    const hooksEntries = getObject(hooksInternal.entries);

    const currentWorkspace =
      typeof defaults.workspace === "string" ? defaults.workspace.trim() : "";
    const workspace = currentWorkspace || inferWorkspaceDirFromConfigPath(snap.path);

    const patch: Record<string, unknown> = {};

    const authToken = typeof gatewayAuth.token === "string" ? gatewayAuth.token.trim() : "";
    const authMode = typeof gatewayAuth.mode === "string" ? gatewayAuth.mode.trim() : "";
    const port =
      typeof gateway.port === "number" && Number.isFinite(gateway.port) ? gateway.port : null;
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

    // Enable recommended internal hooks by default on first-run config creation.
    // We only fill missing keys and avoid overriding explicit user choices.
    const internalEnabled =
      typeof hooksInternal.enabled === "boolean" ? hooksInternal.enabled : null;
    const shouldConsiderHooks = internalEnabled !== false;
    if (shouldConsiderHooks) {
      const nextEntries: Record<string, unknown> = { ...hooksEntries };
      const ensureEntry = (name: string) => {
        if (name in nextEntries) {
          return;
        }
        nextEntries[name] = { enabled: true };
      };
      ensureEntry("session-memory");
      ensureEntry("command-logger");

      const needsInternalEnabled = internalEnabled !== true;
      const needsEntries = Object.keys(nextEntries).length !== Object.keys(hooksEntries).length;
      if (needsInternalEnabled || needsEntries) {
        patch.hooks = {
          ...hooks,
          internal: {
            ...hooksInternal,
            enabled: internalEnabled === null ? true : hooksInternal.enabled,
            entries: nextEntries,
          },
        };
      }
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
  }, [gw, loadConfig, setError, setStatus, state.port, state.token]);

  return {
    configPath,
    ensureExtendedConfig,
    loadConfig,
  };
}
