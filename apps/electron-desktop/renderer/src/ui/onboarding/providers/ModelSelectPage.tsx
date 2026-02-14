import React, { useEffect } from "react";

import { GlassCard, HeroPageLayout, PrimaryButton } from "../../shared/kit";
import ob from "./OnboardingProviders.module.css";
import {
  type ModelEntry,
  TIER_INFO,
  formatModelMeta,
  getModelTier,
  sortModelsByProviderTierName,
} from "../../shared/models/modelPresentation";
import { ModelProvider, resolveProviderIconUrl } from "../../shared/models/providers";

export function ModelSelectPage(props: {
  models: ModelEntry[];
  filterProvider?: string;
  loading: boolean;
  error: string | null;
  onSelect: (modelId: string) => void;
  onBack: () => void;
  onRetry: () => void;
}) {
  const [selected, setSelected] = React.useState<string | null>(null);
  const totalSteps = 5;
  const activeStep = 2;

  // Filter and sort models by provider and tier
  const filteredModels = React.useMemo(() => {
    let models = props.models;
    if (props.filterProvider) {
      models = models.filter((m) => m.provider === props.filterProvider);
    }
    return sortModelsByProviderTierName(models);
  }, [props.models, props.filterProvider]);

  useEffect(() => {
    if (filteredModels.length > 0) {
      const model = filteredModels[0];
      setSelected(`${model.provider}/${model.id}`);
    }
  }, [filteredModels]);

  if (props.loading) {
    return (
      <HeroPageLayout variant="compact" align="center" aria-label="Model selection">
        <GlassCard className="UiModelCard UiGlassCardOnboarding">
          <div className={ob.UiOnboardingDots} aria-label="Onboarding progress">
            {Array.from({ length: totalSteps }).map((_, idx) => (
              <span
                // eslint-disable-next-line react/no-array-index-key
                key={idx}
                className={`${ob.UiOnboardingDot} ${idx === activeStep ? ob["UiOnboardingDot--active"] : ""}`}
                aria-hidden="true"
              />
            ))}
          </div>
          <div className="UiSectionTitle">Select AI Model</div>
          <div className="UiSectionSubtitle">
            Fetching available models from your configured provider.
          </div>
        </GlassCard>
      </HeroPageLayout>
    );
  }

  if (props.error) {
    return (
      <HeroPageLayout variant="compact" align="center" aria-label="Model selection">
        <GlassCard className="UiModelCard UiGlassCardOnboarding">
          <div className={ob.UiOnboardingDots} aria-label="Onboarding progress">
            {Array.from({ length: totalSteps }).map((_, idx) => (
              <span
                // eslint-disable-next-line react/no-array-index-key
                key={idx}
                className={`${ob.UiOnboardingDot} ${idx === activeStep ? ob["UiOnboardingDot--active"] : ""}`}
                aria-hidden="true"
              />
            ))}
          </div>
          <div className="UiSectionTitle">Select AI Model</div>
          <div className="UiSectionSubtitle">Failed to load models.</div>
          <div className="UiModelBottomRow">
            <button className="UiTextButton" onClick={props.onBack}>
              Back
            </button>
            <PrimaryButton onClick={props.onRetry}>Retry</PrimaryButton>
          </div>
        </GlassCard>
      </HeroPageLayout>
    );
  }

  if (filteredModels.length === 0) {
    return (
      <HeroPageLayout variant="compact" align="center" aria-label="Model selection">
        <GlassCard className="UiModelCard UiGlassCardOnboarding">
          <div className={ob.UiOnboardingDots} aria-label="Onboarding progress">
            {Array.from({ length: totalSteps }).map((_, idx) => (
              <span
                // eslint-disable-next-line react/no-array-index-key
                key={idx}
                className={`${ob.UiOnboardingDot} ${idx === activeStep ? ob["UiOnboardingDot--active"] : ""}`}
                aria-hidden="true"
              />
            ))}
          </div>
          <div className="UiSectionTitle">Select AI Model</div>
          <div className="UiSectionSubtitle">
            No models were found for your configured API key. The key may be invalid or the provider
            may be temporarily unavailable.
          </div>
          <div className="UiModelBottomRow">
            <button className="UiTextButton" onClick={props.onBack}>
              Back
            </button>
            <PrimaryButton onClick={props.onRetry}>Retry</PrimaryButton>
          </div>
        </GlassCard>
      </HeroPageLayout>
    );
  }

  return (
    <HeroPageLayout variant="compact" align="center" aria-label="Model selection">
      <GlassCard className="UiModelCard UiGlassCardOnboarding">
        <div className={ob.UiOnboardingDots} aria-label="Onboarding progress">
          {Array.from({ length: totalSteps }).map((_, idx) => (
            <span
              // eslint-disable-next-line react/no-array-index-key
              key={idx}
              className={`${ob.UiOnboardingDot} ${idx === activeStep ? ob["UiOnboardingDot--active"] : ""}`}
              aria-hidden="true"
            />
          ))}
        </div>
        <div className="UiSectionTitle">Select AI Model</div>
        <div className="UiSectionSubtitle">
          Choose your preferred model. You can change this later in settings.
        </div>
        <div className="UiProviderList UiListWithScroll scrollable">
          {filteredModels.map((model) => {
            const modelKey = `${model.provider}/${model.id}`;
            const tier = getModelTier(model);
            const meta = formatModelMeta(model);
            return (
              <label
                key={modelKey}
                className={`UiProviderOption ${selected === modelKey ? "UiProviderOption--selected" : ""}`}
              >
                <input
                  type="radio"
                  name="model"
                  value={modelKey}
                  checked={selected === modelKey}
                  onChange={() => setSelected(modelKey)}
                  className="UiProviderRadio"
                />
                <div className="UiProviderContent">
                  <div className="UiProviderHeader">
                    <span className="UiProviderName">{model.name || model.id}</span>
                    {tier ? (
                      <span className={`UiProviderBadge UiModelTierBadge--${tier}`}>
                        {TIER_INFO[tier].label}
                      </span>
                    ) : null}
                  </div>
                  {meta ? <div className="UiProviderDescription">{meta}</div> : null}
                </div>
              </label>
            );
          })}
        </div>
        <div className="UiProviderContinueRow">
          <button className="UiTextButton" onClick={props.onBack}>
            Back
          </button>
          <PrimaryButton
            size={"sm"}
            disabled={!selected}
            onClick={() => selected && props.onSelect(selected)}
          >
            Continue
          </PrimaryButton>
        </div>
      </GlassCard>
    </HeroPageLayout>
  );
}
