import React from "react";

import { ActionButton, InlineError } from "../../kit";
import { useWelcomeObsidian } from "../../onboarding/welcome/useWelcomeObsidian";
import type { ConfigSnapshot, GatewayRpcLike } from "../../onboarding/welcome/types";

type ObsidianVault = {
  name: string;
  path: string;
  open: boolean;
};

export function ObsidianModalContent(props: {
  gw: GatewayRpcLike;
  loadConfig: () => Promise<ConfigSnapshot>;
  isConnected: boolean;
  onConnected: () => void;
  onDisabled: () => void;
}) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<string | null>(null);
  const [vaults, setVaults] = React.useState<ObsidianVault[]>([]);
  const [vaultsLoading, setVaultsLoading] = React.useState(false);
  const [selectedVault, setSelectedVault] = React.useState("");

  const { enableObsidian } = useWelcomeObsidian({
    gw: props.gw,
    loadConfig: props.loadConfig,
    setError,
    setStatus,
  });

  // Load vaults on mount.
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const api = window.openclawDesktop;
      if (!api) return;
      setVaultsLoading(true);
      try {
        const res = await api.obsidianVaultsList();
        if (cancelled) return;
        if (!res.ok) {
          setError(res.stderr?.trim() || res.stdout?.trim() || "Failed to list Obsidian vaults");
          return;
        }
        const parsed = JSON.parse(res.stdout || "[]") as unknown;
        const list: ObsidianVault[] = Array.isArray(parsed)
          ? parsed
              .map((v) => {
                if (!v || typeof v !== "object" || Array.isArray(v)) return null;
                const o = v as { name?: unknown; path?: unknown; open?: unknown };
                const name = typeof o.name === "string" ? o.name : "";
                const vaultPath = typeof o.path === "string" ? o.path : "";
                const open = o.open === true;
                if (!name || !vaultPath) return null;
                return { name, path: vaultPath, open };
              })
              .filter((v): v is ObsidianVault => Boolean(v))
          : [];
        setVaults(list);
        const openVault = list.find((v) => v.open);
        setSelectedVault(openVault?.name || list[0]?.name || "");
      } catch (err) {
        if (!cancelled) setError(String(err));
      } finally {
        if (!cancelled) setVaultsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCheckAndEnable = React.useCallback(async () => {
    setBusy(true);
    setError(null);
    setStatus("Checking obsidian-cli…");
    try {
      const api = window.openclawDesktop;
      if (!api) throw new Error("Desktop API not available");

      const checkRes = await api.obsidianCliCheck();
      if (!checkRes.ok) {
        throw new Error(
          checkRes.stderr?.trim() || checkRes.stdout?.trim() || "obsidian-cli check failed"
        );
      }

      if (selectedVault) {
        setStatus("Setting default vault…");
        const setRes = await api.obsidianCliSetDefault({ vaultName: selectedVault });
        if (!setRes.ok) {
          throw new Error(
            setRes.stderr?.trim() || setRes.stdout?.trim() || "Failed to set default vault"
          );
        }
      }

      const resolvedPath = checkRes.resolvedPath ?? null;
      await enableObsidian({ obsidianCliResolvedPath: resolvedPath });

      setStatus("Checking default vault…");
      const defaultRes = await api.obsidianCliPrintDefaultPath();
      if (defaultRes.ok) {
        props.onConnected();
        return;
      }
      // Keep skill enabled but alert about missing default vault.
      setStatus('Obsidian enabled. Set a default vault, then click "Check & enable" again.');
    } catch (err) {
      setError(String(err));
      setStatus(null);
    } finally {
      setBusy(false);
    }
  }, [enableObsidian, props, selectedVault]);

  return (
    <div className="UiSkillModalContent">
      <div className="UiSectionTitle">Obsidian</div>
      <div className="UiSectionSubtitle">
        Work with your Obsidian vaults from the terminal (search, create, move, delete).
      </div>
      {error && <InlineError>{error}</InlineError>}
      {status && <div className="UiSkillModalStatus">{status}</div>}

      {vaultsLoading ? (
        <div className="UiSkillModalStatus">Loading vaults…</div>
      ) : vaults.length > 0 ? (
        <div className="UiSkillModalField">
          <label className="UiSkillModalLabel">Default vault</label>
          <select
            className="UiSkillModalSelect"
            value={selectedVault}
            onChange={(e) => setSelectedVault(e.target.value)}
          >
            {vaults.map((v) => (
              <option key={v.name} value={v.name}>
                {v.name}
                {v.open ? " (open)" : ""}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="UiSkillModalStatus">No Obsidian vaults found.</div>
      )}

      <div className="UiSkillModalActions">
        <ActionButton variant="primary" disabled={busy} onClick={() => void handleCheckAndEnable()}>
          {busy ? "Enabling…" : "Check & enable"}
        </ActionButton>
      </div>

      {props.isConnected && (
        <div className="UiSkillModalDangerZone">
          <button
            type="button"
            className="UiSkillModalDisableButton"
            disabled={busy}
            onClick={props.onDisabled}
          >
            Disable
          </button>
        </div>
      )}
    </div>
  );
}
