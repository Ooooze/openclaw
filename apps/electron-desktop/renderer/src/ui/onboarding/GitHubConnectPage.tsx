import React from "react";

import { GlassCard, HeroPageLayout, PrimaryButton, TextInput } from "../kit";

export function GitHubConnectPage(props: {
  status: string | null;
  error: string | null;
  busy: boolean;
  onSubmit: (pat: string) => void;
  onBack: () => void;
}) {
  const [pat, setPat] = React.useState("");
  const totalSteps = 5;
  const activeStep = 3;

  const handleSubmit = () => {
    const trimmed = pat.trim();
    if (trimmed) {
      props.onSubmit(trimmed);
    }
  };

  return (
    <HeroPageLayout variant="compact" align="center" aria-label="GitHub setup">
      <GlassCard className="UiApiKeyCard UiGlassCardOnbording">
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

        <div className="UiApiKeyTitle">Connect GitHub</div>
        <div className="UiApiKeySubtitle">
          Paste a GitHub Personal Access Token (PAT). We'll store it in the app's gh config and
          verify access.
        </div>

        <div className="UiSectionSubtitle">
          Tips:
          <ol>
            <li>Prefer a fine-grained PAT if possible.</li>
            <li>
              Common scopes: <code>repo</code>, <code>read:org</code>, <code>workflow</code> (adjust
              to your needs).
            </li>
          </ol>
        </div>

        {props.status ? <div className="UiSectionSubtitle">{props.status}</div> : null}

        <div className="UiApiKeyInputRow">
          <TextInput
            type="password"
            value={pat}
            onChange={setPat}
            placeholder="ghp_..."
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
          <PrimaryButton size={'sm'} disabled={!pat.trim() || props.busy} onClick={handleSubmit}>
            {props.busy ? "Connecting..." : "Connect"}
          </PrimaryButton>
        </div>
      </GlassCard>
    </HeroPageLayout>
  );
}
