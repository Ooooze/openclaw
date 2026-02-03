import React from "react";

import { CheckboxRow, GlassCard, HeroPageLayout, InlineError, PrimaryButton, ScrollBox } from "./kit";
import { LoadingScreen } from "./LoadingScreen";

export type ConsentDesktopApi = NonNullable<Window["openclawDesktop"]> & {
  getConsentInfo?: () => Promise<{ accepted: boolean }>;
  acceptConsent?: () => Promise<{ ok: true }>;
  startGateway?: () => Promise<{ ok: true }>;
};

export function ConsentScreen({ onAccepted }: { onAccepted: () => void }) {
  const api = window.openclawDesktop as ConsentDesktopApi | undefined;
  const [checked, setChecked] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const accept = React.useCallback(async () => {
    if (!checked || busy) {
      return;
    }
    if (!api || typeof api.acceptConsent !== "function") {
      setError("Desktop API is not available. Please restart the app.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await api.acceptConsent();
      // Redundant safety: ensure gateway start even if consent handler changes.
      if (typeof api.startGateway === "function") {
        await api.startGateway();
      }
      onAccepted();
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }, [api, busy, checked, onAccepted]);

  if (busy) {
    return <LoadingScreen state={null} />;
  }

  return (
    <HeroPageLayout
      role="dialog"
      aria-label="User agreement"
      title="USER AGREEMENT"
      subtitle="Please read the following terms before continuing."
    >
      <GlassCard>
        <ScrollBox>
          <p>
            This is placeholder text for design iteration. By accepting, you acknowledge that this desktop app may start
            a local Gateway process on your machine, store configuration under your user profile, and communicate with
            local services.
          </p>
          <p>
            You are responsible for ensuring you have the right to use any third-party services you connect, and for
            reviewing logs and security settings. This text will be replaced with final legal copy.
          </p>
          <p>
            If you do not agree, you should close the application. Acceptance is stored locally and shown only on the
            first launch.
          </p>
        </ScrollBox>

        <CheckboxRow checked={checked} onChange={setChecked} label="I have read and accept" />

        {error ? <InlineError>{error}</InlineError> : null}

        <PrimaryButton disabled={!checked || busy} onClick={() => void accept()}>
          Continue
        </PrimaryButton>
      </GlassCard>
    </HeroPageLayout>
  );
}

