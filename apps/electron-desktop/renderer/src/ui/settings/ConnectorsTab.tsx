import React from "react";

import { ActionButton, ButtonRow, TextInput } from "../kit";

type GatewayRpc = {
  request: <T = unknown>(method: string, params?: unknown) => Promise<T>;
};

type ConfigSnapshotLike = {
  hash?: string;
  config?: unknown;
};

function getTelegramBotToken(cfg: unknown): string {
  if (!cfg || typeof cfg !== "object" || Array.isArray(cfg)) {
    return "";
  }
  const obj = cfg as {
    channels?: { telegram?: { botToken?: unknown } };
  };
  const token = obj.channels?.telegram?.botToken;
  return typeof token === "string" ? token : "";
}

export function ConnectorsTab(props: {
  gw: GatewayRpc;
  configSnap: ConfigSnapshotLike | null;
  reload: () => Promise<void>;
  onError: (value: string | null) => void;
}) {
  const [telegramToken, setTelegramToken] = React.useState("");
  const [resetBusy, setResetBusy] = React.useState(false);

  React.useEffect(() => {
    setTelegramToken(getTelegramBotToken(props.configSnap?.config));
  }, [props.configSnap?.config]);

  const pasteTelegramFromClipboard = React.useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) {
        return;
      }
      setTelegramToken(text.trim());
    } catch (err) {
      props.onError(`Clipboard paste failed: ${String(err)}`);
    }
  }, [props]);

  const saveTelegram = React.useCallback(async () => {
    props.onError(null);
    try {
      const baseHash =
        typeof props.configSnap?.hash === "string" && props.configSnap.hash.trim() ? props.configSnap.hash.trim() : null;
      if (!baseHash) {
        throw new Error("Missing config base hash. Click Reload and try again.");
      }
      await props.gw.request("config.patch", {
        baseHash,
        raw: JSON.stringify({
          channels: {
            telegram: {
              botToken: telegramToken.trim(),
            },
          },
        }),
        note: "Settings: update Telegram bot token",
      });
      await props.reload();
    } catch (err) {
      props.onError(String(err));
    }
  }, [props, telegramToken]);

  const resetAndClose = React.useCallback(async () => {
    const api = window.openclawDesktop;
    if (!api) {
      props.onError("Desktop API not available");
      return;
    }
    const ok = window.confirm(
      "Reset and close will delete the app's local state (including onboarding + logs) and remove all Google Workspace authorizations from the keystore. Continue?",
    );
    if (!ok) {
      return;
    }
    props.onError(null);
    setResetBusy(true);
    try {
      await api.resetAndClose();
    } catch (err) {
      // If reset fails, keep the app running and show the error.
      props.onError(String(err));
      setResetBusy(false);
    }
  }, [props]);

  return (
    <div className="UiSettingsContentInner">
      <div className="UiSettingsTabTitle">Connectors</div>

      <section className="UiSettingsSection">
        <div className="UiSectionTitle">Telegram</div>
        <div className="UiSectionSubtitle">
          Stored in <code>openclaw.json</code> as <code>channels.telegram.botToken</code>.
        </div>
        <div className="UiInputRow">
          <TextInput
            type="password"
            value={telegramToken}
            onChange={setTelegramToken}
            placeholder="123456:ABCDEF"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
          <ActionButton onClick={() => void pasteTelegramFromClipboard()}>Paste</ActionButton>
          <ActionButton variant="primary" onClick={() => void saveTelegram()}>
            Save
          </ActionButton>
        </div>
      </section>

      <section className="UiSettingsSection UiSettingsSection--danger">
        <div className="UiSectionTitle">Danger zone</div>
        <div className="UiSectionSubtitle">
          This will wipe the app's local state and remove all Google Workspace authorizations. The app will then close.
        </div>
        <ButtonRow>
          <ActionButton variant="primary" disabled={resetBusy} onClick={() => void resetAndClose()}>
            {resetBusy ? "Resetting…" : "Reset and close"}
          </ActionButton>
        </ButtonRow>
      </section>
    </div>
  );
}

