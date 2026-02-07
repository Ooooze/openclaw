import React from "react";

import { ActionButton, InlineError, TextInput } from "../../kit";
import {
  useWelcomeWebSearch,
  type WebSearchProvider,
} from "../../onboarding/welcome/useWelcomeWebSearch";
import type { ConfigSnapshot, GatewayRpcLike } from "../../onboarding/welcome/types";

function getObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

export function WebSearchModalContent(props: {
  gw: GatewayRpcLike;
  loadConfig: () => Promise<ConfigSnapshot>;
  isConnected: boolean;
  onConnected: () => void;
  onDisabled: () => void;
}) {
  const [provider, setProvider] = React.useState<WebSearchProvider>("brave");
  const [apiKey, setApiKey] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<string | null>(null);

  const { saveWebSearch } = useWelcomeWebSearch({
    gw: props.gw,
    loadConfig: props.loadConfig,
    setError,
    setStatus,
  });

  // Pre-fill provider from config when already connected.
  React.useEffect(() => {
    if (!props.isConnected) return;
    let cancelled = false;
    (async () => {
      try {
        const snap = await props.loadConfig();
        if (cancelled) return;
        const cfg = getObject(snap.config);
        const tools = getObject(cfg.tools);
        const web = getObject(tools.web);
        const search = getObject(web.search);
        const p = typeof search.provider === "string" ? search.provider.trim() : "";
        if (p === "perplexity" || p === "brave") {
          setProvider(p);
        }
      } catch {
        // Best-effort.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [props.isConnected, props.loadConfig]);

  const handleConnect = React.useCallback(async () => {
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const ok = await saveWebSearch(provider, apiKey);
      if (ok) {
        props.onConnected();
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }, [apiKey, props, provider, saveWebSearch]);

  return (
    <div className="UiSkillModalContent">
      <div className="UiSectionTitle">Web Search</div>
      <div className="UiSectionSubtitle">
        Enable the web_search tool via Brave Search or Perplexity Sonar.
      </div>
      {error && <InlineError>{error}</InlineError>}
      {status && <div className="UiSkillModalStatus">{status}</div>}
      {props.isConnected && !apiKey && (
        <div className="UiSkillModalStatus">API key configured. Enter a new key to update.</div>
      )}

      <div className="UiSkillModalField">
        <label className="UiSkillModalLabel">Provider</label>
        <div className="UiSkillModalProviderSelect">
          <button
            type="button"
            className={`UiSkillModalProviderOption${provider === "brave" ? " UiSkillModalProviderOption--active" : ""}`}
            onClick={() => setProvider("brave")}
          >
            Brave Search
          </button>
          <button
            type="button"
            className={`UiSkillModalProviderOption${provider === "perplexity" ? " UiSkillModalProviderOption--active" : ""}`}
            onClick={() => setProvider("perplexity")}
          >
            Perplexity Sonar
          </button>
        </div>
      </div>

      <div className="UiSkillModalField">
        <label className="UiSkillModalLabel">API key</label>
        <TextInput
          type="password"
          value={apiKey}
          onChange={setApiKey}
          placeholder={
            props.isConnected
              ? "••••••••  (leave empty to keep current)"
              : provider === "brave"
                ? "BSA..."
                : "pplx-..."
          }
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
      </div>

      <div className="UiSkillModalActions">
        <ActionButton
          variant="primary"
          disabled={busy || (!apiKey.trim() && !props.isConnected)}
          onClick={() => void handleConnect()}
        >
          {busy ? "Connecting…" : props.isConnected ? "Update" : "Connect"}
        </ActionButton>
      </div>

      {props.isConnected && (
        <div className="UiSkillModalDangerZone">
          <button
            type="button"
            className="UiSkillModalDisableButton"
            disabled={busy}
            onClick={props.onDisabled}
          >
            Disable
          </button>
        </div>
      )}
    </div>
  );
}
