import React from "react";

import { ActionButton, ButtonRow, InlineError, TextInput } from "../kit";
import type { GatewayState } from "../../../../src/main/types";

type GogExecResult = {
  ok: boolean;
  code: number | null;
  stdout: string;
  stderr: string;
};

type GatewayRpc = {
  request: <T = unknown>(method: string, params?: unknown) => Promise<T>;
};

type ConfigSnapshotLike = {
  path?: string;
  exists?: boolean;
  valid?: boolean;
  hash?: string;
  config?: unknown;
};

function inferWorkspaceDirFromConfigPath(configPath: string | undefined): string {
  const raw = typeof configPath === "string" ? configPath.trim() : "";
  if (!raw) {
    return "~/openclaw-workspace";
  }
  // Cross-platform best-effort: derive "<dir>/workspace" from "<dir>/openclaw.json".
  const sep = raw.includes("\\") ? "\\" : "/";
  const idx = raw.lastIndexOf(sep);
  if (idx <= 0) {
    return "~/openclaw-workspace";
  }
  const dir = raw.slice(0, idx);
  return `${dir}${sep}workspace`;
}

export function SkillsIntegrationsTab(props: {
  state: Extract<GatewayState, { kind: "ready" }>;
  gw: GatewayRpc;
  configSnap: ConfigSnapshotLike | null;
  reload: () => Promise<void>;
  onError: (value: string | null) => void;
}) {
  const [configActionStatus, setConfigActionStatus] = React.useState<string | null>(null);

  const [gogAccount, setGogAccount] = React.useState("");
  const gogServices = "gmail,calendar,drive,docs,sheets,contacts";
  const [gogBusy, setGogBusy] = React.useState(false);
  const [gogError, setGogError] = React.useState<string | null>(null);
  const [gogOutput, setGogOutput] = React.useState<string | null>(null);

  const createConfigFile = React.useCallback(async () => {
    props.onError(null);
    setConfigActionStatus("creating");
    try {
      const minimal = {
        gateway: {
          mode: "local",
          bind: "loopback",
          port: props.state.port,
          auth: {
            mode: "token",
            token: props.state.token,
          },
        },
      };
      await props.gw.request("config.set", { raw: JSON.stringify(minimal, null, 2) });
      await props.reload();
      setConfigActionStatus("created");
    } catch (err) {
      setConfigActionStatus("error");
      props.onError(String(err));
    }
  }, [props]);

  const seedOnboardingDefaults = React.useCallback(async () => {
    props.onError(null);
    setConfigActionStatus("seeding");
    try {
      const snap = await props.gw.request<ConfigSnapshotLike>("config.get", {});
      const cfg =
        snap.config && typeof snap.config === "object" && !Array.isArray(snap.config)
          ? (snap.config as Record<string, unknown>)
          : {};

      const gateway =
        cfg.gateway && typeof cfg.gateway === "object" && !Array.isArray(cfg.gateway)
          ? (cfg.gateway as Record<string, unknown>)
          : {};
      const gatewayAuth =
        gateway.auth && typeof gateway.auth === "object" && !Array.isArray(gateway.auth)
          ? (gateway.auth as Record<string, unknown>)
          : {};

      const agents =
        cfg.agents && typeof cfg.agents === "object" && !Array.isArray(cfg.agents)
          ? (cfg.agents as Record<string, unknown>)
          : {};
      const agentDefaults =
        agents.defaults && typeof agents.defaults === "object" && !Array.isArray(agents.defaults)
          ? (agents.defaults as Record<string, unknown>)
          : {};

      const hooks =
        cfg.hooks && typeof cfg.hooks === "object" && !Array.isArray(cfg.hooks)
          ? (cfg.hooks as Record<string, unknown>)
          : {};
      const hooksInternal =
        hooks.internal && typeof hooks.internal === "object" && !Array.isArray(hooks.internal)
          ? (hooks.internal as Record<string, unknown>)
          : {};
      const hooksEntries =
        hooksInternal.entries &&
        typeof hooksInternal.entries === "object" &&
        !Array.isArray(hooksInternal.entries)
          ? (hooksInternal.entries as Record<string, unknown>)
          : {};

      const currentWorkspace = typeof agentDefaults.workspace === "string" ? agentDefaults.workspace.trim() : "";
      const workspaceDir = currentWorkspace || inferWorkspaceDirFromConfigPath(snap.path);

      // Only patch missing/empty keys so we don't stomp user config.
      const patch: Record<string, unknown> = {};

      // Ensure embedded Gateway config is present and matches the app token/port.
      const authToken = typeof gatewayAuth.token === "string" ? gatewayAuth.token.trim() : "";
      const authMode = typeof gatewayAuth.mode === "string" ? gatewayAuth.mode.trim() : "";
      const port = typeof gateway.port === "number" && Number.isFinite(gateway.port) ? gateway.port : null;
      const bind = typeof gateway.bind === "string" ? gateway.bind.trim() : "";
      const mode = typeof gateway.mode === "string" ? gateway.mode.trim() : "";

      const needsGateway =
        mode !== "local" ||
        bind !== "loopback" ||
        port !== props.state.port ||
        authMode !== "token" ||
        authToken !== props.state.token;
      if (needsGateway) {
        patch.gateway = {
          ...gateway,
          mode: "local",
          bind: "loopback",
          port: props.state.port,
          auth: {
            ...gatewayAuth,
            mode: "token",
            token: props.state.token,
          },
        };
      }

      const needsWorkspace = !currentWorkspace;
      if (needsWorkspace) {
        patch.agents = {
          ...agents,
          defaults: {
            ...agentDefaults,
            workspace: workspaceDir,
          },
        };
      }

      // Enable recommended internal hooks by default on first-run config creation.
      // Only fill missing keys and avoid overriding explicit user choices.
      const internalEnabled = typeof hooksInternal.enabled === "boolean" ? hooksInternal.enabled : null;
      const shouldConsiderHooks = internalEnabled !== false;
      if (shouldConsiderHooks) {
        const nextEntries: Record<string, unknown> = { ...hooksEntries };
        if (!("session-memory" in nextEntries)) {
          nextEntries["session-memory"] = { enabled: true };
        }
        if (!("command-logger" in nextEntries)) {
          nextEntries["command-logger"] = { enabled: true };
        }
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

      // If the file doesn't exist yet, write a seeded config. Otherwise, patch.
      if (snap.exists === false) {
        const seeded = { ...cfg, ...patch };
        await props.gw.request("config.set", { raw: JSON.stringify(seeded, null, 2) });
      } else if (Object.keys(patch).length > 0) {
        const baseHash = typeof snap.hash === "string" && snap.hash.trim() ? snap.hash.trim() : null;
        if (!baseHash) {
          throw new Error("Missing config base hash. Click Reload and try again.");
        }
        await props.gw.request("config.patch", {
          baseHash,
          raw: JSON.stringify(patch, null, 2),
          note: "Settings: seed onboarding defaults (workspace/gateway)",
        });
      }

      await props.reload();
      setConfigActionStatus("seeded");
    } catch (err) {
      setConfigActionStatus("error");
      props.onError(String(err));
    }
  }, [props]);

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
        setGogError(res.stderr?.trim() || "Google Workspace connection failed");
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
    const isPlainObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
    const snap = await props.gw.request<ConfigSnapshotLike>("config.get", {});
    const baseHash = typeof snap.hash === "string" && snap.hash.trim() ? snap.hash.trim() : "";
    if (!baseHash) {
      throw new Error("Missing config base hash. Click Reload and try again.");
    }
    const cfg = isPlainObject(snap.config) ? snap.config : {};
    const tools = isPlainObject(cfg.tools) ? cfg.tools : {};
    const exec = isPlainObject(tools.exec) ? tools.exec : {};

    const existingSafeBins = Array.isArray(exec.safeBins) ? exec.safeBins : [];
    const safeBins = Array.from(
      new Set(
        [
          ...existingSafeBins.map((v) => String(v).trim()).filter(Boolean),
          "gog",
        ].map((v) => v.toLowerCase()),
      ),
    );

    const host = typeof exec.host === "string" && exec.host.trim().length > 0 ? exec.host.trim() : "gateway";
    const security = typeof exec.security === "string" && exec.security.trim().length > 0 ? exec.security.trim() : "allowlist";
    const ask = typeof exec.ask === "string" && exec.ask.trim().length > 0 ? exec.ask.trim() : "on-miss";

    await props.gw.request("config.patch", {
      baseHash,
      raw: JSON.stringify({
        tools: {
          exec: {
            host,
            security,
            ask,
            safeBins,
          },
        },
      }),
      note: "Settings: ensure gog exec defaults",
    });

    await props.reload();
  }, [props]);

  return (
    <div className="UiSettingsContentInner">
      <div className="UiSettingsTabTitle">Skills and Integrations</div>

      <section className="UiSettingsSection">
        <div className="UiSectionTitle">Config</div>
        <div className="UiSectionSubtitle">
          {props.configSnap?.path ? (
            <>
              Path: <code>{props.configSnap.path}</code>
            </>
          ) : (
            <>Path: —</>
          )}
        </div>
        <div className="UiMetaRow">
          <span className="UiPill">
            exists: {props.configSnap ? (props.configSnap.exists === false ? "no" : "yes") : "—"}
          </span>
          <span className="UiPill">
            valid: {props.configSnap ? (props.configSnap.valid === false ? "no" : "yes") : "—"}
          </span>
        </div>
        <ButtonRow>
          <ActionButton
            variant="primary"
            onClick={() => void seedOnboardingDefaults()}
            disabled={configActionStatus === "seeding"}
          >
            {configActionStatus === "seeding" ? "Seeding…" : "Ensure onboarding defaults"}
          </ActionButton>
          {props.configSnap?.exists === false && (
            <ActionButton onClick={() => void createConfigFile()} disabled={configActionStatus === "creating"}>
              {configActionStatus === "creating" ? "Creating…" : "Create minimal config"}
            </ActionButton>
          )}
        </ButtonRow>
        <div className="UiSectionSubtitle" style={{ marginTop: 8 }}>
          Ensures missing onboarding defaults are present (currently: embedded gateway + workspace). It will not
          overwrite non-empty values.
        </div>
      </section>

      <section className="UiSettingsSection">
        <div className="UiSectionTitle">Google Workspace</div>
        <div className="UiSectionSubtitle">
          Connects your Google account locally to enable email and calendar skills. This opens a browser for consent.
          Secrets are stored locally and are not written into <code>openclaw.json</code>.
          <br />
          By default, the Desktop app auto-configures OAuth client credentials on startup.
        </div>
        {gogError && <InlineError>{gogError}</InlineError>}

        <div className="UiSettingsSubsection">
          <div className="UiSectionSubtitle" style={{ margin: 0 }}>
            1) Connect an account
          </div>
          <TextInput
            type="text"
            value={gogAccount}
            onChange={setGogAccount}
            placeholder="you@gmail.com"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
          <div className="UiSectionSubtitle" style={{ margin: 0 }}>
            Enabled services (comma-separated): <code>{gogServices}</code>.
          </div>
          <ButtonRow>
            <ActionButton
              variant="primary"
              disabled={gogBusy || !gogAccount.trim()}
              onClick={() =>
                void runGog(async () => {
                  const api = window.openclawDesktop;
                  if (!api) {
                    throw new Error("Desktop API not available");
                  }
                  return await api.gogAuthAdd({
                    account: gogAccount.trim(),
                    services: gogServices,
                  });
                }).then((res) => {
                  if (res.ok) {
                    return ensureGogExecDefaults();
                  }
                  return undefined;
                })
              }
            >
              {gogBusy ? "Connecting…" : "Connect"}
            </ActionButton>
          </ButtonRow>
        </div>

        <div className="UiSettingsSubsection">
          <div className="UiSectionSubtitle" style={{ margin: 0 }}>
            2) Verify
          </div>
          <ButtonRow>
            <ActionButton
              disabled={gogBusy}
              onClick={() =>
                void runGog(async () => {
                  const api = window.openclawDesktop;
                  if (!api) {
                    throw new Error("Desktop API not available");
                  }
                  return await api.gogAuthList();
                })
              }
            >
              {gogBusy ? "Checking…" : "Check"}
            </ActionButton>
          </ButtonRow>
        </div>

        {gogOutput && <pre>{gogOutput}</pre>}
      </section>
    </div>
  );
}

