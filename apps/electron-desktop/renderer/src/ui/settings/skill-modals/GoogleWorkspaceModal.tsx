import React from "react";

import { ActionButton, InlineError, TextInput } from "../../kit";

const DEFAULT_GOG_SERVICES = "gmail,calendar,drive,docs,sheets,contacts";

type GogExecResult = {
  ok: boolean;
  code: number | null;
  stdout: string;
  stderr: string;
};

export function GoogleWorkspaceModalContent(props: {
  isConnected: boolean;
  onConnected: () => void;
  onDisabled: () => void;
}) {
  const [account, setAccount] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [output, setOutput] = React.useState<string | null>(null);

  // Auto-check connected accounts on mount when already connected.
  React.useEffect(() => {
    if (!props.isConnected) return;
    const api = window.openclawDesktop;
    if (!api) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.gogAuthList();
        if (cancelled) return;
        if (res.ok && res.stdout?.trim()) {
          setOutput(`Connected accounts:\n${res.stdout.trim()}`);
        }
      } catch {
        // Best-effort.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [props.isConnected]);

  const runGog = React.useCallback(async (fn: () => Promise<GogExecResult>) => {
    setError(null);
    setBusy(true);
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
      setOutput(out || "(no output)");
      if (!res.ok) {
        setError(res.stderr?.trim() || "Google Workspace connection failed");
      }
      return res;
    } catch (err) {
      setError(String(err));
      setOutput(null);
      throw err;
    } finally {
      setBusy(false);
    }
  }, []);

  const handleConnect = React.useCallback(async () => {
    const api = window.openclawDesktop;
    if (!api) {
      setError("Desktop API not available");
      return;
    }
    try {
      const res = await runGog(() =>
        api.gogAuthAdd({ account: account.trim(), services: DEFAULT_GOG_SERVICES })
      );
      if (res.ok) {
        props.onConnected();
      }
    } catch {
      // Error already set by runGog.
    }
  }, [account, props, runGog]);

  const handleCheck = React.useCallback(async () => {
    const api = window.openclawDesktop;
    if (!api) {
      setError("Desktop API not available");
      return;
    }
    try {
      await runGog(() => api.gogAuthList());
    } catch {
      // Error already set by runGog.
    }
  }, [runGog]);

  return (
    <div className="UiSkillModalContent">
      <div className="UiSectionTitle">Google Workspace</div>
      <div className="UiSectionSubtitle">
        Connects your Google account locally to enable email and calendar skills. This opens a
        browser for consent. Secrets are stored locally.
      </div>
      {error && <InlineError>{error}</InlineError>}

      <div className="UiSkillModalField">
        <label className="UiSkillModalLabel">Google account email</label>
        <TextInput
          type="text"
          value={account}
          onChange={setAccount}
          placeholder="you@gmail.com"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
      </div>

      <div className="UiSkillModalActions">
        <ActionButton
          variant="primary"
          disabled={busy || !account.trim()}
          onClick={() => void handleConnect()}
        >
          {busy ? "Connecting…" : "Connect"}
        </ActionButton>
        <ActionButton disabled={busy} onClick={() => void handleCheck()}>
          {busy ? "Checking…" : "Check"}
        </ActionButton>
      </div>

      {output && <pre className="UiSkillModalOutput">{output}</pre>}

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
