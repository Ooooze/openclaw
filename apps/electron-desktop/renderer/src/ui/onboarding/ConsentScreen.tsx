import React from "react";

import { getDesktopApiOrNull } from "../../ipc/desktopApi";
import { FooterText, HeroPageLayout, PrimaryButton, SplashLogo } from "../shared/kit";
import { LoadingScreen } from "./LoadingScreen";
import { addToastError } from "../shared/toast";
import pkg from "../../../../package.json";
import s from "./ConsentScreen.module.css";

export type ConsentDesktopApi = NonNullable<Window["openclawDesktop"]> & {
  getConsentInfo?: () => Promise<{ accepted: boolean }>;
  acceptConsent?: () => Promise<{ ok: true }>;
  startGateway?: () => Promise<{ ok: true }>;
};

export function ConsentScreen({ onAccepted }: { onAccepted: () => void }) {
  const api = getDesktopApiOrNull() as ConsentDesktopApi | null;
  const [busy, setBusy] = React.useState(false);
  const termsUrl = "https://atomicbot.ai/terms-of-service";
  const appVersion = pkg.version || "0.0.0";

  const accept = React.useCallback(async () => {
    if (busy) {
      return;
    }
    if (!api || typeof api.acceptConsent !== "function") {
      addToastError("Desktop API is not available. Please restart the app.");
      return;
    }
    setBusy(true);
    try {
      await api.acceptConsent();
      // Redundant safety: ensure gateway start even if consent handler changes.
      if (typeof api.startGateway === "function") {
        await api.startGateway();
      }
      onAccepted();
    } catch (err) {
      addToastError(err);
    } finally {
      setBusy(false);
    }
  }, [api, busy, onAccepted]);

  if (busy) {
    return <LoadingScreen state={null} />;
  }

  return (
    <HeroPageLayout
      role="dialog"
      aria-label="User agreement"
      variant="compact"
      align="center"
      hideTopbar
    >
      <div className={s.UiConsentStage}>
        <div className={s.UiConsentCenter}>
          <SplashLogo iconAlt="Atomic Bot" />
          <div className={s.UiConsentTitle}>Welcome to Atomic Bot</div>
          <div className={s.UiConsentSubtitle}>Your Personal AI Agent based on OpenClaw</div>

          <PrimaryButton onClick={() => void accept()}>Start</PrimaryButton>

          <div className="UiLinkContainer">
            <span>
              Atomic Bot is experimental product. By clicking
              <br />
              “Start” you agree to the{" "}
              <a
                className="UiLink UiLinkMainPage"
                href={termsUrl}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => {
                  // Prevent toggling the checkbox when clicking the link.
                  e.preventDefault();
                  e.stopPropagation();
                  const openExternal = getDesktopApiOrNull()?.openExternal;
                  if (typeof openExternal === "function") {
                    void openExternal(termsUrl);
                    return;
                  }
                  // Fallback for non-desktop contexts.
                  window.open(termsUrl, "_blank", "noopener,noreferrer");
                }}
              >
                Terms of Use
              </a>
              .
            </span>
          </div>
        </div>

        <FooterText>Version {appVersion}</FooterText>
      </div>
    </HeroPageLayout>
  );
}
