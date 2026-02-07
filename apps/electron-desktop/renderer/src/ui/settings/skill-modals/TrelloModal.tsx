import React from "react";

import { ActionButton, InlineError, TextInput } from "../../kit";
import { useWelcomeTrello } from "../../onboarding/welcome/useWelcomeTrello";
import type { ConfigSnapshot, GatewayRpcLike } from "../../onboarding/welcome/types";

export function TrelloModalContent(props: {
  gw: GatewayRpcLike;
  loadConfig: () => Promise<ConfigSnapshot>;
  isConnected: boolean;
  onConnected: () => void;
  onDisabled: () => void;
}) {
  const [apiKey, setApiKey] = React.useState("");
  const [token, setToken] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<string | null>(null);

  const { saveTrello } = useWelcomeTrello({
    gw: props.gw,
    loadConfig: props.loadConfig,
    setError,
    setStatus,
  });

  const handleConnect = React.useCallback(async () => {
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const ok = await saveTrello(apiKey, token);
      if (ok) {
        props.onConnected();
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }, [apiKey, props, saveTrello, token]);

  return (
    <div className="UiSkillModalContent">
      <div className="UiSectionTitle">Trello</div>
      <div className="UiSectionSubtitle">
        Track tasks, update boards and manage projects without opening Trello.
      </div>
      {error && <InlineError>{error}</InlineError>}
      {status && <div className="UiSkillModalStatus">{status}</div>}
      {props.isConnected && !apiKey && !token && (
        <div className="UiSkillModalStatus">
          Credentials configured. Enter new values to update.
        </div>
      )}

      <div className="UiSkillModalField">
        <label className="UiSkillModalLabel">Trello API key</label>
        <TextInput
          type="password"
          value={apiKey}
          onChange={setApiKey}
          placeholder={props.isConnected ? "••••••••  (leave empty to keep current)" : "API key"}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
      </div>

      <div className="UiSkillModalField">
        <label className="UiSkillModalLabel">Trello token</label>
        <TextInput
          type="password"
          value={token}
          onChange={setToken}
          placeholder={props.isConnected ? "••••••••  (leave empty to keep current)" : "Token"}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
      </div>

      <div className="UiSkillModalActions">
        <ActionButton
          variant="primary"
          disabled={busy || (!apiKey.trim() && !token.trim() && !props.isConnected)}
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
