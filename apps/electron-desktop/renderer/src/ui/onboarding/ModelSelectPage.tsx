import React from "react";

import { GlassCard, HeroPageLayout, PrimaryButton } from "../kit";
import {
  type ModelEntry,
  TIER_INFO,
  formatModelMeta,
  getModelTier,
  sortModelsByProviderTierName,
} from "../models/modelPresentation";
import { ModelProvider, resolveProviderIconUrl } from '../models/providers';

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

  if (props.loading) {
    return (
      <HeroPageLayout variant="compact" align="center" aria-label="Model selection">
        <GlassCard className="UiModelCard UiGlassCardOnbording">
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
        <GlassCard className="UiModelCard UiGlassCardOnbording">
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
        <GlassCard className="UiModelCard UiGlassCardOnbording">
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
      <GlassCard className="UiModelCard UiGlassCardOnbording">
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
        <div className="UiSectionTitle">Select AI Model</div>
        <div className="UiSectionSubtitle">Choose your preferred model. You can change this later in settings.</div>
        <div className="UiProviderList UiListWithScroll">
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
                <span className="UiProviderIconWrap" aria-hidden="true">
                <img className="UiProviderIcon" src={resolveProviderIconUrl(model.provider as ModelProvider)} alt="" />
              </span>
                <div className="UiProviderContent">
                  <div className="UiProviderHeader">
                    <span className="UiProviderName">{model.name || model.id}</span>
                    {tier ? (
                      <span className={`UiProviderBadge UiModelTierBadge--${tier}`}>{TIER_INFO[tier].label}</span>
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
          <PrimaryButton size={'sm'} disabled={!selected} onClick={() => selected && props.onSelect(selected)}>
            Continue
          </PrimaryButton>
        </div>
      </GlassCard>
    </HeroPageLayout>
  );
}
