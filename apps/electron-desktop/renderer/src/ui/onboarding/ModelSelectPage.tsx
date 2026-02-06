import React from "react";

import { GlassCard, HeroPageLayout, InlineError, PrimaryButton } from "../kit";
import {
  type ModelEntry,
  TIER_INFO,
  formatModelMeta,
  getModelTier,
  sortModelsByProviderTierName,
} from "../models/modelPresentation";

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
        <GlassCard className="UiModelCard">
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
          <div className="UiSectionSubtitle">Fetching available models from your configured provider.</div>
        </GlassCard>
      </HeroPageLayout>
    );
  }

  if (props.error) {
    return (
      <HeroPageLayout variant="compact" align="center" aria-label="Model selection">
        <GlassCard className="UiModelCard">
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
          <InlineError>{props.error}</InlineError>
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
        <GlassCard className="UiModelCard">
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
            No models were found for your configured API key. The key may be invalid or the provider may be temporarily
            unavailable.
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
      <GlassCard className="UiModelCard">
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
        <div className="UiModelList">
          {filteredModels.map((model) => {
            const modelKey = `${model.provider}/${model.id}`;
            const tier = getModelTier(model);
            const meta = formatModelMeta(model);
            return (
              <label
                key={modelKey}
                className={`UiModelOption ${selected === modelKey ? "UiModelOption--selected" : ""}`}
              >
                <input
                  type="radio"
                  name="model"
                  value={modelKey}
                  checked={selected === modelKey}
                  onChange={() => setSelected(modelKey)}
                  className="UiModelRadio"
                />
                <div className="UiModelContent">
                  <div className="UiModelNameRow">
                    <span className="UiModelName">{model.name || model.id}</span>
                    {tier ? (
                      <span className={`UiModelTierBadge UiModelTierBadge--${tier}`}>{TIER_INFO[tier].label}</span>
                    ) : null}
                  </div>
                  {meta ? <div className="UiModelMeta">{meta}</div> : null}
                </div>
              </label>
            );
          })}
        </div>
        <div className="UiModelBottomRow">
          <button className="UiTextButton" onClick={props.onBack}>
            Back
          </button>
          <PrimaryButton disabled={!selected} onClick={() => selected && props.onSelect(selected)}>
            Continue
          </PrimaryButton>
        </div>
      </GlassCard>
    </HeroPageLayout>
  );
}
