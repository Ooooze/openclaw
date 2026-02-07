import React from "react";

import { GlassCard, HeroPageLayout, PrimaryButton, TextInput } from "../kit";
import type { Provider } from "./ProviderSelectPage";
import { MODEL_PROVIDER_BY_ID } from "../models/providers";

export function ApiKeyPage(props: {
  provider: Provider;
  status: string | null;
  error: string | null;
  busy: boolean;
  onSubmit: (apiKey: string) => void;
  onBack: () => void;
}) {
  const [apiKey, setApiKey] = React.useState("");
  const meta = MODEL_PROVIDER_BY_ID[props.provider];
  const totalSteps = 5;
  const activeStep = 1;

  const handleSubmit = () => {
    const trimmed = apiKey.trim();
    if (trimmed) {
      props.onSubmit(trimmed);
    }
  };

  return (
    <HeroPageLayout variant="compact" align="center" aria-label="API key setup">
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

        <div className="UiApiKeyTitle">Enter API Key</div>
        <div className="UiApiKeySubtitle">
          {meta.helpText}{" "}
          {meta.helpUrl ? (
            <a
              href={meta.helpUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="UiLink"
              onClick={(e) => {
                e.preventDefault();
                const url = meta.helpUrl;
                if (!url) {
                  return;
                }
                void window.openclawDesktop?.openExternal(url);
              }}
            >
              Get API key ↗
            </a>
          ) : null}
        </div>

        {props.status ? <div className="UiSectionSubtitle">{props.status}</div> : null}

        <div className="UiApiKeyInputRow">
          <TextInput
            type="password"
            value={apiKey}
            onChange={setApiKey}
            placeholder={meta.placeholder}
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
            {props.busy ? "Saving..." : "Continue"}
          </PrimaryButton>
        </div>
      </GlassCard>
    </HeroPageLayout>
  );
}
