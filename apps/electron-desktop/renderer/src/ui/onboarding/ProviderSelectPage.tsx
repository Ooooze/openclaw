import React from "react";

import { ActionButton, ButtonRow, GlassCard, HeroPageLayout, InlineError } from "../kit";

export type Provider = "anthropic" | "google" | "openai" | "openrouter";

type ProviderInfo = {
  id: Provider;
  name: string;
  description: string;
  recommended?: boolean;
};

const PROVIDERS: ProviderInfo[] = [
  {
    id: "anthropic",
    name: "Anthropic (Claude)",
    description: "Claude models with excellent reasoning, coding, and instruction-following capabilities.",
    recommended: true,
  },
  {
    id: "google",
    name: "Google (Gemini)",
    description: "Gemini models with strong multimodal understanding and large context windows.",
  },
  {
    id: "openai",
    name: "OpenAI (GPT)",
    description: "GPT models with broad capabilities and extensive tool use support.",
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    description: "Access to 200+ models from multiple providers through a single API.",
  },
];

export function ProviderSelectPage(props: { error: string | null; onSelect: (provider: Provider) => void }) {
  const [selected, setSelected] = React.useState<Provider | null>(null);

  return (
    <HeroPageLayout title="AI PROVIDER" variant="compact" align="center" aria-label="Provider selection">
      <GlassCard>
        <div className="UiSectionTitle">Select AI Provider</div>
        <div className="UiSectionSubtitle">
          Choose your preferred AI provider. You can configure additional providers later.
        </div>
        {props.error ? <InlineError>{props.error}</InlineError> : null}
        <div className="UiProviderList">
          {PROVIDERS.map((provider) => (
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
              <div className="UiProviderContent">
                <div className="UiProviderHeader">
                  <span className="UiProviderName">{provider.name}</span>
                  {provider.recommended && <span className="UiProviderBadge">Recommended</span>}
                </div>
                <div className="UiProviderDescription">{provider.description}</div>
              </div>
            </label>
          ))}
        </div>
        <ButtonRow>
          <ActionButton variant="primary" disabled={!selected} onClick={() => selected && props.onSelect(selected)}>
            Next
          </ActionButton>
        </ButtonRow>
      </GlassCard>
    </HeroPageLayout>
  );
}
