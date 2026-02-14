import React from "react";

import gw from "../connections/GoogleWorkspace.module.css";
import { getDesktopApiOrNull } from "../../../ipc/desktopApi";
import {
  CheckboxRow,
  GlassCard,
  HeroPageLayout,
  InlineError,
  PrimaryButton,
  TextInput,
} from "../../shared/kit";

type MediaUnderstandingSettings = {
  image: boolean;
  audio: boolean;
  video: boolean;
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
    video: true,
  });
  const [addKey, setAddKey] = React.useState("");
  const [actionBusy, setActionBusy] = React.useState(false);
  const [errorText, setErrorText] = React.useState("");
  const [validating, setValidating] = React.useState(false);

  const canContinue = settings.image || settings.audio || settings.video;
  const needsKey = canContinue && !props.hasOpenAiProvider;
  const isBusy = props.busy || actionBusy;

  // Unified handler: validate + save key (if needed), then submit settings
  const handleContinue = async () => {
    setErrorText("");

    if (needsKey) {
      const trimmed = addKey.trim();
      if (!trimmed) {
        setErrorText("Please enter your OpenAI API key to continue.");
        return;
      }

      // Validate key against the provider API
      setValidating(true);
      try {
        const result = await getDesktopApiOrNull()?.validateApiKey("openai", trimmed);
        if (result && !result.valid) {
          setErrorText(result.error ?? "Invalid API key.");
          return;
        }
      } catch {
        // If validation IPC is unavailable, allow saving anyway
      } finally {
        setValidating(false);
      }

      // Save the key
      setActionBusy(true);
      try {
        const ok = await props.onAddProviderKey("openai", trimmed);
        if (!ok) {
          setErrorText("Failed to save API key. Please try again.");
          return;
        }
        setAddKey("");
      } catch (err) {
        setErrorText(String(err));
        return;
      } finally {
        setActionBusy(false);
      }
    }

    // Proceed to next step
    props.onSubmit(settings);
  };

  const buttonLabel = validating ? "Validating…" : actionBusy ? "Saving…" : "Continue";

  return (
    <HeroPageLayout variant="compact" align="center" aria-label="Media understanding setup">
      <GlassCard className={`${gw.card} UiGlassCardOnboarding`}>
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

        <div className="UiContentWrapper scrollable">
          <div className="UiSectionSubtitle">
            Enables the bot to analyze images, audio and videos that come from external sources.
          </div>

          {/*{props.status ? <div className="UiSectionSubtitle">{props.status}</div> : null}*/}

          <div className={gw.services} style={{ marginTop: 10 }}>
            <CheckboxRow
              checked={settings.image}
              disabled={isBusy}
              onChange={(checked) => setSettings((prev) => ({ ...prev, image: checked }))}
            >
              <strong>Images</strong> — describe screenshots and photos
            </CheckboxRow>
            <CheckboxRow
              checked={settings.audio}
              disabled={isBusy}
              onChange={(checked) => setSettings((prev) => ({ ...prev, audio: checked }))}
            >
              <strong>Audio</strong> — transcribe voice messages into text
            </CheckboxRow>
            <CheckboxRow
              checked={settings.video}
              disabled={isBusy}
              onChange={(checked) => setSettings((prev) => ({ ...prev, video: checked }))}
            >
              <strong>Video</strong> — summarize and describe video content
            </CheckboxRow>
          </div>

          {needsKey ? (
            <div className="mt-md">
              <div className="UiApiKeyInputRow mt-sm">
                <TextInput
                  type="password"
                  value={addKey}
                  onChange={(value) => {
                    setAddKey(value);
                    if (errorText) {setErrorText("");}
                  }}
                  placeholder="sk-..."
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  disabled={isBusy}
                  isError={errorText}
                  label={"OpenAI API key"}
                />
              </div>
            </div>
          ) : null}
        </div>

        <div className={gw.bottomRow}>
          <button className="UiTextButton" onClick={props.onBack} type="button" disabled={isBusy}>
            Back
          </button>
          <div className={gw.actions}>
            <PrimaryButton
              size={"sm"}
              disabled={isBusy || !canContinue}
              loading={validating || actionBusy}
              onClick={() => void handleContinue()}
            >
              {buttonLabel}
            </PrimaryButton>
          </div>
        </div>
      </GlassCard>
    </HeroPageLayout>
  );
}
