import React from "react";

import { Modal } from "../kit";
import type { GatewayState } from "../../../../src/main/types";
import { disableSkill, type SkillId, type SkillStatus, useSkillsStatus } from "./useSkillsStatus";
import {
  AppleNotesModalContent,
  AppleRemindersModalContent,
  GitHubModalContent,
  GoogleWorkspaceModalContent,
  MediaUnderstandingModalContent,
  NotionModalContent,
  ObsidianModalContent,
  SlackModalContent,
  TrelloModalContent,
  WebSearchModalContent,
} from "./skill-modals";

import googleImage from "../../../../assets/set-up-skills/Google.svg";
import notionImage from "../../../../assets/set-up-skills/Notion.svg";
import trelloImage from "../../../../assets/set-up-skills/Trello.svg";
import geminiImage from "../../../../assets/ai-providers/gemini.svg";
import nanoBananaImage from "../../../../assets/set-up-skills/Nano-Banana.svg";
import sagImage from "../../../../assets/set-up-skills/Sag.svg";
import remindersImage from "../../../../assets/set-up-skills/Reminders.svg";
import obsidianImage from "../../../../assets/set-up-skills/Obsidian.svg";
import githubImage from "../../../../assets/set-up-skills/GitHub.svg";
import slackImage from "../../../../assets/set-up-skills/Slack.svg";
import notesIcon from "../../../../assets/set-up-skills/Notes.svg";
import mediaImage from "../../../../assets/set-up-skills/Media.svg";
import webSearchImage from "../../../../assets/set-up-skills/Web-Search.svg";

type GatewayRpc = {
  request: <T = unknown>(method: string, params?: unknown) => Promise<T>;
};

type ConfigSnapshotLike = {
  path?: string;
  exists?: boolean;
  valid?: boolean;
  hash?: string;
  config?: unknown;
};

type IconVariant =
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

type SkillDefinition = {
  id: SkillId;
  name: string;
  description: string;
  iconText: string;
  iconVariant: IconVariant;
  image?: string;
};

const SKILLS: SkillDefinition[] = [
  {
    id: "google-workspace",
    name: "Google Workspace",
    description: "Clears your inbox, sends emails, and manages your calendar",
    iconText: "G",
    iconVariant: "google",
    image: googleImage,
  },
  {
    id: "media-understanding",
    name: "Media Understanding",
    description: "Transcribe voice messages, describe images, and summarize videos you send",
    iconText: "M",
    iconVariant: "nano-banana",
    image: mediaImage,
  },
  {
    id: "web-search",
    name: "Web Search",
    description: "Enable the web_search tool via Brave Search or Perplexity Sonar",
    iconText: "🌐",
    iconVariant: "gemini",
    image: webSearchImage,
  },
  {
    id: "notion",
    name: "Notion",
    description: "Create, search, update and organize your notes, docs, and knowledge base",
    iconText: "N",
    iconVariant: "notion",
    image: notionImage,
  },
  {
    id: "trello",
    name: "Trello",
    description: "Track tasks, update boards and manage projects without opening Trello",
    iconText: "T",
    iconVariant: "trello",
    image: trelloImage,
  },
  {
    id: "apple-notes",
    name: "Apple Notes",
    description: "Create, search and organize notes without leaving your keyboard",
    iconText: "",
    iconVariant: "apple",
    image: notesIcon,
  },
  {
    id: "apple-reminders",
    name: "Apple Reminders",
    description: "Add, list and complete reminders without opening the Reminders app",
    iconText: "✓",
    iconVariant: "reminders",
    image: remindersImage,
  },
  {
    id: "obsidian",
    name: "Obsidian",
    description: "Work with your Obsidian vaults from the terminal (search, create, move, delete)",
    iconText: "💎",
    iconVariant: "obsidian",
    image: obsidianImage,
  },
  {
    id: "github",
    name: "GitHub",
    description: "Work with issues, pull requests, and workflows via the bundled gh CLI",
    iconText: "🐙",
    iconVariant: "github",
    image: githubImage,
  },
  {
    id: "slack",
    name: "Slack",
    description: "Send messages, react, and manage pins in your Slack workspace",
    iconText: "S",
    iconVariant: "slack",
    image: slackImage,
  },
  {
    id: "gemini",
    name: "Gemini",
    description: "Interact with Google's Gemini models and experiment with powerful multimodal AI",
    iconText: "✦",
    iconVariant: "gemini",
    image: geminiImage,
  },
  {
    id: "nano-banana",
    name: "Nano Banana",
    description: "Generate high-quality images with modern image models",
    iconText: "NB",
    iconVariant: "nano-banana",
    image: nanoBananaImage,
  },
  {
    id: "sag",
    name: "Sag",
    description: "Elevate your text-to-speech tool",
    iconText: "Ⅱ",
    iconVariant: "sag",
    image: sagImage,
  },
];

// ---------- SkillCta (connect button / connected badge / disabled badge / coming-soon) ----------

function SkillCta({
  status,
  onConnect,
  onSettings,
}: {
  status: SkillStatus;
  onConnect?: () => void;
  onSettings?: () => void;
}) {
  if (status === "connected") {
    return (
      <div className="UiSkillConnectButtonContainer">
        <div className="UiSkillConnectButton UiSkillConnectButtonConfigure">Connected</div>
        <button
          type="button"
          className="UiSkillConnectButton UiSkillConnectButtonConfigure UiSkillConnectButtonCircle"
          aria-label="Connected — click to configure"
          onClick={onSettings}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={20}
            height={20}
            fill="none"
            viewBox="0 0 20 20"
          >
            <path
              stroke="#fff"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2.08"
              d="M10 10zM5 9.99zM15 10z"
            />
          </svg>
        </button>
      </div>
    );
  }
  if (status === "disabled") {
    return (
      <button
        type="button"
        className="UiSkillStatus UiSkillStatus--disabled UiSkillStatus--clickable"
        aria-label="Disabled — click to configure"
        onClick={onSettings}
      >
        Disabled
      </button>
    );
  }
  if (status === "coming-soon") {
    return (
      <span className="UiSkillStatus UiSkillStatus--soon" aria-label="Coming soon">
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

// ---------- Main tab component ----------

export function SkillsIntegrationsTab(props: {
  state: Extract<GatewayState, { kind: "ready" }>;
  gw: GatewayRpc;
  configSnap: ConfigSnapshotLike | null;
  reload: () => Promise<void>;
  onError: (value: string | null) => void;
}) {
  const { statuses, markConnected, markDisabled, refresh, loadConfig } = useSkillsStatus({
    gw: props.gw,
    configSnap: props.configSnap,
    reload: props.reload,
  });

  const [activeModal, setActiveModal] = React.useState<SkillId | null>(null);

  const openModal = React.useCallback((skillId: SkillId) => {
    setActiveModal(skillId);
  }, []);

  const closeModal = React.useCallback(() => {
    setActiveModal(null);
  }, []);

  /** Called by modal content after a successful connection. */
  const handleConnected = React.useCallback(
    (skillId: SkillId) => {
      markConnected(skillId);
      void refresh();
      setActiveModal(null);
    },
    [markConnected, refresh]
  );

  /** Called by modal content after disabling a skill. */
  const handleDisabled = React.useCallback(
    async (skillId: SkillId) => {
      props.onError(null);
      try {
        await disableSkill(props.gw, loadConfig, skillId);
        markDisabled(skillId);
        void refresh();
        setActiveModal(null);
      } catch (err) {
        props.onError(String(err));
      }
    },
    [loadConfig, markDisabled, props, refresh]
  );

  /** Tile card class based on status. */
  const tileClass = (status: SkillStatus) => {
    if (status === "disabled") return "UiSkillCard UiSkillCard--disabled";
    return "UiSkillCard";
  };

  return (
    <div className="UiSettingsContentInner">
      <div className="UiSettingsTabTitle">Skills and Integrations</div>

      <div className="UiSkillsScroll" style={{ maxHeight: "none" }}>
        <div className="UiSkillsGrid">
          {SKILLS.map((skill) => {
            const status = statuses[skill.id];
            const isInteractive = status !== "coming-soon";
            return (
              <div
                key={skill.id}
                className={tileClass(status)}
                role="group"
                aria-label={skill.name}
              >
                <div className="UiSkillTopRow">
                  <span className={`UiSkillIcon`} aria-hidden="true">
                    {skill.image ? <img src={skill.image} alt="" /> : skill.iconText}
                    {status === "connected" ? (
                      <span className="UiProviderTileCheck" aria-label="Key configured">
                        ✓
                      </span>
                    ) : null}
                  </span>
                  <div className="UiSkillTopRight">
                    <SkillCta
                      status={status}
                      onConnect={isInteractive ? () => openModal(skill.id) : undefined}
                      onSettings={isInteractive ? () => openModal(skill.id) : undefined}
                    />
                  </div>
                </div>
                <div className="UiSkillName">{skill.name}</div>
                <div className="UiSkillDescription">{skill.description}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Skill configuration modals ────────────────────────── */}
      <Modal
        open={activeModal === "google-workspace"}
        onClose={closeModal}
        aria-label="Google Workspace settings"
        header={"Google Workspace"}
      >
        <GoogleWorkspaceModalContent
          isConnected={statuses["google-workspace"] === "connected"}
          onConnected={() => handleConnected("google-workspace")}
          onDisabled={() => void handleDisabled("google-workspace")}
        />
      </Modal>

      <Modal
        open={activeModal === "notion"}
        header={"Notion"}
        onClose={closeModal}
        aria-label="Notion settings"
      >
        <NotionModalContent
          gw={props.gw}
          loadConfig={loadConfig}
          isConnected={statuses.notion === "connected"}
          onConnected={() => handleConnected("notion")}
          onDisabled={() => void handleDisabled("notion")}
        />
      </Modal>

      <Modal
        open={activeModal === "trello"}
        header={"Trello"}
        onClose={closeModal}
        aria-label="Trello settings"
      >
        <TrelloModalContent
          gw={props.gw}
          loadConfig={loadConfig}
          isConnected={statuses.trello === "connected"}
          onConnected={() => handleConnected("trello")}
          onDisabled={() => void handleDisabled("trello")}
        />
      </Modal>

      <Modal
        open={activeModal === "github"}
        header={"GitHub"}
        onClose={closeModal}
        aria-label="GitHub settings"
      >
        <GitHubModalContent
          gw={props.gw}
          loadConfig={loadConfig}
          isConnected={statuses.github === "connected"}
          onConnected={() => handleConnected("github")}
          onDisabled={() => void handleDisabled("github")}
        />
      </Modal>

      <Modal
        open={activeModal === "web-search"}
        onClose={closeModal}
        aria-label="Web Search settings"
        header={"Web Search"}
      >
        <WebSearchModalContent
          gw={props.gw}
          loadConfig={loadConfig}
          isConnected={statuses["web-search"] === "connected"}
          onConnected={() => handleConnected("web-search")}
          onDisabled={() => void handleDisabled("web-search")}
        />
      </Modal>

      <Modal
        open={activeModal === "media-understanding"}
        onClose={closeModal}
        aria-label="Media Understanding settings"
        header={"Media Understanding"}
      >
        <MediaUnderstandingModalContent
          gw={props.gw}
          loadConfig={loadConfig}
          isConnected={statuses["media-understanding"] === "connected"}
          onConnected={() => handleConnected("media-understanding")}
          onDisabled={() => void handleDisabled("media-understanding")}
        />
      </Modal>

      <Modal
        open={activeModal === "slack"}
        onClose={closeModal}
        aria-label="Slack settings"
        header={"Slack"}
      >
        <SlackModalContent
          gw={props.gw}
          loadConfig={loadConfig}
          isConnected={statuses.slack === "connected"}
          onConnected={() => handleConnected("slack")}
          onDisabled={() => void handleDisabled("slack")}
        />
      </Modal>

      <Modal
        open={activeModal === "obsidian"}
        header={"Obsidian"}
        onClose={closeModal}
        aria-label="Obsidian settings"
      >
        <ObsidianModalContent
          gw={props.gw}
          loadConfig={loadConfig}
          isConnected={statuses.obsidian === "connected"}
          onConnected={() => handleConnected("obsidian")}
          onDisabled={() => void handleDisabled("obsidian")}
        />
      </Modal>

      <Modal
        open={activeModal === "apple-notes"}
        onClose={closeModal}
        aria-label="Apple Notes settings"
        header={"Apple Notes"}
      >
        <AppleNotesModalContent
          gw={props.gw}
          loadConfig={loadConfig}
          isConnected={statuses["apple-notes"] === "connected"}
          onConnected={() => handleConnected("apple-notes")}
          onDisabled={() => void handleDisabled("apple-notes")}
        />
      </Modal>

      <Modal
        open={activeModal === "apple-reminders"}
        onClose={closeModal}
        aria-label="Apple Reminders settings"
        header={"Apple Reminders"}
      >
        <AppleRemindersModalContent
          gw={props.gw}
          loadConfig={loadConfig}
          isConnected={statuses["apple-reminders"] === "connected"}
          onConnected={() => handleConnected("apple-reminders")}
          onDisabled={() => void handleDisabled("apple-reminders")}
        />
      </Modal>
    </div>
  );
}
