import React from "react";

import { ActionButton, ButtonRow, GlassCard, HeroPageLayout, InlineError } from "../kit";

export type ModelEntry = {
  id: string;
  name: string;
  provider: string;
  contextWindow?: number;
  reasoning?: boolean;
};

type ModelTier = "ultra" | "pro" | "fast";

// Exact model IDs for each tier - only these specific models get badges
const MODEL_TIERS: Record<string, Record<ModelTier, string>> = {
  anthropic: {
    ultra: "claude-opus-4-5",
    pro: "claude-sonnet-4-5",
    fast: "claude-haiku-4-5",
  },
  google: {
    ultra: "gemini-2.5-pro",
    pro: "gemini-2.5-flash",
    fast: "gemini-2.0-flash-lite",
  },
  openai: {
    ultra: "gpt-5.2-pro",
    pro: "gpt-5.2",
    fast: "gpt-5-mini",
  },
  openrouter: {
    ultra: "auto",
    pro: "",
    fast: "",
  },
};

const TIER_INFO: Record<ModelTier, { label: string; description: string }> = {
  ultra: { label: "Ultra", description: "Most capable. Best for complex reasoning, analysis, and creative tasks. Highest cost." },
  pro: { label: "Pro", description: "Balanced. Great for coding, writing, and everyday tasks. Moderate cost." },
  fast: { label: "Fast", description: "Quickest responses. Ideal for simple tasks and high-volume use. Lowest cost." },
};

const TIER_ORDER: ModelTier[] = ["ultra", "pro", "fast"];
const TIER_PRIORITY: Record<ModelTier, number> = { ultra: 0, pro: 1, fast: 2 };

function getModelTier(provider: string, modelId: string): ModelTier | null {
  const providerTiers = MODEL_TIERS[provider];
  if (!providerTiers) return null;

  for (const tier of TIER_ORDER) {
    const exactId = providerTiers[tier];
    if (exactId && modelId === exactId) {
      return tier;
    }
  }
  return null;
}

function formatContextWindow(ctx: number | undefined): string {
  if (!ctx) return "";
  if (ctx >= 1_000_000) return `${(ctx / 1_000_000).toFixed(1)}M`;
  if (ctx >= 1_000) return `${Math.round(ctx / 1_000)}K`;
  return String(ctx);
}

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

  // Filter and sort models by provider and tier
  const filteredModels = React.useMemo(() => {
    let models = props.models;
    if (props.filterProvider) {
      models = models.filter((m) => m.provider === props.filterProvider);
    }

    // Sort: tiered models first (ultra → pro → fast), then the rest alphabetically
    return models.toSorted((a, b) => {
      const tierA = getModelTier(a.provider, a.id);
      const tierB = getModelTier(b.provider, b.id);

      // Both have tiers - sort by tier priority
      if (tierA && tierB) {
        return TIER_PRIORITY[tierA] - TIER_PRIORITY[tierB];
      }
      // Only A has tier - A comes first
      if (tierA) return -1;
      // Only B has tier - B comes first
      if (tierB) return 1;
      // Neither has tier - sort alphabetically by name
      return (a.name || a.id).localeCompare(b.name || b.id);
    });
  }, [props.models, props.filterProvider]);

  if (props.loading) {
    return (
      <HeroPageLayout title="SELECT MODEL" variant="compact" align="center" aria-label="Model selection">
        <GlassCard>
          <div className="UiSectionTitle">Loading models...</div>
          <div className="UiSectionSubtitle">Fetching available models from your configured provider.</div>
        </GlassCard>
      </HeroPageLayout>
    );
  }

  if (props.error) {
    return (
      <HeroPageLayout title="SELECT MODEL" variant="compact" align="center" aria-label="Model selection">
        <GlassCard>
          <div className="UiSectionTitle">Failed to load models</div>
          <InlineError>{props.error}</InlineError>
          <ButtonRow>
            <ActionButton variant="primary" onClick={props.onRetry}>
              Retry
            </ActionButton>
            <ActionButton onClick={props.onBack}>Back</ActionButton>
          </ButtonRow>
        </GlassCard>
      </HeroPageLayout>
    );
  }

  if (filteredModels.length === 0) {
    return (
      <HeroPageLayout title="SELECT MODEL" variant="compact" align="center" aria-label="Model selection">
        <GlassCard>
          <div className="UiSectionTitle">No models available</div>
          <div className="UiSectionSubtitle">
            No models were found for your configured API key. The key may be invalid or the provider may be temporarily
            unavailable.
          </div>
          <ButtonRow>
            <ActionButton variant="primary" onClick={props.onRetry}>
              Retry
            </ActionButton>
            <ActionButton onClick={props.onBack}>Back</ActionButton>
          </ButtonRow>
        </GlassCard>
      </HeroPageLayout>
    );
  }

  return (
    <HeroPageLayout title="SELECT MODEL" variant="compact" align="center" aria-label="Model selection">
      <GlassCard>
        <div className="UiSectionTitleRow">
          <div className="UiSectionTitle">Select Default Model</div>
          <div className="UiTierHelp">
            <span className="UiTierHelpIcon">?</span>
            <div className="UiTierHelpTooltip">
              <div className="UiTierHelpItem">
                <span className="UiModelTier">ULTRA</span>
                <span>{TIER_INFO.ultra.description}</span>
              </div>
              <div className="UiTierHelpItem">
                <span className="UiModelTier">PRO</span>
                <span>{TIER_INFO.pro.description}</span>
              </div>
              <div className="UiTierHelpItem">
                <span className="UiModelTier">FAST</span>
                <span>{TIER_INFO.fast.description}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="UiSectionSubtitle">Choose your preferred model. You can change this later in settings.</div>
        <div className="UiModelList">
          {filteredModels.map((model) => {
            const modelKey = `${model.provider}/${model.id}`;
            const tier = getModelTier(model.provider, model.id);
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
                    {tier && <span className="UiModelTier">{tier.toUpperCase()}</span>}
                  </div>
                  <span className="UiModelHints">
                    {model.contextWindow && <span className="UiModelHint">ctx {formatContextWindow(model.contextWindow)}</span>}
                    {model.reasoning && <span className="UiModelHint">reasoning</span>}
                  </span>
                </div>
              </label>
            );
          })}
        </div>
        <ButtonRow>
          <ActionButton variant="primary" disabled={!selected} onClick={() => selected && props.onSelect(selected)}>
            Next
          </ActionButton>
          <ActionButton onClick={props.onBack}>Back</ActionButton>
        </ButtonRow>
      </GlassCard>
    </HeroPageLayout>
  );
}
