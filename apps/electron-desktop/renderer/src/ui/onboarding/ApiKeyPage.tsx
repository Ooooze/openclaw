import React from "react";

import { ActionButton, ButtonRow, GlassCard, HeroPageLayout, InlineError, TextInput } from "../kit";
import type { Provider } from "./ProviderSelectPage";

type ProviderMeta = {
  title: string;
  placeholder: string;
  helpUrl?: string;
  helpText?: string;
};

const PROVIDER_META: Record<Provider, ProviderMeta> = {
  anthropic: {
    title: "Anthropic API Key",
    placeholder: "sk-ant-...",
    helpUrl: "https://console.anthropic.com/settings/keys",
    helpText: "Get your API key from the Anthropic Console.",
  },
  google: {
    title: "Google Gemini API Key",
    placeholder: "AIza...",
    helpUrl: "https://aistudio.google.com/apikey",
    helpText: "Get your API key from Google AI Studio.",
  },
  openai: {
    title: "OpenAI API Key",
    placeholder: "sk-...",
    helpUrl: "https://platform.openai.com/api-keys",
    helpText: "Get your API key from the OpenAI Platform.",
  },
  openrouter: {
    title: "OpenRouter API Key",
    placeholder: "sk-or-...",
    helpUrl: "https://openrouter.ai/keys",
    helpText: "Get your API key from OpenRouter.",
  },
};

export function ApiKeyPage(props: {
  provider: Provider;
  status: string | null;
  error: string | null;
  busy: boolean;
  onSubmit: (apiKey: string) => void;
  onBack: () => void;
}) {
  const [apiKey, setApiKey] = React.useState("");
  const meta = PROVIDER_META[props.provider];

  const handleSubmit = () => {
    const trimmed = apiKey.trim();
    if (trimmed) {
      props.onSubmit(trimmed);
    }
  };

  return (
    <HeroPageLayout title="API KEY" variant="compact" align="center" aria-label="API key setup">
      <GlassCard>
        <div className="UiSectionTitle">{meta.title}</div>
        <div className="UiSectionSubtitle">
          {meta.helpText}{" "}
          {meta.helpUrl && (
            <a
              href={meta.helpUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="UiLink"
              onClick={(e) => {
                e.preventDefault();
                window.openclawDesktop?.openExternal(meta.helpUrl!);
              }}
            >
              Get API key →
            </a>
          )}
        </div>
        {props.status && <div className="UiSectionSubtitle">{props.status}</div>}
        {props.error && <InlineError>{props.error}</InlineError>}
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
        <ButtonRow>
          <ActionButton variant="primary" disabled={!apiKey.trim() || props.busy} onClick={handleSubmit}>
            {props.busy ? "Saving..." : "Next"}
          </ActionButton>
          <ActionButton disabled={props.busy} onClick={props.onBack}>
            Back
          </ActionButton>
        </ButtonRow>
      </GlassCard>
    </HeroPageLayout>
  );
}
