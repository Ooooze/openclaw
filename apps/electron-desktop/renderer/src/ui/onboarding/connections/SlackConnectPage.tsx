import React from "react";

import gw from "./GoogleWorkspace.module.css";
import { getDesktopApiOrNull } from "../../../ipc/desktopApi";
import { GlassCard, HeroPageLayout, InlineError, PrimaryButton, TextInput } from "../../shared/kit";

type GroupPolicy = "open" | "allowlist" | "disabled";
type DmPolicy = "pairing" | "allowlist" | "open" | "disabled";

function buildSlackManifest(botName: string) {
  const safeName = botName.trim() || "OpenClaw";
  const manifest = {
    display_information: {
      name: safeName,
      description: `${safeName} connector for OpenClaw`,
    },
    features: {
      bot_user: {
        display_name: safeName,
        always_online: false,
      },
      app_home: {
        messages_tab_enabled: true,
        messages_tab_read_only_enabled: false,
      },
      slash_commands: [
        {
          command: "/openclaw",
          description: "Send a message to OpenClaw",
          should_escape: false,
        },
      ],
    },
    oauth_config: {
      scopes: {
        bot: [
          "chat:write",
          "channels:history",
          "channels:read",
          "groups:history",
          "im:history",
          "mpim:history",
          "users:read",
          "app_mentions:read",
          "reactions:read",
          "reactions:write",
          "pins:read",
          "pins:write",
          "emoji:read",
          "commands",
          "files:read",
          "files:write",
        ],
      },
    },
    settings: {
      socket_mode_enabled: true,
      event_subscriptions: {
        bot_events: [
          "app_mention",
          "message.channels",
          "message.groups",
          "message.im",
          "message.mpim",
          "reaction_added",
          "reaction_removed",
          "member_joined_channel",
          "member_left_channel",
          "channel_rename",
          "pin_added",
          "pin_removed",
        ],
      },
    },
  };
  return JSON.stringify(manifest, null, 2);
}

function parseList(raw: string): string[] {
  const parts = raw
    .split(/[\n,;]+/g)
    .map((v) => v.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const next: string[] = [];
  for (const entry of parts) {
    const key = entry.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    next.push(entry);
  }
  return next;
}

export function SlackConnectPage(props: {
  status: string | null;
  error: string | null;
  busy: boolean;
  onSubmit: (settings: {
    botName: string;
    botToken: string;
    appToken: string;
    groupPolicy: GroupPolicy;
    channelAllowlist: string[];
    dmPolicy: DmPolicy;
    dmAllowFrom: string[];
  }) => void;
  onBack: () => void;
}) {
  const totalSteps = 5;
  const activeStep = 3;

  const [botName, setBotName] = React.useState("OpenClaw");
  const [botToken, setBotToken] = React.useState("");
  const [appToken, setAppToken] = React.useState("");
  const [groupPolicy, setGroupPolicy] = React.useState<GroupPolicy>("allowlist");
  const [channelsRaw, setChannelsRaw] = React.useState("#general");
  const [dmPolicy, setDmPolicy] = React.useState<DmPolicy>("pairing");
  const [dmAllowFromRaw, setDmAllowFromRaw] = React.useState("");

  const [errors, setErrors] = React.useState<{
    botToken?: string;
    appToken?: string;
    dmAllowFrom?: string;
  }>({});

  const manifest = React.useMemo(() => buildSlackManifest(botName), [botName]);

  const canSubmit = React.useMemo(() => {
    if (dmPolicy === "allowlist" && parseList(dmAllowFromRaw).length === 0) {
      return false;
    }
    return true;
  }, [appToken, botToken, dmAllowFromRaw, dmPolicy]);

  const handleSubmit = () => {
    const trimmedBotToken = botToken.trim();
    const trimmedAppToken = appToken.trim();

    const nextErrors: typeof errors = {};

    if (!trimmedBotToken) {
      nextErrors.botToken = "Please enter your Slack bot token (xoxb-...)";
    }

    if (!trimmedAppToken) {
      nextErrors.appToken = "Please enter your Slack app token (xapp-...)";
    }

    if (dmPolicy === "allowlist" && parseList(dmAllowFromRaw).length === 0) {
      nextErrors.dmAllowFrom = "At least one allowFrom entry is required for DM allowlist.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    props.onSubmit({
      botName: botName.trim() || "OpenClaw",
      botToken: trimmedBotToken,
      appToken: trimmedAppToken,
      groupPolicy,
      channelAllowlist: groupPolicy === "allowlist" ? parseList(channelsRaw) : [],
      dmPolicy,
      dmAllowFrom: dmPolicy === "allowlist" || dmPolicy === "open" ? parseList(dmAllowFromRaw) : [],
    });
  };

  return (
    <HeroPageLayout variant="compact" align="center" aria-label="Slack setup">
      <GlassCard className="UiApiKeyCard UiGlassCardOnboarding">
        <div className="UiOnboardingDots" aria-label="Onboarding progress">
          {Array.from({ length: totalSteps }).map((_, idx) => (
            <span
              // eslint-disable-next-line react/no-array-index-key
              key={idx}
              className={`UiOnboardingDot ${idx === activeStep ? "UiOnboardingDot--active" : ""}`}
              aria-hidden="true"
            />
          ))}
        </div>

        <div className="UiApiKeyTitle">Connect Slack</div>

        <div className="UiContentWrapper scrollable">
          <div className="UiApiKeySubtitle">
            Configure Slack Socket Mode tokens and access policies. We'll store settings under{" "}
            channels.slack.
          </div>

          <div className="UiSectionSubtitle">
            Steps:
            <ol>
              <li>Slack API → Create App (From scratch).</li>
              <li>Enable Socket Mode and create an app token (starts with xapp-).</li>
              <li>Install the app to your workspace to get a bot token (starts with xoxb-).</li>
              <li>Invite the bot to channels you want it to read.</li>
            </ol>
            Docs:{" "}
            <a
              href="https://docs.openclaw.ai/slack"
              target="_blank"
              rel="noopener noreferrer"
              className="UiLink"
              onClick={(e) => {
                e.preventDefault();
                void getDesktopApiOrNull()?.openExternal("https://docs.openclaw.ai/slack");
              }}
            >
              Slack setup ↗
            </a>
          </div>

          <details className={gw.details} style={{ marginTop: 14, marginBottom: 14 }}>
            <summary className={gw.detailsSummary}>Where to find the tokens</summary>
            <div className="UiSectionSubtitle" style={{ marginTop: 10 }}>
              <ol>
                <li>
                  <div>
                    Create a Slack app: Slack API → <strong>Apps</strong> →{" "}
                    <strong>Create New App</strong> → <strong>From scratch</strong>.
                  </div>
                </li>
                <li>
                  <div>
                    Enable Socket Mode: <strong>Socket Mode</strong> → toggle on.
                  </div>
                </li>
                <li>
                  <div>
                    Create the app token (xapp-...): <strong>Basic Information</strong> →{" "}
                    <strong>App-Level Tokens</strong> → <strong>Generate Token and Scopes</strong> →
                    scope connections:write.
                  </div>
                </li>
                <li>
                  <div>
                    Create the bot token (xoxb-...): <strong>OAuth &amp; Permissions</strong> → add
                    bot scopes (use the Manifest below) → <strong>Install to Workspace</strong> →
                    copy <strong>Bot User OAuth Token</strong>.
                  </div>
                </li>
                <li>
                  Invite the bot to channels you want it to read (for example, in Slack: /invite
                  @YourBot).
                </li>
              </ol>
              Notes:
              <ul>
                <li>
                  <div>
                    The <strong>Client Secret</strong> and <strong>Signing Secret</strong> shown in
                    Slack <strong>Basic Information</strong> are <em>not</em> the tokens used for
                    Socket Mode in OpenClaw.
                  </div>
                </li>
                <li>
                  If you previously pasted secrets anywhere public, rotate them in Slack
                  (Regenerate) and use new tokens.
                </li>
              </ul>
            </div>
          </details>

          {/*{props.status ? <div className="UiSectionSubtitle">{props.status}</div> : null}*/}

          <div className="UiApiKeyInputRow">
            <TextInput
              value={botName}
              onChange={setBotName}
              placeholder="OpenClaw"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              disabled={props.busy}
              isError={errors.dmAllowFrom}
              label={"Bot display name (manifest)"}
            />
          </div>

          <div className="UiApiKeyInputRow" style={{ marginTop: 12 }}>
            <TextInput
              type="password"
              value={botToken}
              onChange={setBotToken}
              placeholder="xoxb-..."
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              disabled={props.busy}
              error={!props.busy && !botToken.trim()}
              isError={errors.botToken}
              label={"Bot token xoxb-…"}
            />
          </div>

          <div className="UiApiKeyInputRow" style={{ marginTop: 12 }}>
            <TextInput
              type="password"
              value={appToken}
              onChange={setAppToken}
              placeholder="xapp-..."
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              disabled={props.busy}
              error={!props.busy && !appToken.trim()}
              isError={errors.appToken}
              label={"App token xapp-…"}
            />
          </div>

          <div className="UiApiKeyInputRow" style={{ marginTop: 12 }}>
            <div className="UiSectionSubtitle" style={{ marginBottom: 8 }}>
              Channel access policy
            </div>
            <select
              className="UiInput"
              disabled={props.busy}
              value={groupPolicy}
              onChange={(e) => setGroupPolicy(e.target.value as GroupPolicy)}
            >
              <option value="allowlist">Allowlist (recommended)</option>
              <option value="open">Open</option>
              <option value="disabled">Disabled</option>
            </select>
            {groupPolicy === "allowlist" ? (
              <div style={{ marginTop: 10 }}>
                <div className="UiSectionSubtitle" style={{ marginBottom: 8 }}>
                  Allowed channels (names or ids)
                </div>
                <textarea
                  className="UiInput"
                  rows={3}
                  disabled={props.busy}
                  value={channelsRaw}
                  onChange={(e) => setChannelsRaw(e.target.value)}
                  placeholder="#general, C123"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
                <div className="UiSectionSubtitle" style={{ marginTop: 8 }}>
                  Tip: unresolved channel names are kept as typed and resolved later when possible.
                </div>
              </div>
            ) : null}
          </div>

          <div className="UiApiKeyInputRow" style={{ marginTop: 12 }}>
            <div className="UiSectionSubtitle" style={{ marginBottom: 8 }}>
              DM policy
            </div>
            <select
              className="UiInput"
              disabled={props.busy}
              value={dmPolicy}
              onChange={(e) => setDmPolicy(e.target.value as DmPolicy)}
            >
              <option value="pairing">Pairing (recommended)</option>
              <option value="allowlist">Allowlist</option>
              <option value="open">Open</option>
              <option value="disabled">Disabled</option>
            </select>
            {dmPolicy === "allowlist" || dmPolicy === "open" ? (
              <div style={{ marginTop: 10 }}>
                <div className="UiSectionSubtitle" style={{ marginBottom: 8 }}>
                  DM allowFrom (user ids or @handles)
                </div>
                <textarea
                  className="UiInput"
                  rows={3}
                  disabled={props.busy}
                  value={dmAllowFromRaw}
                  onChange={(e) => setDmAllowFromRaw(e.target.value)}
                  placeholder="@alice, U12345678"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
                {dmPolicy === "allowlist" && parseList(dmAllowFromRaw).length === 0 ? (
                  <InlineError>
                    At least one allowFrom entry is required for DM allowlist.
                  </InlineError>
                ) : null}
                {dmPolicy === "open" ? (
                  <div className="UiSectionSubtitle" style={{ marginTop: 8 }}>
                    If left empty, we'll allow everyone by using <code>*</code>.
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="UiSectionSubtitle" style={{ marginTop: 12 }}>
            <div style={{ marginBottom: 6 }}>Manifest (JSON)</div>
            <pre style={{ maxHeight: 240 }}>{manifest}</pre>
          </div>

          <div className="UiApiKeySpacer" aria-hidden="true" />
        </div>

        <div className="UiApiKeyButtonRow">
          <button
            className="UiTextButton"
            disabled={props.busy}
            onClick={props.onBack}
            type="button"
          >
            Back
          </button>
          <PrimaryButton size={"sm"} disabled={!canSubmit} onClick={handleSubmit}>
            Connect
          </PrimaryButton>
        </div>
      </GlassCard>
    </HeroPageLayout>
  );
}
