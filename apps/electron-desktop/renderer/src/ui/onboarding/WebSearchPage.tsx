import React from "react";

import { GlassCard, HeroPageLayout, PrimaryButton, SecondaryButton, TextInput } from "../kit";

export type WebSearchProvider = "brave" | "perplexity";

type ProviderMeta = {
  id: WebSearchProvider;
  name: string;
  description: string;
  placeholder: string;
  helpUrl?: string;
  helpText?: string;
};

const PROVIDERS: [ProviderMeta, ...ProviderMeta[]] = [
  {
    id: "brave",
    name: "Brave Search",
    description: "Fast web search results (titles, URLs, snippets).",
    placeholder: "BSA...",
    helpUrl: "https://docs.openclaw.ai/tools/web",
    helpText: "Get a Brave Search API key, then paste it here.",
  },
  {
    id: "perplexity",
    name: "Perplexity Sonar",
    description: "AI-synthesized answers with citations (direct or via OpenRouter).",
    placeholder: "pplx-... or sk-or-...",
    helpUrl: "https://docs.openclaw.ai/tools/web",
    helpText: "Paste a Perplexity API key (pplx-...) or an OpenRouter key (sk-or-...).",
  },
];

export function WebSearchPage(props: {
  status: string | null;
  error: string | null;
  busy: boolean;
  onSubmit: (provider: WebSearchProvider, apiKey: string) => void;
  onBack: () => void;
  onSkip: () => void;
}) {
  const [provider, setProvider] = React.useState<WebSearchProvider>("brave");
  const [apiKey, setApiKey] = React.useState("");
  const meta = PROVIDERS.find((p) => p.id === provider) ?? PROVIDERS[0];
  const totalSteps = 5;
  const activeStep = 3;

  const handleSubmit = () => {
    const trimmed = apiKey.trim();
    if (trimmed) {
      props.onSubmit(provider, trimmed);
    }
  };

  return (
    <HeroPageLayout variant="compact" align="center" aria-label="Web search setup">
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

        <div className="UiApiKeyTitle">Enable Web Search</div>
        <div className="UiApiKeySubtitle">
          Choose your web search provider and add an API key for the <code>web_search</code> tool.
        </div>

        <div className="UiProviderList" style={{ marginTop: 12 }}>
          {PROVIDERS.map((p) => (
            <label
              key={p.id}
              className={`UiProviderOption ${provider === p.id ? "UiProviderOption--selected" : ""}`}
            >
              <input
                type="radio"
                name="web-search-provider"
                value={p.id}
                checked={provider === p.id}
                onChange={() => setProvider(p.id)}
                className="UiProviderRadio"
                disabled={props.busy}
              />
              <div className="UiProviderContent">
                <div className="UiProviderHeader">
                  <span className="UiProviderName">{p.name}</span>
                </div>
                <div className="UiProviderDescription">{p.description}</div>
              </div>
            </label>
          ))}
        </div>

        <div className="UiApiKeySubtitle" style={{ marginTop: 12 }}>
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
              Learn more ↗
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
          <button className="UiTextButton" disabled={props.busy} onClick={props.onBack} type="button">
            Back
          </button>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <SecondaryButton disabled={props.busy} onClick={props.onSkip}>
              Skip
            </SecondaryButton>
            <PrimaryButton disabled={!apiKey.trim() || props.busy} onClick={handleSubmit}>
              {props.busy ? "Saving..." : "Continue"}
            </PrimaryButton>
          </div>
        </div>
      </GlassCard>
    </HeroPageLayout>
  );
}

