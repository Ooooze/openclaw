import React, { useEffect } from "react";

import { GlassCard, HeroPageLayout, PrimaryButton } from "../kit";

import { MODEL_PROVIDERS, type ModelProvider, resolveProviderIconUrl } from "../models/providers";

export type Provider = ModelProvider;

export function ProviderSelectPage(props: {
  error: string | null;
  onSelect: (provider: Provider) => void;
  selectedProvider: Provider | null;
}) {
  const [selected, setSelected] = React.useState<Provider | null>(
    props.selectedProvider ? props.selectedProvider : null
  );
  const totalSteps = 5;
  const activeStep = 0;

  useEffect(() => {
    if (!selected) {
      setSelected(MODEL_PROVIDERS[0].id);
    }
  }, []);

  return (
    <HeroPageLayout variant="compact" align="center" aria-label="Provider selection">
      <GlassCard className="UiProviderCard UiGlassCardOnboarding">
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

        <div className="UiSectionTitle">Choose Al Provider</div>
        <div className="UiSectionSubtitle">
          Pick the Al provider you want to start with. You can switch or add more providers later.
        </div>

        <div className="UiProviderList UiListWithScroll">
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
          <div></div>
          <div>
            <PrimaryButton
              size={"sm"}
              disabled={!selected}
              onClick={() => selected && props.onSelect(selected)}
            >
              Continue
            </PrimaryButton>
          </div>
        </div>
      </GlassCard>
    </HeroPageLayout>
  );
}
