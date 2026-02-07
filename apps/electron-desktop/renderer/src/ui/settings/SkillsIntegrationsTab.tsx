import React from "react";

import { Modal } from "../kit";
import type { GatewayState } from "../../../../src/main/types";
import { useSkillsStatus, disableSkill, type SkillId, type SkillStatus } from "./useSkillsStatus";
import {
  GoogleWorkspaceModalContent,
  NotionModalContent,
  TrelloModalContent,
  GitHubModalContent,
  WebSearchModalContent,
  MediaUnderstandingModalContent,
  SlackModalContent,
  ObsidianModalContent,
  AppleNotesModalContent,
  AppleRemindersModalContent,
} from "./skill-modals";

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
};

const SKILLS: SkillDefinition[] = [
  {
    id: "google-workspace",
    name: "Google Workspace",
    description: "Clears your inbox, sends emails, and manages your calendar",
    iconText: "G",
    iconVariant: "google",
  },
  {
    id: "media-understanding",
    name: "Media Understanding",
    description: "Transcribe voice messages, describe images, and summarize videos you send",
    iconText: "M",
    iconVariant: "nano-banana",
  },
  {
    id: "web-search",
    name: "Web Search",
    description: "Enable the web_search tool via Brave Search or Perplexity Sonar",
    iconText: "🌐",
    iconVariant: "gemini",
  },
  {
    id: "notion",
    name: "Notion",
    description: "Create, search, update and organize your notes, docs, and knowledge base",
    iconText: "N",
    iconVariant: "notion",
  },
  {
    id: "trello",
    name: "Trello",
    description: "Track tasks, update boards and manage projects without opening Trello",
    iconText: "T",
    iconVariant: "trello",
  },
  {
    id: "apple-notes",
    name: "Apple Notes",
    description: "Create, search and organize notes without leaving your keyboard",
    iconText: "",
    iconVariant: "apple",
  },
  {
    id: "apple-reminders",
    name: "Apple Reminders",
    description: "Add, list and complete reminders without opening the Reminders app",
    iconText: "✓",
    iconVariant: "reminders",
  },
  {
    id: "obsidian",
    name: "Obsidian",
    description: "Work with your Obsidian vaults from the terminal (search, create, move, delete)",
    iconText: "💎",
    iconVariant: "obsidian",
  },
  {
    id: "github",
    name: "GitHub",
    description: "Work with issues, pull requests, and workflows via the bundled gh CLI",
    iconText: "🐙",
    iconVariant: "github",
  },
  {
    id: "slack",
    name: "Slack",
    description: "Send messages, react, and manage pins in your Slack workspace",
    iconText: "S",
    iconVariant: "slack",
  },
  {
    id: "gemini",
    name: "Gemini",
    description: "Interact with Google's Gemini models and experiment with powerful multimodal AI",
    iconText: "✦",
    iconVariant: "gemini",
  },
  {
    id: "nano-banana",
    name: "Nano Banana",
    description: "Generate high-quality images with modern image models",
    iconText: "NB",
    iconVariant: "nano-banana",
  },
  {
    id: "sag",
    name: "Sag",
    description: "Elevate your text-to-speech tool",
    iconText: "Ⅱ",
    iconVariant: "sag",
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
      <button
        type="button"
        className="UiSkillStatus UiSkillStatus--connected UiSkillStatus--clickable"
        aria-label="Connected — click to configure"
        onClick={onSettings}
      >
        ✓ Connected
      </button>
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
    if (status === "connected") return "UiSkillCard UiSkillCard--connected";
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
                  <span
                    className={`UiSkillIcon UiSkillIcon--${skill.iconVariant}`}
                    aria-hidden="true"
                  >
                    {skill.iconText}
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
      >
        <GoogleWorkspaceModalContent
          isConnected={statuses["google-workspace"] === "connected"}
          onConnected={() => handleConnected("google-workspace")}
          onDisabled={() => void handleDisabled("google-workspace")}
        />
      </Modal>

      <Modal open={activeModal === "notion"} onClose={closeModal} aria-label="Notion settings">
        <NotionModalContent
          gw={props.gw}
          loadConfig={loadConfig}
          isConnected={statuses.notion === "connected"}
          onConnected={() => handleConnected("notion")}
          onDisabled={() => void handleDisabled("notion")}
        />
      </Modal>

      <Modal open={activeModal === "trello"} onClose={closeModal} aria-label="Trello settings">
        <TrelloModalContent
          gw={props.gw}
          loadConfig={loadConfig}
          isConnected={statuses.trello === "connected"}
          onConnected={() => handleConnected("trello")}
          onDisabled={() => void handleDisabled("trello")}
        />
      </Modal>

      <Modal open={activeModal === "github"} onClose={closeModal} aria-label="GitHub settings">
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
      >
        <MediaUnderstandingModalContent
          gw={props.gw}
          loadConfig={loadConfig}
          isConnected={statuses["media-understanding"] === "connected"}
          onConnected={() => handleConnected("media-understanding")}
          onDisabled={() => void handleDisabled("media-understanding")}
        />
      </Modal>

      <Modal open={activeModal === "slack"} onClose={closeModal} aria-label="Slack settings">
        <SlackModalContent
          gw={props.gw}
          loadConfig={loadConfig}
          isConnected={statuses.slack === "connected"}
          onConnected={() => handleConnected("slack")}
          onDisabled={() => void handleDisabled("slack")}
        />
      </Modal>

      <Modal open={activeModal === "obsidian"} onClose={closeModal} aria-label="Obsidian settings">
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
