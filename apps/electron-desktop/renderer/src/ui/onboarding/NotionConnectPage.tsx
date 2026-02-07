import React from "react";

import { GlassCard, HeroPageLayout, PrimaryButton, TextInput } from "../kit";

export function NotionConnectPage(props: {
  status: string | null;
  error: string | null;
  busy: boolean;
  onSubmit: (apiKey: string) => void;
  onBack: () => void;
}) {
  const [apiKey, setApiKey] = React.useState("");
  const totalSteps = 5;
  const activeStep = 3;

  const handleSubmit = () => {
    const trimmed = apiKey.trim();
    if (trimmed) {
      props.onSubmit(trimmed);
    }
  };

  return (
    <HeroPageLayout variant="compact" align="center" aria-label="Notion setup">
      <GlassCard className="UiApiKeyCard">
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

        <div className="UiApiKeyTitle">Connect Notion</div>
        <div className="UiApiKeySubtitle">
          Create a Notion integration, copy its API key, then share the target pages/databases with
          the integration.{" "}
          <a
            href="https://notion.so/my-integrations"
            target="_blank"
            rel="noopener noreferrer"
            className="UiLink"
            onClick={(e) => {
              e.preventDefault();
              void window.openclawDesktop?.openExternal("https://notion.so/my-integrations");
            }}
          >
            Open integrations ↗
          </a>
        </div>

        <div className="UiSectionSubtitle">
          Steps:
          <ol>
            <li>Create an integration.</li>
            <li>
              Copy the API key (usually starts with <code>ntn_</code> or <code>secret_</code>).
            </li>
            <li>Share the pages/databases you want to use with the integration.</li>
          </ol>
        </div>

        {props.status ? <div className="UiSectionSubtitle">{props.status}</div> : null}

        <div className="UiApiKeyInputRow">
          <TextInput
            type="password"
            value={apiKey}
            onChange={setApiKey}
            placeholder="ntn_..."
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            disabled={props.busy}
          />
        </div>

        <div className="UiApiKeySpacer" aria-hidden="true" />

        <div className="UiApiKeyButtonRow">
          <button
            className="UiTextButton"
            disabled={props.busy}
            onClick={props.onBack}
            type="button"
          >
            Back
          </button>
          <PrimaryButton disabled={!apiKey.trim() || props.busy} onClick={handleSubmit}>
            {props.busy ? "Saving..." : "Save & return"}
          </PrimaryButton>
        </div>
      </GlassCard>
    </HeroPageLayout>
  );
}
