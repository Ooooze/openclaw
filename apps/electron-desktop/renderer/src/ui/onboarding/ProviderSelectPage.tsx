import React from "react";

import { GlassCard, HeroPageLayout, InlineError, PrimaryButton } from "../kit";

import { MODEL_PROVIDERS, type ModelProvider, resolveProviderIconUrl } from "../models/providers";

export type Provider = ModelProvider;

export function ProviderSelectPage(props: {
  error: string | null;
  onSelect: (provider: Provider) => void;
}) {
  const [selected, setSelected] = React.useState<Provider | null>(null);
  const totalSteps = 5;
  const activeStep = 0;

  return (
    <HeroPageLayout variant="compact" align="center" aria-label="Provider selection">
      <GlassCard className="UiProviderCard">
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
        <div className="UiSectionTitle">Select AI Provider</div>
        <div className="UiSectionSubtitle">
          Choose your preferred AI provider. You can configure additional providers later.
        </div>
        {props.error ? <InlineError>{props.error}</InlineError> : null}
        <div className="UiProviderList">
          {MODEL_PROVIDERS.map((provider) => (
            <label
              key={provider.id}
              className={`UiProviderOption ${selected === provider.id ? "UiProviderOption--selected" : ""}`}
            >
              <input
                type="radio"
                name="provider"
                value={provider.id}
                checked={selected === provider.id}
                onChange={() => setSelected(provider.id)}
                className="UiProviderRadio"
              />
              <span className="UiProviderIconWrap" aria-hidden="true">
                <img className="UiProviderIcon" src={resolveProviderIconUrl(provider.id)} alt="" />
              </span>
              <div className="UiProviderContent">
                <div className="UiProviderHeader">
                  <span className="UiProviderName">{provider.name}</span>
                  {provider.recommended && <span className="UiProviderBadge">Popular</span>}
                </div>
                <div className="UiProviderDescription">{provider.description}</div>
              </div>
            </label>
          ))}
        </div>
        <div className="UiProviderContinueRow">
          <PrimaryButton size={'sm'} disabled={!selected} onClick={() => selected && props.onSelect(selected)}>
            Continue
          </PrimaryButton>
        </div>
      </GlassCard>
    </HeroPageLayout>
  );
}
