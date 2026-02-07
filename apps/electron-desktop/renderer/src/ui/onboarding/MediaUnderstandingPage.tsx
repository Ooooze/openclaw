import React from "react";

import {
  CheckboxRow,
  GlassCard,
  HeroPageLayout,
  InlineError,
  PrimaryButton,
  SecondaryButton,
  TextInput,
} from "../kit";
import { addToastError } from "../toast";

type MediaUnderstandingSettings = {
  image: boolean;
  audio: boolean;
};

type Provider = "openai";

export function MediaUnderstandingPage(props: {
  status: string | null;
  error: string | null;
  busy: boolean;
  hasOpenAiProvider: boolean;
  onSubmit: (settings: MediaUnderstandingSettings) => void;
  onAddProviderKey: (provider: Provider, apiKey: string) => Promise<boolean>;
  onBack: () => void;
  onSkip: () => void;
}) {
  const totalSteps = 5;
  const activeStep = 3;
  const [settings, setSettings] = React.useState<MediaUnderstandingSettings>({
    image: true,
    audio: true,
  });
  const [addKey, setAddKey] = React.useState("");
  const [addBusy, setAddBusy] = React.useState(false);
  const [addError, setAddError] = React.useState<string | null>(null);
  const [addHighlight, setAddHighlight] = React.useState(false);
  const addInputRef = React.useRef<HTMLInputElement | null>(null);

  const canContinue = settings.image || settings.audio;
  const hasMissing = canContinue && !props.hasOpenAiProvider;

  const focusKey = React.useCallback(() => {
    // Focus + select best-effort.
    const el = addInputRef.current;
    if (!el) {
      return;
    }
    el.focus();
    try {
      el.select();
    } catch {
      // ignore
    }
  }, []);

  return (
    <HeroPageLayout variant="compact" align="center" aria-label="Media understanding setup">
      <GlassCard className="UiGoogleWorkspaceCard UiGlassCardOnbording">
        <div>
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
          <div className="UiSectionTitle">Media Understanding</div>
          <div className="UiSectionSubtitle">
            Let OpenClaw understand images, voice notes, and videos you send. It automatically picks a compatible
            provider
            based on the API keys you already configured.
          </div>

          {props.status ? <div className="UiSectionSubtitle">{props.status}</div> : null}

          <div className="UiGoogleWorkspaceServices" style={{ marginTop: 10 }}>
            <CheckboxRow
              checked={settings.image}
              disabled={props.busy}
              onChange={(checked) => setSettings((prev) => ({ ...prev, image: checked }))}
            >
              <strong>Images</strong> — describe screenshots and photos
            </CheckboxRow>
            <CheckboxRow
              checked={settings.audio}
              disabled={props.busy}
              onChange={(checked) => setSettings((prev) => ({ ...prev, audio: checked }))}
            >
              <strong>Audio</strong> — transcribe voice messages into text
            </CheckboxRow>
          </div>

          {hasMissing ? (
            <div style={{ marginTop: 12 }}>
              <InlineError>
                OpenAI is not configured yet. Add an OpenAI API key below to enable image + audio understanding
                reliably.
              </InlineError>
              <div className="UiSectionSubtitle" style={{ marginTop: 10 }}>
                Add provider key
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 6 }}>
              <span className="UiPill" aria-label="Provider">
                OpenAI
              </span>
              </div>
              {addError ? <InlineError>{addError}</InlineError> : null}
              <div className="UiApiKeyInputRow" style={{ marginTop: 8 }}>
                <TextInput
                  type="password"
                  value={addKey}
                  onChange={(value) => {
                    setAddKey(value);
                    if (addError) {
                      setAddError(null);
                    }
                    if (addHighlight) {
                      setAddHighlight(false);
                    }
                  }}
                  placeholder="sk-..."
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  disabled={props.busy || addBusy}
                  error={addHighlight || Boolean(addError)}
                  inputRef={addInputRef}
                />
              </div>
            </div>
          ) : null}
        </div>

        <div className="UiGoogleWorkspaceBottomRow" style={{ marginTop: 14 }}>
          <button className="UiTextButton" onClick={props.onBack} type="button" disabled={props.busy}>
            Back
          </button>
          <div className="UiGoogleWorkspaceActions">
            <PrimaryButton size={'sm'}
                           disabled={props.busy || addBusy || !addKey.trim()}
                           onClick={() => {
                             void (async () => {
                               setAddError(null);
                               setAddHighlight(false);
                               setAddBusy(true);
                               try {
                                 const ok = await props.onAddProviderKey("openai", addKey);
                                 if (ok) {
                                   setAddKey("");
                                 }
                               } catch (err) {
                                 addToastError(String(err));
                                 setAddHighlight(true);
                                 focusKey();
                               } finally {
                                 setAddBusy(false);
                               }
                             })();
                           }}
            >
              {addBusy ? "Saving…" : "Save key"}
            </PrimaryButton>
          </div>
        </div>
      </GlassCard>
    </HeroPageLayout>
  );
}

