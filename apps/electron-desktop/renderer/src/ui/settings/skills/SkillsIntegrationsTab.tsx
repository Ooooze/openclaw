import React from "react";
import { settingsStyles as ps } from "../SettingsPage";
import sit from "./SkillsIntegrationsTab.module.css";

import { FeatureCta, Modal, TextInput } from "../../shared/kit";
import type { GatewayState } from "../../../../../src/main/types";
import { type SkillId, type SkillStatus, useSkillsStatus } from "./useSkillsStatus";
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
} from "./modals";
import { CustomSkillMenu } from "./CustomSkillMenu";
import { CustomSkillUploadModal } from "./CustomSkillUploadModal";
import { useCustomSkills, type CustomSkillMeta } from "./useCustomSkills";
import { useSkillModal } from "./useSkillModal";

import googleImage from "../../../../../assets/set-up-skills/Google.svg";
import notionImage from "../../../../../assets/set-up-skills/Notion.svg";
import trelloImage from "../../../../../assets/set-up-skills/Trello.svg";
import geminiImage from "../../../../../assets/ai-providers/gemini.svg";
import nanoBananaImage from "../../../../../assets/set-up-skills/Nano-Banana.svg";
import sagImage from "../../../../../assets/set-up-skills/Sag.svg";
import remindersImage from "../../../../../assets/set-up-skills/Reminders.svg";
import obsidianImage from "../../../../../assets/set-up-skills/Obsidian.svg";
import githubImage from "../../../../../assets/set-up-skills/GitHub.svg";
import slackImage from "../../../../../assets/set-up-skills/Slack.svg";
import notesIcon from "../../../../../assets/set-up-skills/Notes.svg";
import mediaImage from "../../../../../assets/set-up-skills/Media.svg";
import webSearchImage from "../../../../../assets/set-up-skills/Web-Search.svg";

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
    description: "Clears your inbox, sends emails and manages your calendar",
    iconText: "G",
    iconVariant: "google",
    image: googleImage,
  },
  {
    id: "apple-notes",
    name: "Apple Notes",
    description: "Create, search and organize your notes",
    iconText: "",
    iconVariant: "apple",
    image: notesIcon,
  },
  {
    id: "apple-reminders",
    name: "Apple Reminders",
    description: "Add, list and complete your reminders",
    iconText: "✓",
    iconVariant: "reminders",
    image: remindersImage,
  },
  {
    id: "notion",
    name: "Notion",
    description: "Create, search, update and organize your Notion pages",
    iconText: "N",
    iconVariant: "notion",
    image: notionImage,
  },
  {
    id: "github",
    name: "GitHub",
    description: "Review pull requests, manage issues and workflows",
    iconText: "🐙",
    iconVariant: "github",
    image: githubImage,
  },
  {
    id: "trello",
    name: "Trello",
    description: "Track tasks, update boards and manage your projects",
    iconText: "T",
    iconVariant: "trello",
    image: trelloImage,
  },
  {
    id: "slack",
    name: "Slack",
    description: "Send messages, search info and manage pins in your workspace",
    iconText: "S",
    iconVariant: "slack",
    image: slackImage,
  },
  {
    id: "obsidian",
    name: "Obsidian",
    description: "Search and manage your Obsidian vaults",
    iconText: "💎",
    iconVariant: "obsidian",
    image: obsidianImage,
  },
  {
    id: "media-understanding",
    name: "Media Analysis",
    description: "Analyze images, audio and video from external sources",
    iconText: "M",
    iconVariant: "nano-banana",
    image: mediaImage,
  },
  {
    id: "web-search",
    name: "Advanced Web Search",
    description: "Lets the bot fetch fresh web data using external providers",
    iconText: "🌐",
    iconVariant: "gemini",
    image: webSearchImage,
  },
  {
    id: "sag",
    name: "Eleven Labs",
    description: "Create lifelike speech with AI voice generator",
    iconText: "Ⅱ",
    iconVariant: "sag",
    image: sagImage,
  },
  {
    id: "nano-banana",
    name: "Nano Banana (Images)",
    description: "Generate AI images from text prompts",
    iconText: "NB",
    iconVariant: "nano-banana",
    image: nanoBananaImage,
  },
];

// ── Main tab component ───────────────────────────────────────────────

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

  const custom = useCustomSkills(props.onError);
  const modal = useSkillModal({
    gw: props.gw,
    markConnected,
    markDisabled,
    refresh,
    loadConfig,
    onError: props.onError,
  });

  const [searchQuery, setSearchQuery] = React.useState("");

  return (
    <div className={ps.UiSettingsContentInner}>
      <div className={sit.UiSkillsTabHeader}>
        <div className={ps.UiSettingsTabTitle}>Skills and Integrations</div>
        <button
          type="button"
          className={sit.UiAddCustomSkillLink}
          onClick={() => custom.setShowUploadModal(true)}
        >
          + Add custom skill
        </button>
      </div>

      <div className="UiInputRow">
        <TextInput
          type="text"
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by skills…"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          isSearch={true}
        />
      </div>

      <SkillsGrid
        searchQuery={searchQuery}
        customSkills={custom.customSkills}
        statuses={statuses}
        onOpenModal={modal.openModal}
        onRemoveCustomSkill={custom.handleRemoveCustomSkill}
      />

      {/* ── Skill configuration modals ────────────────────────── */}
      <SkillModals
        activeModal={modal.activeModal}
        onClose={modal.closeModal}
        gw={props.gw}
        loadConfig={loadConfig}
        statuses={statuses}
        onConnected={modal.handleConnected}
        onDisabled={modal.handleDisabled}
      />

      {/* ── Custom skill upload modal ────────────────────────── */}
      <CustomSkillUploadModal
        open={custom.showUploadModal}
        onClose={() => custom.setShowUploadModal(false)}
        onInstalled={custom.handleCustomSkillInstalled}
      />
    </div>
  );
}

// ── Skills grid ──────────────────────────────────────────────────────

function SkillsGrid(props: {
  searchQuery: string;
  customSkills: CustomSkillMeta[];
  statuses: Record<SkillId, SkillStatus>;
  onOpenModal: (id: SkillId) => void;
  onRemoveCustomSkill: (dirName: string, name: string) => Promise<void>;
}) {
  const { searchQuery, customSkills, statuses, onOpenModal, onRemoveCustomSkill } = props;

  const q = searchQuery.trim().toLowerCase();
  const filteredCustom = q
    ? customSkills.filter(
        (s) => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)
      )
    : customSkills;
  const filteredBuiltin = q
    ? SKILLS.filter(
        (s) => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)
      )
    : SKILLS;
  const hasResults = filteredCustom.length > 0 || filteredBuiltin.length > 0;

  if (!hasResults) {
    return (
      <div className={sit.UiSkillsEmptyState}>
        <div className={sit.UiSkillsEmptyStateText}>
          No skills matching &quot;{searchQuery.trim()}&quot;
        </div>
      </div>
    );
  }

  const tileClass = (status: SkillStatus) => {
    if (status === "disabled") {
      return "UiSkillCard UiSkillCard--disabled";
    }
    return "UiSkillCard";
  };

  return (
    <div className="UiSkillsScroll" style={{ maxHeight: "none" }}>
      <div className="UiSkillsGrid">
        {/* Custom (user-installed) skill cards */}
        {filteredCustom.map((skill) => (
          <div
            key={`custom-${skill.dirName}`}
            className="UiSkillCard"
            role="group"
            aria-label={skill.name}
          >
            <div className="UiSkillTopRow">
              <span className={`UiSkillIcon ${sit["UiSkillIcon--custom"]}`} aria-hidden="true">
                {skill.emoji}
                <span className="UiProviderTileCheck" aria-label="Installed">
                  ✓
                </span>
              </span>
              <div className={`UiSkillTopRight ${sit["UiSkillTopRight--custom"]}`}>
                <CustomSkillMenu
                  onRemove={() => void onRemoveCustomSkill(skill.dirName, skill.name)}
                />
              </div>
            </div>
            <div className="UiSkillName">{skill.name}</div>
            <div className="UiSkillDescription">{skill.description}</div>
          </div>
        ))}

        {/* Built-in skill cards */}
        {filteredBuiltin.map((skill) => {
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
                <span className="UiSkillIcon" aria-hidden="true">
                  {skill.image ? <img src={skill.image} alt="" /> : skill.iconText}
                  {status === "connected" ? (
                    <span className="UiProviderTileCheck" aria-label="Key configured">
                      ✓
                    </span>
                  ) : null}
                </span>
                <div className="UiSkillTopRight">
                  <FeatureCta
                    status={status}
                    onConnect={isInteractive ? () => onOpenModal(skill.id) : undefined}
                    onSettings={isInteractive ? () => onOpenModal(skill.id) : undefined}
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
  );
}

// ── Skill modals ─────────────────────────────────────────────────────

function SkillModals(props: {
  activeModal: SkillId | null;
  onClose: () => void;
  gw: GatewayRpc;
  loadConfig: () => Promise<ConfigSnapshotLike>;
  statuses: Record<SkillId, SkillStatus>;
  onConnected: (id: SkillId) => void;
  onDisabled: (id: SkillId) => Promise<void>;
}) {
  const { activeModal, onClose, gw, loadConfig, statuses, onConnected, onDisabled } = props;

  const MODAL_REGISTRY: Array<{
    id: SkillId;
    header: string;
    label: string;
    render: () => React.ReactNode;
  }> = [
    {
      id: "google-workspace",
      header: "Google Workspace",
      label: "Google Workspace settings",
      render: () => (
        <GoogleWorkspaceModalContent
          isConnected={statuses["google-workspace"] === "connected"}
          onConnected={() => onConnected("google-workspace")}
          onDisabled={() => void onDisabled("google-workspace")}
        />
      ),
    },
    {
      id: "notion",
      header: "Notion",
      label: "Notion settings",
      render: () => (
        <NotionModalContent
          gw={gw}
          loadConfig={loadConfig}
          isConnected={statuses.notion === "connected"}
          onConnected={() => onConnected("notion")}
          onDisabled={() => void onDisabled("notion")}
        />
      ),
    },
    {
      id: "trello",
      header: "Trello",
      label: "Trello settings",
      render: () => (
        <TrelloModalContent
          gw={gw}
          loadConfig={loadConfig}
          isConnected={statuses.trello === "connected"}
          onConnected={() => onConnected("trello")}
          onDisabled={() => void onDisabled("trello")}
        />
      ),
    },
    {
      id: "github",
      header: "GitHub",
      label: "GitHub settings",
      render: () => (
        <GitHubModalContent
          gw={gw}
          loadConfig={loadConfig}
          isConnected={statuses.github === "connected"}
          onConnected={() => onConnected("github")}
          onDisabled={() => void onDisabled("github")}
        />
      ),
    },
    {
      id: "web-search",
      header: "Web Search",
      label: "Web Search settings",
      render: () => (
        <WebSearchModalContent
          gw={gw}
          loadConfig={loadConfig}
          isConnected={statuses["web-search"] === "connected"}
          onConnected={() => onConnected("web-search")}
          onDisabled={() => void onDisabled("web-search")}
        />
      ),
    },
    {
      id: "media-understanding",
      header: "Media Understanding",
      label: "Media Understanding settings",
      render: () => (
        <MediaUnderstandingModalContent
          gw={gw}
          loadConfig={loadConfig}
          isConnected={statuses["media-understanding"] === "connected"}
          onConnected={() => onConnected("media-understanding")}
          onDisabled={() => void onDisabled("media-understanding")}
        />
      ),
    },
    {
      id: "slack",
      header: "Slack",
      label: "Slack settings",
      render: () => (
        <SlackModalContent
          gw={gw}
          loadConfig={loadConfig}
          isConnected={statuses.slack === "connected"}
          onConnected={() => onConnected("slack")}
          onDisabled={() => void onDisabled("slack")}
        />
      ),
    },
    {
      id: "obsidian",
      header: "Obsidian",
      label: "Obsidian settings",
      render: () => (
        <ObsidianModalContent
          gw={gw}
          loadConfig={loadConfig}
          isConnected={statuses.obsidian === "connected"}
          onConnected={() => onConnected("obsidian")}
          onDisabled={() => void onDisabled("obsidian")}
        />
      ),
    },
    {
      id: "apple-notes",
      header: "Apple Notes",
      label: "Apple Notes settings",
      render: () => (
        <AppleNotesModalContent
          gw={gw}
          loadConfig={loadConfig}
          isConnected={statuses["apple-notes"] === "connected"}
          onConnected={() => onConnected("apple-notes")}
          onDisabled={() => void onDisabled("apple-notes")}
        />
      ),
    },
    {
      id: "apple-reminders",
      header: "Apple Reminders",
      label: "Apple Reminders settings",
      render: () => (
        <AppleRemindersModalContent
          gw={gw}
          loadConfig={loadConfig}
          isConnected={statuses["apple-reminders"] === "connected"}
          onConnected={() => onConnected("apple-reminders")}
          onDisabled={() => void onDisabled("apple-reminders")}
        />
      ),
    },
  ];

  return (
    <>
      {MODAL_REGISTRY.map((entry) => (
        <Modal
          key={entry.id}
          open={activeModal === entry.id}
          onClose={onClose}
          aria-label={entry.label}
          header={entry.header}
        >
          {entry.render()}
        </Modal>
      ))}
    </>
  );
}
