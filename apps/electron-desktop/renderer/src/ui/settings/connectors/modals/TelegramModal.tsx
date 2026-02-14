import React from "react";

import sm from "../../skills/modals/SkillModal.module.css";
import tg from "./TelegramModal.module.css";
import { ActionButton, InlineError, TextInput } from "../../../shared/kit";
import { getObject, getStringArray } from "../../../shared/utils/configHelpers";
import type { ConfigSnapshot, GatewayRpcLike } from "../../../onboarding/hooks/types";

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
  /** Called after the token is saved during first-time setup (marks connected without closing). */
  onTokenSaved?: () => void;
  onDisabled: () => void;
}) {
  const [botToken, setBotToken] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<string | null>(null);
  const [hasExistingToken, setHasExistingToken] = React.useState(false);

  // Two-step setup flow: "token" → "allowlist" (null = full form for editing).
  const [setupStep, setSetupStep] = React.useState<"token" | "allowlist" | null>(null);

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
        if (cancelled) {return;}
        const cfg = getObject(snap.config);
        const channels = getObject(cfg.channels);
        const telegram = getObject(channels.telegram);
        if (typeof telegram.botToken === "string" && telegram.botToken.trim()) {
          setHasExistingToken(true);
        } else {
          // No existing token: start the two-step setup flow.
          setSetupStep("token");
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
      if (!baseHash) {throw new Error("Config base hash missing. Reload and try again.");}
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
      if (token) {patch.botToken = token;}
      await patchTelegram(patch, "Settings: update Telegram bot token");
      setStatus("Bot token saved.");
      setBotToken("");
      setHasExistingToken(true);

      if (setupStep === "token") {
        // First-time setup: advance to allowlist step instead of closing.
        setSetupStep("allowlist");
        setError(null);
        setStatus(null);
        props.onTokenSaved?.();
      } else {
        // Editing existing token: close as before.
        props.onConnected();
      }
    } catch (err) {
      setError(String(err));
      setStatus(null);
    } finally {
      setBusy(false);
    }
  }, [botToken, patchTelegram, props, setupStep]);

  // ── Allowlist add ───────────────────────────────────────────

  const handleAddId = React.useCallback(async () => {
    const id = normalizeId(newId);
    if (!id) {return;}
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
    <div className={sm.UiSkillModalContent}>
      <div className="UiSectionSubtitle">
        {setupStep === "token" ? (
          <>
            <div>
              Get your bot token from Telegram.{" "}
              <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer">
                Get bot token ↗
              </a>
            </div>
            <div className="UiSectionSubtitleAccent mt-sm">
              How to get your Telegram bot token?
            </div>
            <ol>
              <li>
                Open Telegram and go to{" "}
                <span className="UiSectionSubtitleAccent">@BotFather</span>
              </li>
              <li>
                Start a chat and type <span className="UiSectionSubtitleAccent">/newbot</span>
              </li>
              <li>Follow the prompts to name your bot and choose a username</li>
              <li>
                BotFather will send you a message with your bot token. Copy the entire token (it
                looks like a long string of numbers and letters)
              </li>
              <li>Paste the token in the field below and click Connect</li>
            </ol>
          </>
        ) : setupStep === "allowlist" ? (
          <>
            <div>
              Bot connected! Now add your Telegram user ID to the allowlist.{" "}
              <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer">
                Open BotFather ↗
              </a>
            </div>
            <div className="UiSectionSubtitleAccent mt-sm">
              How to get your Telegram user ID?
            </div>
            <ol>
              <li>Open the bot you just created in Telegram</li>
              <li>Click the Start button</li>
              <li>Send a message to your bot</li>
              <li>Copy your Telegram user ID</li>
              <li>Paste it in the field below and click Add</li>
            </ol>
          </>
        ) : (
          <>
            Connect your Telegram bot. Get a token from{" "}
            <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer">
              @BotFather
            </a>
            .
          </>
        )}
      </div>
      {error && <InlineError>{error}</InlineError>}

      {/* ── Bot token (hidden during allowlist step of setup flow) ── */}
      {setupStep !== "allowlist" && (
        <div className={sm.UiSkillModalField}>
          <label className={sm.UiSkillModalLabel}>Bot token</label>
          {hasExistingToken && !botToken && (
            <div className={`${sm.UiSkillModalStatus} mb-xs`}>
              Token configured. Enter a new token to update.
            </div>
          )}
          <div className="flex-col-gap-sm">
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
      )}

      {/* ── Allowlist management (hidden during token step of setup flow) ── */}
      {setupStep !== "token" && (
        <div className={sm.UiSkillModalField}>
          <label className={sm.UiSkillModalLabel}>
            DM allowlist ({allowList.length} {allowList.length === 1 ? "entry" : "entries"})
          </label>

          {allowList.length > 0 && (
            <div className={tg.UiAllowlistEntries}>
              {allowList.map((id) => (
                <div key={id} className={tg.UiAllowlistEntry}>
                  <code className={tg.UiAllowlistId}>{id}</code>
                  <button
                    type="button"
                    className={tg.UiAllowlistRemove}
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

          <div className="flex-col-gap-sm">
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
      )}

      {/* ── Done button for setup flow allowlist step ──── */}
      {setupStep === "allowlist" && (
        <ActionButton
          variant="primary"
          disabled={busy}
          onClick={() => {
            const pending = normalizeId(newId);
            if (pending && !allowList.includes(pending)) {
              // Silently add the pending ID before closing.
              void (async () => {
                setBusy(true);
                try {
                  const merged = [...allowList, pending];
                  await patchTelegram(
                    { enabled: true, dmPolicy: "allowlist", allowFrom: merged },
                    "Settings: add Telegram allowFrom entry"
                  );
                  setAllowList(merged);
                  setNewId("");
                } catch {
                  // Best-effort: close anyway.
                } finally {
                  setBusy(false);
                  props.onConnected();
                }
              })();
            } else {
              props.onConnected();
            }
          }}
        >
          Done
        </ActionButton>
      )}

      {/* ── Disable ──────────────────────────────────────── */}
      {props.isConnected && !setupStep && (
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
