import React from "react";
import { Navigate, NavLink, useLocation } from "react-router-dom";
import { useGatewayRpc } from "../gateway/context";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { reloadConfig } from "../store/slices/configSlice";
import type { GatewayState } from "../../../src/main/types";
import { GlassCard, HeroPageLayout, InlineError } from "./kit";
import { ConnectorsTab } from "./settings/ConnectorsTab";
import { ModelProvidersTab } from "./settings/ModelProvidersTab";
import { SkillsIntegrationsTab } from "./settings/SkillsIntegrationsTab";

type SettingsTab = "model-providers" | "skills-integrations" | "connectors";
const DEFAULT_TAB: SettingsTab = "model-providers";

function SettingsNavItem(props: { to: SettingsTab; children: React.ReactNode }) {
  return (
    <NavLink
      to={`/settings/${props.to}`}
      className={({ isActive }) => `UiSettingsNavItem${isActive ? " UiSettingsNavItem-active" : ""}`}
    >
      {props.children}
    </NavLink>
  );
}

export function SettingsPage({ state }: { state: Extract<GatewayState, { kind: "ready" }> }) {
  const [pageError, setPageError] = React.useState<string | null>(null);
  const location = useLocation();

  const dispatch = useAppDispatch();
  const configSnap = useAppSelector((s) => s.config.snap);
  const configError = useAppSelector((s) => s.config.error);
  const gw = useGatewayRpc();

  const reload = React.useCallback(async () => {
    setPageError(null);
    await dispatch(reloadConfig({ request: gw.request }));
  }, [dispatch, gw.request]);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  const activeTab: SettingsTab = React.useMemo(() => {
    // This page lives under a HashRouter; parse the current pathname defensively and
    // default to the first tab if the path is unknown.
    const path = (location.pathname || "").replace(/\/+$/, "");
    const known: SettingsTab[] = ["model-providers", "skills-integrations", "connectors"];
    for (const tab of known) {
      if (path.endsWith(`/settings/${tab}`)) {
        return tab;
      }
    }
    return DEFAULT_TAB;
  }, [location.pathname]);

  // Redirect bare /settings to /settings/model-providers so the NavLink highlights
  const needsRedirect = React.useMemo(() => {
    const path = (location.pathname || "").replace(/\/+$/, "");
    return path === "/settings";
  }, [location.pathname]);

  if (needsRedirect) {
    return <Navigate to={`/settings/${DEFAULT_TAB}`} replace />;
  }

  const error = pageError ?? configError;

  return (
    <HeroPageLayout title="SETTINGS" variant="compact" align="center" aria-label="Settings page" hideTopbar>
      <GlassCard size="wide">
        <div className="UiSettingsShell">
          <aside className="UiSettingsSidebar" aria-label="Settings navigation">
            <div className="UiSettingsNav">
              <SettingsNavItem to="model-providers">Model Providers</SettingsNavItem>
              <SettingsNavItem to="skills-integrations">Skills and Integrations</SettingsNavItem>
              <SettingsNavItem to="connectors">Connectors</SettingsNavItem>
            </div>
          </aside>

          <div className="UiSettingsContent">
            {error && <InlineError>{error}</InlineError>}
            {activeTab === "model-providers" ? (
              <ModelProvidersTab gw={gw} configSnap={configSnap ?? null} reload={reload} onError={setPageError} />
            ) : activeTab === "skills-integrations" ? (
              <SkillsIntegrationsTab
                state={state}
                gw={gw}
                configSnap={configSnap ?? null}
                reload={reload}
                onError={setPageError}
              />
            ) : (
              <ConnectorsTab gw={gw} configSnap={configSnap ?? null} reload={reload} onError={setPageError} />
            )}
          </div>
        </div>
      </GlassCard>
    </HeroPageLayout>
  );
}
