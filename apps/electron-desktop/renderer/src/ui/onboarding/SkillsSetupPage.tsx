import React from "react";

import { GlassCard, HeroPageLayout, PrimaryButton, SecondaryButton } from "../kit";
import googleIcon from '../../../../assets/set-up-skills/Google.png';
import notionIcon from '../../../../assets/set-up-skills/Notion.png';
import trelloIcon from '../../../../assets/set-up-skills/Trello.png';
import nanoBababonIcon from '../../../../assets/set-up-skills/banana-icon.png';
import slackIcon from '../../../../assets/set-up-skills/Slack.png';
import sagIcon from '../../../../assets/set-up-skills/Sag.png';

type SkillStatus = "connect" | "connected" | "coming-soon";

type SkillEntry = {
  id: string;
  name: string;
  description: string;
  status: SkillStatus;
  iconText: string;
  image?: string
  iconVariant:
    | "google"
    | "notion"
    | "trello"
    | "gemini"
    | "nano-banana"
    | "sag"
    | "apple"
    | "reminders"
    | "obsidian"
    | "github"
    | "slack";
};

const SKILLS: SkillEntry[] = [
  {
    id: "google-workspace",
    name: "Google Workspace",
    description: "Clears your inbox, sends emails, and manages your calendar",
    status: "connect",
    iconText: "G",
    iconVariant: "google",
    image: googleIcon
  },
  {
    id: "media-understanding",
    name: "Media Understanding",
    description: "Transcribe voice messages, describe images, and summarize videos you send",
    status: "connect",
    iconText: "M",
    iconVariant: "nano-banana",
  },
  {
    id: "web-search",
    name: "Web Search",
    description: "Enable the web_search tool via Brave Search or Perplexity Sonar",
    status: "connect",
    iconText: "🌐",
    iconVariant: "gemini",
  },
  {
    id: "notion",
    name: "Notion",
    description: "Create, search, update and organize your notes, docs, and knowledge base",
    status: "connect",
    iconText: "N",
    iconVariant: "notion",
    image: notionIcon
  },
  {
    id: "trello",
    name: "Trello",
    description: "Track tasks, update boards and manage projects without opening Trello",
    status: "connect",
    iconText: "T",
    iconVariant: "trello",
    image: trelloIcon
  },
  {
    id: "apple-notes",
    name: "Apple Notes",
    description: "Create, search and organize notes without leaving your keyboard",
    status: "connect",
    iconText: "",
    iconVariant: "apple",
  },
  {
    id: "apple-reminders",
    name: "Apple Reminders",
    description: "Add, list and complete reminders without opening the Reminders app",
    status: "connect",
    iconText: "✓",
    iconVariant: "reminders",
  },
  {
    id: "obsidian",
    name: "Obsidian",
    description: "Work with your Obsidian vaults from the terminal (search, create, move, delete)",
    status: "connect",
    iconText: "💎",
    iconVariant: "obsidian",
  },
  {
    id: "github",
    name: "GitHub",
    description: "Work with issues, pull requests, and workflows via the bundled gh CLI",
    status: "connect",
    iconText: "🐙",
    iconVariant: "github",
  },
  {
    id: "slack",
    name: "Slack",
    description: "Send messages, react, and manage pins in your Slack workspace",
    status: "connect",
    iconText: "S",
    iconVariant: "slack",
    image: slackIcon
  },
  {
    id: "gemini",
    name: "Gemini",
    description: "Interact with Google's Gemini models and experiment with powerful multimodal AI",
    status: "connect",
    iconText: "✦",
    iconVariant: "gemini",
  },
  {
    id: "nano-banana",
    name: "Nano Banana",
    description: "Generate high-quality images with modern image models",
    status: "connect",
    iconText: "NB",
    iconVariant: "nano-banana",
    image: nanoBababonIcon
  },
  {
    id: "sag",
    name: "Sag",
    description: "Elevate your text-to-speech tool",
    status: "coming-soon",
    iconText: "Ⅱ",
    iconVariant: "sag",
    image: sagIcon
  },
];

function SkillCta({ status, onConnect }: { status: SkillStatus; onConnect?: () => void }) {
  if (status === "connected") {
    return (
      <span className="UiSkillStatus UiSkillStatus--connected" aria-label="Connected">
        ✓ Connected
      </span>
    );
  }
  if (status === "coming-soon") {
    return (
      <span className="UiSkillStatus UiSkillStatus--soon" aria-label="Coming soon">
        <svg xmlns="http://www.w3.org/2000/svg" width='14' height='14' fill="none" viewBox="0 0 13 13"><path stroke="#aeaeae" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.17" d="M6.42 2.92v3.5l2.33 1.16m3.5-1.16a5.83 5.83 0 1 1-11.67 0 5.83 5.83 0 0 1 11.67 0"/></svg>
        Coming Soon
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

export function SkillsSetupPage(props: {
  googleWorkspaceStatus: Exclude<SkillStatus, "coming-soon">;
  onGoogleWorkspaceConnect: () => void;
  mediaUnderstandingStatus: Exclude<SkillStatus, "coming-soon">;
  onMediaUnderstandingConnect: () => void;
  webSearchStatus: Exclude<SkillStatus, "coming-soon">;
  onWebSearchConnect: () => void;
  notionStatus: Exclude<SkillStatus, "coming-soon">;
  onNotionConnect: () => void;
  trelloStatus: Exclude<SkillStatus, "coming-soon">;
  onTrelloConnect: () => void;
  appleNotesStatus: Exclude<SkillStatus, "coming-soon">;
  onAppleNotesConnect: () => void;
  appleRemindersStatus: Exclude<SkillStatus, "coming-soon">;
  onAppleRemindersConnect: () => void;
  obsidianStatus: Exclude<SkillStatus, "coming-soon">;
  onObsidianConnect: () => void;
  githubStatus: Exclude<SkillStatus, "coming-soon">;
  onGitHubConnect: () => void;
  slackStatus: Exclude<SkillStatus, "coming-soon">;
  onSlackConnect: () => void;
  onBack: () => void;
  onSkip: () => void;
  onContinue: () => void;
}) {
  const totalSteps = 5;
  const activeStep = 3;
  return (
    <HeroPageLayout variant="compact" align="center" aria-label="Skills setup">
      <GlassCard className="UiSkillsCard UiGlassCardOnbording">
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
        <div className="UiSectionTitle">Set Up Skills</div>
        <div className="UiSectionSubtitle">
          Set up integrations to solve more tasks or do it later
        </div>

        <div className="UiProviderList UiListWithScroll">
          <div className="UiSkillsGrid">
            {SKILLS.map((skill) => {
              const status =
                skill.id === "google-workspace"
                  ? props.googleWorkspaceStatus
                  : skill.id === "media-understanding"
                    ? props.mediaUnderstandingStatus
                    : skill.id === "web-search"
                      ? props.webSearchStatus
                      : skill.id === "notion"
                        ? props.notionStatus
                        : skill.id === "trello"
                          ? props.trelloStatus
                          : skill.id === "apple-notes"
                            ? props.appleNotesStatus
                            : skill.id === "apple-reminders"
                              ? props.appleRemindersStatus
                              : skill.id === "obsidian"
                                ? props.obsidianStatus
                                : skill.id === "github"
                                  ? props.githubStatus
                                  : skill.id === "slack"
                                    ? props.slackStatus
                                    : skill.status;
              const onConnect =
                skill.id === "google-workspace"
                  ? props.onGoogleWorkspaceConnect
                  : skill.id === "media-understanding"
                    ? props.onMediaUnderstandingConnect
                    : skill.id === "web-search"
                      ? props.onWebSearchConnect
                      : skill.id === "notion"
                        ? props.onNotionConnect
                        : skill.id === "trello"
                          ? props.onTrelloConnect
                          : skill.id === "apple-notes"
                            ? props.onAppleNotesConnect
                            : skill.id === "apple-reminders"
                              ? props.onAppleRemindersConnect
                              : skill.id === "obsidian"
                                ? props.onObsidianConnect
                                : skill.id === "github"
                                  ? props.onGitHubConnect
                                  : skill.id === "slack"
                                    ? props.onSlackConnect
                                    : undefined;
              const effectiveStatus: SkillStatus =
                onConnect || status === "connected" ? status : "coming-soon";
              const connected = effectiveStatus === "connected";
              return (
                <div
                  key={skill.id}
                  className={`UiSkillCard`}
                  role="group"
                  aria-label={skill.name}
                >
                <div className="UiSkillTopRow">
                  <span className={`UiSkillIcon`} aria-hidden="true">
                    {
                      skill.image ? <img src={skill.image} alt=""/> : skill.iconText
                    }
                  </span>
                  <div className="UiSkillTopRight">
                    <SkillCta status={effectiveStatus} onConnect={onConnect} />
                  </div>
                </div>
                <div className="UiSkillName">{skill.name}</div>
                <div className="UiSkillDescription">{skill.description}</div>
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
            <SecondaryButton size={'sm'} onClick={props.onSkip}>Skip</SecondaryButton>
            <PrimaryButton size={'sm'} onClick={props.onContinue}>Continue</PrimaryButton>
          </div>
        </div>
      </GlassCard>
    </HeroPageLayout>
  );
}
