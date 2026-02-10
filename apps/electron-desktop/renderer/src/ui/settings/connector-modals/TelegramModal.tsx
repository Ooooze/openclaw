import React from "react";

import { ActionButton, InlineError, TextInput } from "../../kit";
import type { ConfigSnapshot, GatewayRpcLike } from "../../onboarding/welcome/types";

function getObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function getStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

/** Normalize a user-typed Telegram ID (strip tg:/telegram: prefix). */
function normalizeId(raw: string): string {
  const stripped = raw
    .trim()
    .replace(/^(telegram|tg):/i, "")
    .trim();
  return /^\d+$/.test(stripped) ? stripped : raw.trim();
}

export function TelegramModalContent(props: {
  gw: GatewayRpcLike;
  loadConfig: () => Promise<ConfigSnapshot>;
  isConnected: boolean;
  onConnected: () => void;
  onDisabled: () => void;
}) {
  const [botToken, setBotToken] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<string | null>(null);
  const [hasExistingToken, setHasExistingToken] = React.useState(false);

  // Allowlist state.
  const [allowList, setAllowList] = React.useState<string[]>([]);
  const [newId, setNewId] = React.useState("");
  const [dmPolicy, setDmPolicy] = React.useState<string>("pairing");

  // Load existing config on mount.
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snap = await props.loadConfig();
        if (cancelled) return;
        const cfg = getObject(snap.config);
        const channels = getObject(cfg.channels);
        const telegram = getObject(channels.telegram);
        if (typeof telegram.botToken === "string" && telegram.botToken.trim()) {
          setHasExistingToken(true);
        }
        setAllowList(getStringArray(telegram.allowFrom));
        if (typeof telegram.dmPolicy === "string" && telegram.dmPolicy.trim()) {
          setDmPolicy(telegram.dmPolicy.trim());
        }
      } catch {
        // Best-effort.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [props.loadConfig]);

  /** Persist a config.patch for the Telegram channel. */
  const patchTelegram = React.useCallback(
    async (patch: Record<string, unknown>, note: string) => {
      const snap = await props.loadConfig();
      const baseHash = typeof snap.hash === "string" && snap.hash.trim() ? snap.hash.trim() : null;
      if (!baseHash) throw new Error("Config base hash missing. Reload and try again.");
      await props.gw.request("config.patch", {
        baseHash,
        raw: JSON.stringify(
          {
            channels: { telegram: patch },
            plugins: { entries: { telegram: { enabled: true } } },
          },
          null,
          2
        ),
        note,
      });
    },
    [props.gw, props.loadConfig]
  );

  // ── Bot token save ──────────────────────────────────────────

  const handleSaveToken = React.useCallback(async () => {
    const token = botToken.trim();
    if (!token && !props.isConnected) {
      setError("Bot token is required.");
      return;
    }
    setBusy(true);
    setError(null);
    setStatus("Saving Telegram bot token…");
    try {
      const patch: Record<string, unknown> = { enabled: true };
      if (token) patch.botToken = token;
      await patchTelegram(patch, "Settings: update Telegram bot token");
      setStatus("Bot token saved.");
      setBotToken("");
      setHasExistingToken(true);
      props.onConnected();
    } catch (err) {
      setError(String(err));
      setStatus(null);
    } finally {
      setBusy(false);
    }
  }, [botToken, patchTelegram, props]);

  // ── Allowlist add ───────────────────────────────────────────

  const handleAddId = React.useCallback(async () => {
    const id = normalizeId(newId);
    if (!id) return;
    if (allowList.includes(id)) {
      setError(`"${id}" is already in the allowlist.`);
      return;
    }
    setBusy(true);
    setError(null);
    setStatus("Adding to allowlist…");
    try {
      const merged = [...allowList, id];
      await patchTelegram(
        { enabled: true, dmPolicy: "allowlist", allowFrom: merged },
        "Settings: add Telegram allowFrom entry"
      );
      setAllowList(merged);
      setDmPolicy("allowlist");
      setNewId("");
      setStatus(`Added ${id}.`);
    } catch (err) {
      setError(String(err));
      setStatus(null);
    } finally {
      setBusy(false);
    }
  }, [allowList, newId, patchTelegram]);

  // ── Allowlist remove ────────────────────────────────────────

  const handleRemoveId = React.useCallback(
    async (id: string) => {
      setBusy(true);
      setError(null);
      setStatus(`Removing ${id}…`);
      try {
        const filtered = allowList.filter((v) => v !== id);
        await patchTelegram({ allowFrom: filtered }, "Settings: remove Telegram allowFrom entry");
        setAllowList(filtered);
        setStatus(`Removed ${id}.`);
      } catch (err) {
        setError(String(err));
        setStatus(null);
      } finally {
        setBusy(false);
      }
    },
    [allowList, patchTelegram]
  );

  // ── DM policy change ───────────────────────────────────────

  const handlePolicyChange = React.useCallback(
    async (policy: string) => {
      setDmPolicy(policy);
      setBusy(true);
      setError(null);
      setStatus("Updating DM policy…");
      try {
        await patchTelegram({ dmPolicy: policy }, "Settings: update Telegram DM policy");
        setStatus(`DM policy set to "${policy}".`);
      } catch (err) {
        setError(String(err));
        setStatus(null);
      } finally {
        setBusy(false);
      }
    },
    [patchTelegram]
  );

  return (
    <div className="UiSkillModalContent">
      <div className="UiSectionSubtitle">
        Connect your Telegram bot. Get a token from{" "}
        <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer">
          @BotFather
        </a>
        .
      </div>
      {error && <InlineError>{error}</InlineError>}
      {/*{status && <div className="UiSkillModalStatus">{status}</div>}*/}

      {/* ── Bot token ──────────────────────────────────────── */}
      <div className="UiSkillModalField">
        <label className="UiSkillModalLabel">Bot token</label>
        {hasExistingToken && !botToken && (
          <div className="UiSkillModalStatus" style={{ marginBottom: 4 }}>
            Token configured. Enter a new token to update.
          </div>
        )}
        <div style={{ display: "flex", gap: 8, flexDirection: "column" }}>
          <div>
            <TextInput
              type="password"
              value={botToken}
              onChange={setBotToken}
              placeholder={
                hasExistingToken ? "••••••••  (leave empty to keep)" : "123456:ABCDEF..."
              }
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>
          <ActionButton
            variant="primary"
            disabled={busy || (!botToken.trim() && !props.isConnected)}
            onClick={() => void handleSaveToken()}
          >
            {busy ? "…" : props.isConnected ? "Update" : "Connect"}
          </ActionButton>
        </div>
      </div>

      {/*/!* ── DM policy ─────────────────────────────────────── *!/*/}
      {/*<div className="UiSkillModalField">*/}
      {/*  <label className="UiSkillModalLabel">DM policy</label>*/}
      {/*  <div className="UiSkillModalProviderSelect">*/}
      {/*    {["pairing", "allowlist", "open"].map((p) => (*/}
      {/*      <button*/}
      {/*        key={p}*/}
      {/*        type="button"*/}
      {/*        className={`UiSkillModalProviderOption${dmPolicy === p ? " UiSkillModalProviderOption--active" : ""}`}*/}
      {/*        disabled={busy}*/}
      {/*        onClick={() => void handlePolicyChange(p)}*/}
      {/*      >*/}
      {/*        {p}*/}
      {/*      </button>*/}
      {/*    ))}*/}
      {/*  </div>*/}
      {/*</div>*/}

      {/* ── Allowlist management ──────────────────────────── */}
      <div className="UiSkillModalField">
        <label className="UiSkillModalLabel">
          DM allowlist ({allowList.length} {allowList.length === 1 ? "entry" : "entries"})
        </label>

        {allowList.length > 0 && (
          <div className="UiAllowlistEntries">
            {allowList.map((id) => (
              <div key={id} className="UiAllowlistEntry">
                <code className="UiAllowlistId">{id}</code>
                <button
                  type="button"
                  className="UiAllowlistRemove"
                  disabled={busy}
                  title={`Remove ${id}`}
                  onClick={() => void handleRemoveId(id)}
                  aria-label={`Remove ${id}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, flexDirection: "column" }}>
          <div>
            <TextInput
              type="text"
              value={newId}
              onChange={setNewId}
              placeholder="Telegram user ID (e.g. 123456789)"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>
          <ActionButton disabled={busy || !newId.trim()} onClick={() => void handleAddId()}>
            Add
          </ActionButton>
        </div>
      </div>

      {/* ── Disable ──────────────────────────────────────── */}
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
