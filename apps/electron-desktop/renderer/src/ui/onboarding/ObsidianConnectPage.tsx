import React from "react";

import { GlassCard, HeroPageLayout, PrimaryButton, SecondaryButton } from "../kit";

type ObsidianVault = {
  name: string;
  path: string;
  open: boolean;
};

export function ObsidianConnectPage(props: {
  status: string | null;
  error: string | null;
  busy: boolean;
  vaults: ObsidianVault[];
  selectedVaultName: string;
  setSelectedVaultName: (value: string) => void;
  vaultsLoading: boolean;
  onSetDefaultAndEnable: (vaultName: string) => void;
  onRecheck: () => void;
  onBack: () => void;
}) {
  const totalSteps = 5;
  const activeStep = 3;
  const selected = props.selectedVaultName;

  return (
    <HeroPageLayout variant="compact" align="center" aria-label="Obsidian setup">
      <GlassCard className="UiApiKeyCard UiGlassCardOnbording">
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

        <div className="UiApiKeyTitle">Connect Obsidian</div>
        <div className="UiApiKeySubtitle">
          Enable Obsidian vault automation via the bundled <code>obsidian-cli</code>.
        </div>

        <div className="UiSectionSubtitle">
          Notes:
          <ol>
            <li>Select a vault below. We'll set it as the default for future commands.</li>
            <li>
              Connected means <code>obsidian-cli print-default --path-only</code> returns a vault
              path that exists.
            </li>
          </ol>
        </div>

        <div className="UiApiKeyInputRow">
          <div className="UiSectionSubtitle" style={{ marginBottom: 8 }}>
            Vault
          </div>
          <select
            className="UiInput"
            disabled={props.busy || props.vaultsLoading || props.vaults.length === 0}
            value={selected}
            onChange={(e) => props.setSelectedVaultName(e.target.value)}
          >
            {props.vaults.length === 0 ? (
              <option value="">
                {props.vaultsLoading ? "Loading vaults..." : "No vaults found"}
              </option>
            ) : (
              <>
                <option value="" disabled>
                  Select a vault…
                </option>
                {props.vaults.map((v) => (
                  <option key={`${v.name}:${v.path}`} value={v.name}>
                    {v.open ? `• ${v.name}` : v.name}
                  </option>
                ))}
              </>
            )}
          </select>
          {selected ? (
            <div className="UiSectionSubtitle" style={{ marginTop: 8 }}>
              Selected: <code>{selected}</code>
            </div>
          ) : null}
        </div>

        {props.status ? <div className="UiSectionSubtitle">{props.status}</div> : null}

        <div className="UiApiKeySpacer" aria-hidden="true" />

        <div className="UiApiKeyButtonRow">
          <button
            className="UiTextButton"
            disabled={props.busy}
            onClick={props.onBack}
            type="button"
          >
            Back
          </button>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <SecondaryButton
              size={'sm'}
              disabled={props.busy || props.vaultsLoading || !selected}
              onClick={() => props.onSetDefaultAndEnable(selected)}
            >
              {props.busy ? "Setting..." : "Set default & enable"}
            </SecondaryButton>
            <SecondaryButton disabled={props.busy || props.vaultsLoading} onClick={props.onRecheck} size={'sm'}>
              {props.busy ? "Checking..." : "Re-check"}
            </SecondaryButton>
            <PrimaryButton disabled={props.busy} onClick={props.onBack} size={'sm'}>
              Done
            </PrimaryButton>
          </div>
          </div>
      </GlassCard>
    </HeroPageLayout>
  );
}
