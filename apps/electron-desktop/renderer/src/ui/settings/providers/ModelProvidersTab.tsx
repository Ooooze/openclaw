import React from "react";
import { NavLink } from "react-router-dom";
import { settingsStyles as ps } from "../SettingsPage";

import { Modal, TextInput } from "../../shared/kit";
import mp from "./ModelProvidersTab.module.css";
import {
  MODEL_PROVIDER_BY_ID,
  MODEL_PROVIDERS,
  type ModelProvider,
  resolveProviderIconUrl,
} from "../../shared/models/providers";
import {
  formatModelMeta,
  getModelTier,
  type ModelEntry,
  TIER_INFO,
} from "../../shared/models/modelPresentation";
import type { ConfigData } from "../../../store/slices/configSlice";
import { ProviderTile } from "./ProviderTile";
import { ApiKeyModalContent } from "./ApiKeyModalContent";
import { useModelProvidersState } from "./useModelProvidersState";

type GatewayRpc = {
  request: <T = unknown>(method: string, params?: unknown) => Promise<T>;
};

type ConfigSnapshotLike = {
  hash?: string;
  config?: ConfigData;
};

// ── Main tab component ───────────────────────────────────────────────
export function ModelProvidersTab(props: {
  view: "models" | "providers";
  gw: GatewayRpc;
  configSnap: ConfigSnapshotLike | null;
  reload: () => Promise<void>;
  onError: (value: string | null) => void;
}) {
  const { view } = props;
  const state = useModelProvidersState(props);

  const title = view === "models" ? "AI Models" : "Providers & API Keys";

  return (
    <div className={ps.UiSettingsContentInner}>
      <div className={ps.UiSettingsTabTitle}>{title}</div>

      {view === "models" ? (
        <ModelsView state={state} />
      ) : (
        <ProvidersView state={state} />
      )}

      {/* ── API key modal ──────────────────────────────── */}
      <Modal
        open={!!state.modalProviderInfo}
        onClose={() => state.setModalProvider(null)}
        aria-label="Enter API key"
      >
        {state.modalProviderInfo ? (
          <ApiKeyModalContent
            provider={state.modalProviderInfo}
            busy={state.busyProvider === state.modalProviderInfo.id}
            onSave={(key) => void state.saveProviderApiKey(state.modalProviderInfo!.id, key)}
            onPaste={state.pasteFromClipboard}
            onClose={() => state.setModalProvider(null)}
          />
        ) : null}
      </Modal>
    </div>
  );
}

// ── Models sub-view ──────────────────────────────────────────────────

function ModelsView(props: { state: ReturnType<typeof useModelProvidersState> }) {
  const {
    activeModelId,
    activeModelEntry,
    activeModelTier,
    activeModelMeta,
    activeProviderKey,
    activeProviderInfo,
    strictConfiguredProviders,
    sortedModels,
    visibleProviders,
    modelSearch,
    setModelSearch,
    modelsLoading,
    modelBusy,
    modelStatus,
    providerFilter,
    saveDefaultModel,
    toggleProviderFilter,
  } = props.state;

  return (
    <section className={ps.UiSettingsSection}>
      {/* Active model card */}
      {activeModelId ? (
        <div>
          <div className={mp.UiSettingsSubtitle}>Live Model</div>
          <div className={mp.UiActiveModelCard}>
            <div className={mp.UiActiveModelInfo}>
              <div className="UiProviderContent">
                <div className="UiProviderHeader">
                  <span className="UiProviderName">
                    {activeModelEntry?.name ?? activeModelId}
                  </span>
                  {activeModelTier ? (
                    <span
                      className={`UiProviderBadge UiModelTierBadge--${activeModelTier}`}
                      title={TIER_INFO[activeModelTier].description}
                    >
                      {TIER_INFO[activeModelTier].label}
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="UiProviderDescription">
                {activeProviderInfo?.name ?? activeProviderKey ?? "unknown"}
                {activeModelMeta ? ` · ${activeModelMeta}` : ""}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="UiSectionSubtitle">No model selected yet. Choose one below.</div>
      )}

      <div className={mp.UiSettingsSubtitle}>Change Model</div>
      <div className="UiInputRow">
        <TextInput
          type="text"
          value={modelSearch}
          onChange={setModelSearch}
          placeholder="Search models…"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          disabled={modelsLoading || modelBusy}
          isSearch={true}
        />
      </div>

      {/* Provider filter chips + Add Provider link */}
      <ProviderFilterChips
        strictConfiguredProviders={strictConfiguredProviders}
        providerFilter={providerFilter}
        onToggle={toggleProviderFilter}
        onClear={() => props.state.setModelSearch("")}
      />

      <ModelList
        sortedModels={sortedModels}
        visibleProviders={visibleProviders}
        strictConfiguredProviders={strictConfiguredProviders}
        modelSearch={modelSearch}
        modelsLoading={modelsLoading}
        modelBusy={modelBusy}
        activeModelId={activeModelId}
        onSelectModel={saveDefaultModel}
      />

      {modelBusy ? <div className="UiSectionSubtitle">Saving…</div> : null}
      {modelStatus ? (
        <div className="UiSectionSubtitle" style={{ marginTop: 10 }}>
          {modelStatus}
        </div>
      ) : null}
    </section>
  );
}

// ── Provider filter chips ────────────────────────────────────────────

function ProviderFilterChips(props: {
  strictConfiguredProviders: Set<ModelProvider>;
  providerFilter: ModelProvider | null;
  onToggle: (id: ModelProvider) => void;
  onClear: () => void;
}) {
  const { strictConfiguredProviders, providerFilter, onToggle } = props;

  return (
    <div className={mp.UiProviderFilterRow}>
      {strictConfiguredProviders.size > 1 ? (
        <>
          <button
            type="button"
            className={`${mp.UiProviderFilterChip}${!providerFilter ? ` ${mp["UiProviderFilterChip--active"]}` : ""}`}
            onClick={() => onToggle(providerFilter!)}
          >
            All
          </button>
          {MODEL_PROVIDERS.filter((p) => strictConfiguredProviders.has(p.id)).map((p) => {
            const active = providerFilter === p.id;
            return (
              <button
                key={p.id}
                type="button"
                className={`${mp.UiProviderFilterChip}${active ? ` ${mp["UiProviderFilterChip--active"]}` : ""}`}
                onClick={() => onToggle(p.id)}
              >
                <img
                  className={mp.UiProviderFilterChipIcon}
                  src={resolveProviderIconUrl(p.id)}
                  alt=""
                  aria-hidden="true"
                />
                {MODEL_PROVIDER_BY_ID[p.id].name}
              </button>
            );
          })}
        </>
      ) : null}
      <NavLink
        to="/settings/ai-providers"
        className={`${mp.UiProviderFilterChip} ${mp["UiProviderFilterChip--add"]}`}
      >
        + Add Provider
      </NavLink>
    </div>
  );
}

// ── Model list with grouping ─────────────────────────────────────────

function ModelList(props: {
  sortedModels: ModelEntry[];
  visibleProviders: Set<ModelProvider>;
  strictConfiguredProviders: Set<ModelProvider>;
  modelSearch: string;
  modelsLoading: boolean;
  modelBusy: boolean;
  activeModelId: string | null;
  onSelectModel: (modelId: string) => Promise<void>;
}) {
  const {
    sortedModels,
    visibleProviders,
    strictConfiguredProviders,
    modelSearch,
    modelsLoading,
    modelBusy,
    activeModelId,
    onSelectModel,
  } = props;

  if (strictConfiguredProviders.size === 0) {
    return (
      <div className="UiSectionSubtitle" style={{ marginTop: 10 }}>
        No providers configured yet.{" "}
        <NavLink to="/settings/ai-providers" className="UiLink">
          Add an API key
        </NavLink>{" "}
        to unlock model choices.
      </div>
    );
  }

  if (modelsLoading) {
    return (
      <div className="UiSectionSubtitle" style={{ marginTop: 10 }}>
        Loading models…
      </div>
    );
  }

  const q = modelSearch.trim().toLowerCase();
  const filtered = sortedModels
    .filter((m) => visibleProviders.has(m.provider as ModelProvider))
    .filter((m) => {
      if (!q) {
        return true;
      }
      return m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q);
    });

  const grouped = filtered.reduce(
    (acc: Record<string, ModelEntry[]>, m: ModelEntry) => {
      (acc[m.provider] ??= []).push(m);
      return acc;
    },
    {} as Record<string, ModelEntry[]>
  );

  const groups = Object.entries(grouped);
  if (groups.length === 0) {
    return (
      <div className="UiSectionSubtitle" style={{ marginTop: 10 }}>
        No models found for configured providers.
      </div>
    );
  }

  return (
    <div className="UiModelList" aria-label="Model list">
      {groups.map(([provider, entries]) => (
        <div key={provider} className="UiModelGroup">
          <div className="UiModelGroupTitle">{provider}</div>
          {entries.map((model) => {
            const modelKey = `${model.provider}/${model.id}`;
            const tier = getModelTier(model);
            const meta = formatModelMeta(model);
            const selected = activeModelId === modelKey;
            return (
              <label
                key={modelKey}
                className={`UiProviderOption ${selected ? "UiProviderOption--selected" : ""}`}
              >
                <input
                  type="radio"
                  name="model"
                  value={modelKey}
                  checked={selected}
                  onChange={() => void onSelectModel(modelKey)}
                  className="UiProviderRadio"
                  disabled={modelBusy}
                />
                <div className="UiProviderContent">
                  <div className="UiProviderHeader">
                    <span className="UiProviderName">{model.name || model.id}</span>
                    {tier ? (
                      <span
                        className={`UiProviderBadge UiModelTierBadge--${tier}`}
                        title={TIER_INFO[tier].description}
                      >
                        {TIER_INFO[tier].label}
                      </span>
                    ) : null}
                  </div>
                  {meta ? <div className="UiProviderDescription">{meta}</div> : null}
                </div>
              </label>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── Providers sub-view ───────────────────────────────────────────────

function ProvidersView(props: { state: ReturnType<typeof useModelProvidersState> }) {
  const { isProviderConfigured, setModalProvider } = props.state;

  return (
    <section className={ps.UiSettingsSection}>
      <div className={mp.UiProviderTilesGrid}>
        {MODEL_PROVIDERS.map((p) => (
          <ProviderTile
            key={p.id}
            provider={p}
            configured={isProviderConfigured(p.id)}
            onClick={() => setModalProvider(p.id)}
          />
        ))}
      </div>
    </section>
  );
}
