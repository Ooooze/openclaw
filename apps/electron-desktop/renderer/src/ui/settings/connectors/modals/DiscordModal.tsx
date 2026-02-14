import React from "react";

import sm from "../../skills/modals/SkillModal.module.css";
import { ActionButton, InlineError, TextInput } from "../../../shared/kit";
import { getObject } from "../../../shared/utils/configHelpers";
import type { ConfigSnapshot, GatewayRpcLike } from "../../../onboarding/hooks/types";

export function DiscordModalContent(props: {
  gw: GatewayRpcLike;
  loadConfig: () => Promise<ConfigSnapshot>;
  isConnected: boolean;
  onConnected: () => void;
  onDisabled: () => void;
}) {
  const [token, setToken] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<string | null>(null);
  const [hasExistingToken, setHasExistingToken] = React.useState(false);

  // Pre-fill: detect existing token.
  React.useEffect(() => {
    if (!props.isConnected) {return;}
    let cancelled = false;
    (async () => {
      try {
        const snap = await props.loadConfig();
        if (cancelled) {return;}
        const cfg = getObject(snap.config);
        const channels = getObject(cfg.channels);
        const discord = getObject(channels.discord);
        if (typeof discord.token === "string" && discord.token.trim()) {
          setHasExistingToken(true);
        }
      } catch {
        // Best-effort.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [props.isConnected, props.loadConfig]);

  const handleSave = React.useCallback(async () => {
    const t = token.trim();
    if (!t && !props.isConnected) {
      setError("Discord bot token is required.");
      return;
    }
    setBusy(true);
    setError(null);
    setStatus("Saving Discord configuration…");
    try {
      const snap = await props.loadConfig();
      const baseHash = typeof snap.hash === "string" && snap.hash.trim() ? snap.hash.trim() : null;
      if (!baseHash) {throw new Error("Config base hash missing. Reload and try again.");}

      const patch: Record<string, unknown> = { enabled: true };
      if (t) {patch.token = t;}

      await props.gw.request("config.patch", {
        baseHash,
        raw: JSON.stringify({ channels: { discord: patch } }, null, 2),
        note: "Settings: configure Discord",
      });
      setStatus("Discord configured.");
      props.onConnected();
    } catch (err) {
      setError(String(err));
      setStatus(null);
    } finally {
      setBusy(false);
    }
  }, [token, props]);

  return (
    <div className={sm.UiSkillModalContent}>
      <div className="UiSectionTitle">Discord</div>
      <div className="UiSectionSubtitle">
        Connect your Discord bot. Create one in the{" "}
        <a
          href="https://discord.com/developers/applications"
          target="_blank"
          rel="noopener noreferrer"
        >
          Discord Developer Portal
        </a>{" "}
        and copy the bot token.
      </div>
      {error && <InlineError>{error}</InlineError>}
      {status && <div className={sm.UiSkillModalStatus}>{status}</div>}
      {hasExistingToken && !token && (
        <div className={sm.UiSkillModalStatus}>Bot token configured. Enter a new token to update.</div>
      )}

      <div className={sm.UiSkillModalField}>
        <label className={sm.UiSkillModalLabel}>Bot token</label>
        <TextInput
          type="password"
          value={token}
          onChange={setToken}
          placeholder={hasExistingToken ? "••••••••  (leave empty to keep current)" : "Bot token"}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
      </div>

      <div className={sm.UiSkillModalActions}>
        <ActionButton
          variant="primary"
          disabled={busy || (!token.trim() && !props.isConnected)}
          onClick={() => void handleSave()}
        >
          {busy ? "Saving…" : props.isConnected ? "Update" : "Connect"}
        </ActionButton>
      </div>

      {props.isConnected && (
        <div className={sm.UiSkillModalDangerZone}>
          <button
            type="button"
            className={sm.UiSkillModalDisableButton}
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
