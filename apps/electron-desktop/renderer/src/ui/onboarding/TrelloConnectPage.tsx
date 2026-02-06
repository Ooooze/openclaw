import React from "react";

import { GlassCard, HeroPageLayout, PrimaryButton, TextInput } from "../kit";

export function TrelloConnectPage(props: {
  status: string | null;
  error: string | null;
  busy: boolean;
  onSubmit: (apiKey: string, token: string) => void;
  onBack: () => void;
}) {
  const [apiKey, setApiKey] = React.useState("");
  const [token, setToken] = React.useState("");
  const totalSteps = 5;
  const activeStep = 3;

  const handleSubmit = () => {
    const trimmedKey = apiKey.trim();
    const trimmedToken = token.trim();
    if (trimmedKey && trimmedToken) {
      props.onSubmit(trimmedKey, trimmedToken);
    }
  };

  return (
    <HeroPageLayout variant="compact" align="center" aria-label="Trello setup">
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

        <div className="UiApiKeyTitle">Connect Trello</div>
        <div className="UiApiKeySubtitle">
          Get your Trello API key and token from{" "}
          <a
            href="https://trello.com/app-key"
            target="_blank"
            rel="noopener noreferrer"
            className="UiLink"
            onClick={(e) => {
              e.preventDefault();
              void window.openclawDesktop?.openExternal("https://trello.com/app-key");
            }}
          >
            trello.com/app-key ↗
          </a>
        </div>

        <div className="UiSectionSubtitle">
          Steps:
          <ol>
            <li>Open the app key page.</li>
            <li>Copy your API key.</li>
            <li>Click the Token link and generate a token.</li>
            <li>Paste both values here.</li>
          </ol>
        </div>

        {props.status ? <div className="UiSectionSubtitle">{props.status}</div> : null}

        <div className="UiApiKeyInputRow" style={{ display: "grid", gap: 10 }}>
          <TextInput
            type="password"
            value={apiKey}
            onChange={setApiKey}
            placeholder="Trello API key"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            disabled={props.busy}
          />
          <TextInput
            type="password"
            value={token}
            onChange={setToken}
            placeholder="Trello token"
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
          <PrimaryButton disabled={!apiKey.trim() || !token.trim() || props.busy} onClick={handleSubmit}>
            {props.busy ? "Saving..." : "Save & return"}
          </PrimaryButton>
        </div>
      </GlassCard>
    </HeroPageLayout>
  );
}

