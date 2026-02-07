import React from "react";

import { ActionButton, InlineError } from "../../kit";
import type { ConfigSnapshot, GatewayRpcLike } from "../../onboarding/welcome/types";

export function WhatsAppModalContent(props: {
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
    setStatus("Enabling WhatsApp…");
    try {
      const snap = await props.loadConfig();
      const baseHash = typeof snap.hash === "string" && snap.hash.trim() ? snap.hash.trim() : null;
      if (!baseHash) throw new Error("Config base hash missing. Reload and try again.");

      await props.gw.request("config.patch", {
        baseHash,
        raw: JSON.stringify({
          channels: {
            whatsapp: {
              enabled: true,
            },
          },
        }),
        note: "Settings: enable WhatsApp",
      });
      setStatus("WhatsApp enabled. Scan the QR code in the gateway to connect.");
      props.onConnected();
    } catch (err) {
      setError(String(err));
      setStatus(null);
    } finally {
      setBusy(false);
    }
  }, [props]);

  return (
    <div className="UiSkillModalContent">
      <div className="UiSectionTitle">WhatsApp</div>
      <div className="UiSectionSubtitle">
        Connect WhatsApp Web to OpenClaw. After enabling, scan the QR code shown by the gateway with
        your phone to complete the connection.
      </div>
      {error && <InlineError>{error}</InlineError>}
      {status && <div className="UiSkillModalStatus">{status}</div>}

      {props.isConnected && <div className="UiSkillModalStatus">WhatsApp is connected.</div>}

      <div className="UiSkillModalActions">
        <ActionButton variant="primary" disabled={busy} onClick={() => void handleEnable()}>
          {busy ? "Enabling…" : props.isConnected ? "Re-enable" : "Enable WhatsApp"}
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
