import React from "react";

import { CheckboxRow, GlassCard, HeroPageLayout, PrimaryButton, TextInput } from "../kit";
import { DEFAULT_GOG_SERVICES } from "./welcome/constants";

type ServiceOption = {
  id: string;
  label: string;
  description: string;
};

const SERVICE_OPTIONS: ServiceOption[] = [
  {
    id: "gmail",
    label: "Gmail",
    description: "Search, read, and send emails",
  },
  {
    id: "calendar",
    label: "Calendar",
    description: "Create and manage events",
  },
  {
    id: "drive",
    label: "Drive",
    description: "Find and manage files",
  },
  {
    id: "docs",
    label: "Docs",
    description: "Create and update documents",
  },
  {
    id: "sheets",
    label: "Sheets",
    description: "Create and update spreadsheets",
  },
  {
    id: "contacts",
    label: "Contacts",
    description: "Search contacts and address book",
  },
];

function parseDefaultServicesCsv(): string[] {
  return DEFAULT_GOG_SERVICES.split(",").map((v) => v.trim()).filter(Boolean);
}

export function GogPage(props: {
  status: string | null;
  error: string | null;
  gogBusy: boolean;
  gogError: string | null;
  gogOutput: string | null;
  gogAccount: string;
  setGogAccount: (value: string) => void;
  onRunAuthAdd: (servicesCsv: string) => Promise<{ ok: boolean }>;
  onRunAuthList: () => Promise<unknown>;
  onFinish: () => void;
  onSkip?: () => void;
  finishText?: string;
  skipText?: string;
}) {
  const skip = props.onSkip ?? props.onFinish;
  const finishText = props.finishText ?? "Continue";
  const skipText = props.skipText ?? "Skip";
  const [connected, setConnected] = React.useState(false);
  const [services, setServices] = React.useState<Record<string, boolean>>(() => {
    const defaults = new Set(parseDefaultServicesCsv());
    return Object.fromEntries(SERVICE_OPTIONS.map((s) => [s.id, defaults.has(s.id)]));
  });

  const selectedServices = React.useMemo(
    () => SERVICE_OPTIONS.filter((s) => services[s.id]).map((s) => s.id),
    [services],
  );
  const servicesCsv = selectedServices.join(",");

  const onConnect = React.useCallback(async () => {
    const account = props.gogAccount.trim();
    if (!account) {
      return;
    }
    if (!servicesCsv) {
      return;
    }
    const res = await props.onRunAuthAdd(servicesCsv);
    if (res.ok) {
      setConnected(true);
    }
  }, [props, servicesCsv]);

  return (
    <HeroPageLayout title="SETUP" variant="compact" align="center" aria-label="Google Workspace setup">
      <GlassCard className="UiGoogleWorkspaceCard">
        <div className="UiSectionTitle">Google Workspace</div>
        <div className="UiSectionSubtitle">
          Optional: connect your Google account to enable skills like email and calendar. This will open a browser for
          consent.
        </div>
        {connected ? (
          <div className="UiGoogleWorkspaceConnected" aria-label="Connected">
            ✓ Connected
          </div>
        ) : null}
        {props.status ? <div className="UiSectionSubtitle">{props.status}</div> : null}

        <div className="UiGoogleWorkspaceForm">
          <div className="UiSectionSubtitle" style={{ margin: 0 }}>
            Account
          </div>
          <TextInput
            type="text"
            value={props.gogAccount}
            onChange={props.setGogAccount}
            placeholder="you@gmail.com"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            disabled={props.gogBusy}
          />

          <div className="UiSectionSubtitle" style={{ margin: "14px 0 0" }}>
            Enable
          </div>
          <div className="UiGoogleWorkspaceServices">
            {SERVICE_OPTIONS.map((svc) => (
              <CheckboxRow
                key={svc.id}
                checked={Boolean(services[svc.id])}
                disabled={props.gogBusy}
                onChange={(checked) => {
                  setServices((prev) => ({ ...prev, [svc.id]: checked }));
                }}
              >
                <strong>{svc.label}</strong> — {svc.description}
              </CheckboxRow>
            ))}
          </div>

          <div className="UiGoogleWorkspaceBottomRow">
            <button className="UiTextButton" onClick={skip} type="button" disabled={props.gogBusy}>
              {skipText}
            </button>
            <div className="UiGoogleWorkspaceActions">
              <button
                className="UiSecondaryButton UiGoogleWorkspaceSecondary"
                type="button"
                disabled={props.gogBusy}
                onClick={() => void props.onRunAuthList()}
              >
                {props.gogBusy ? "Checking…" : "Check"}
              </button>
              <PrimaryButton
                disabled={props.gogBusy || !props.gogAccount.trim() || selectedServices.length === 0}
                onClick={() => void onConnect()}
              >
                {props.gogBusy ? "Connecting…" : "Connect"}
              </PrimaryButton>
            </div>
          </div>
        </div>

        {props.gogOutput ? (
          <details className="UiGoogleWorkspaceDetails">
            <summary className="UiGoogleWorkspaceDetailsSummary">Details</summary>
            <pre className="UiGoogleWorkspaceDetailsPre">{props.gogOutput}</pre>
          </details>
        ) : null}

        <div className="UiGoogleWorkspaceFooterRow">
          <button className="UiTextButton" onClick={props.onFinish} type="button" disabled={props.gogBusy}>
            {finishText}
          </button>
        </div>
      </GlassCard>
    </HeroPageLayout>
  );
}

