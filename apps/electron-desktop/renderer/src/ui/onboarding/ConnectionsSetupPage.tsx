import React from "react";

import { GlassCard, HeroPageLayout, PrimaryButton, SecondaryButton } from "../kit";
import telegramIcon from "../../../../assets/messangers/Telegram.svg";
import slackIcon from "../../../../assets/set-up-skills/Slack.svg";

type ConnectionStatus = "connect" | "connected";

type ConnectionEntry = {
  id: "telegram" | "slack";
  name: string;
  description: string;
  iconText: string;
  iconVariant: "telegram" | "slack";
  image: string;
};

const CONNECTIONS: ConnectionEntry[] = [
  {
    id: "telegram",
    name: "Telegram",
    description: "Talk to OpenClaw from Telegram DMs (bot token + allowlist)",
    iconText: "TG",
    iconVariant: "telegram",
    image: telegramIcon,
  },
  {
    id: "slack",
    name: "Slack",
    description: "Send messages, search info and manage pins in your workspace",
    iconText: "S",
    iconVariant: "slack",
    image: slackIcon,
  },
];

function ConnectionCta({
  status,
  onConnect,
}: {
  status: ConnectionStatus;
  onConnect?: () => void;
}) {
  if (status === "connected") {
    return (
      <span className="UiSkillStatus UiSkillStatus--connected" aria-label="Connected">
        ✓ Connected
      </span>
    );
  }
  return (
    <button
      className="UiSkillConnectButton"
      type="button"
      disabled={!onConnect}
      title={onConnect ? "Connect" : "Not available yet"}
      onClick={onConnect}
    >
      Connect
    </button>
  );
}

export function ConnectionsSetupPage(props: {
  telegramStatus: ConnectionStatus;
  onTelegramConnect: () => void;
  slackStatus: ConnectionStatus;
  onSlackConnect: () => void;
  onBack: () => void;
  onSkip: () => void;
  onContinue: () => void;
}) {
  const totalSteps = 5;
  const activeStep = 4;
  return (
    <HeroPageLayout variant="compact" align="center" aria-label="Connections setup">
      <GlassCard className="UiSkillsCard UiGlassCardOnboarding">
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
        <div className="UiSectionTitle">Set Up Connections</div>
        <div className="UiSectionSubtitle">
          Connect chat apps so you can talk to OpenClaw from anywhere
        </div>

        <div className="UiProviderList UiListWithScroll">
          <div className="UiSkillsGrid">
            {CONNECTIONS.map((conn) => {
              const status = conn.id === "telegram" ? props.telegramStatus : props.slackStatus;
              const onConnect =
                conn.id === "telegram" ? props.onTelegramConnect : props.onSlackConnect;
              const connected = status === "connected";
              return (
                <div key={conn.id} className={`UiSkillCard`} role="group" aria-label={conn.name}>
                  <div className="UiSkillTopRow">
                    <span className={`UiSkillIcon`} aria-hidden="true">
                      {conn.image ? <img src={conn.image} alt="" /> : conn.iconText}
                    </span>
                    <div className="UiSkillTopRight">
                      <ConnectionCta status={status} onConnect={onConnect} />
                    </div>
                  </div>
                  <div className="UiSkillName">{conn.name}</div>
                  <div className="UiSkillDescription">{conn.description}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="UiSkillsBottomRow">
          <button className="UiTextButton" onClick={props.onBack} type="button">
            Back
          </button>
          <div className="UiSkillsBottomActions">
            <SecondaryButton size={"sm"} onClick={props.onSkip}>
              Skip
            </SecondaryButton>
            <PrimaryButton size={"sm"} onClick={props.onContinue}>
              Continue
            </PrimaryButton>
          </div>
        </div>
      </GlassCard>
    </HeroPageLayout>
  );
}
