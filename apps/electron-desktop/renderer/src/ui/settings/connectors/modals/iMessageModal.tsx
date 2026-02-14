import React from "react";

import sm from "../../skills/modals/SkillModal.module.css";
import { ActionButton, InlineError } from "../../../shared/kit";
import type { ConfigSnapshot, GatewayRpcLike } from "../../../onboarding/hooks/types";

export function IMessageModalContent(props: {
  gw: GatewayRpcLike;
  loadConfig: () => Promise<ConfigSnapshot>;
  isConnected: boolean;
  onConnected: () => void;
  onDisabled: () => void;
}) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<string | null>(null);

  const handleEnable = React.useCallback(async () => {
    setBusy(true);
    setError(null);
    setStatus("Enabling iMessage…");
    try {
      const snap = await props.loadConfig();
      const baseHash = typeof snap.hash === "string" && snap.hash.trim() ? snap.hash.trim() : null;
      if (!baseHash) {throw new Error("Config base hash missing. Reload and try again.");}

      await props.gw.request("config.patch", {
        baseHash,
        raw: JSON.stringify({
          channels: {
            imessage: {
              enabled: true,
            },
          },
        }),
        note: "Settings: enable iMessage",
      });
      setStatus("iMessage enabled.");
      props.onConnected();
    } catch (err) {
      setError(String(err));
      setStatus(null);
    } finally {
      setBusy(false);
    }
  }, [props]);

  return (
    <div className={sm.UiSkillModalContent}>
      <div className="UiSectionTitle">iMessage</div>
      <div className="UiSectionSubtitle">
        Connect iMessage on macOS. Requires the bundled imsg CLI and Full Disk Access permission for
        the Messages database.
      </div>
      {error && <InlineError>{error}</InlineError>}
      {status && <div className={sm.UiSkillModalStatus}>{status}</div>}

      {props.isConnected && <div className={sm.UiSkillModalStatus}>iMessage is connected.</div>}

      <div className={sm.UiSkillModalActions}>
        <ActionButton variant="primary" disabled={busy} onClick={() => void handleEnable()}>
          {busy ? "Enabling…" : props.isConnected ? "Re-enable" : "Enable iMessage"}
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
