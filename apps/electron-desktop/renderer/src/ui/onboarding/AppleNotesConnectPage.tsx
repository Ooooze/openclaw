import React from "react";

import { GlassCard, HeroPageLayout, PrimaryButton, SecondaryButton } from "../kit";

export function AppleNotesConnectPage(props: {
  status: string | null;
  error: string | null;
  busy: boolean;
  onCheckAndEnable: () => void;
  onBack: () => void;
}) {
  const totalSteps = 5;
  const activeStep = 3;

  return (
    <HeroPageLayout variant="compact" align="center" aria-label="Apple Notes setup">
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

        <div className="UiApiKeyTitle">Connect Apple Notes</div>
        <div className="UiApiKeySubtitle">
          Enable Apple Notes access via the bundled <code>memo</code> CLI.
        </div>

        <div className="UiSectionSubtitle">
          Notes:
          <ol>
            <li>macOS may prompt you to grant Automation access to Notes.app.</li>
            <li>If you deny access, Apple Notes actions will fail until you re-enable permissions.</li>
          </ol>
        </div>

        {props.status ? <div className="UiSectionSubtitle">{props.status}</div> : null}

        <div className="UiApiKeySpacer" aria-hidden="true" />

        <div className="UiApiKeyButtonRow">
          <button className="UiTextButton" disabled={props.busy} onClick={props.onBack} type="button">
            Back
          </button>
          <SecondaryButton disabled={props.busy} onClick={props.onCheckAndEnable}>
            {props.busy ? "Checking..." : "Check & enable"}
          </SecondaryButton>
          <PrimaryButton disabled={props.busy} onClick={props.onBack}>
            Done
          </PrimaryButton>
        </div>
      </GlassCard>
    </HeroPageLayout>
  );
}

