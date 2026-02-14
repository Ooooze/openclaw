import React from "react";
import { NavLink } from "react-router-dom";

import { getDesktopApiOrNull } from "../../ipc/desktopApi";
import { routes } from "../app/routes";
import s from "./OtherTab.module.css";
import pkg from "../../../../package.json";

const TERMINAL_SIDEBAR_KEY = "terminal-sidebar-visible";

export function useTerminalSidebarVisible(): [boolean, (v: boolean) => void] {
  const [visible, setVisible] = React.useState(() => {
    try {
      return localStorage.getItem(TERMINAL_SIDEBAR_KEY) === "1";
    } catch {
      return false;
    }
  });

  const toggle = React.useCallback((v: boolean) => {
    setVisible(v);
    try {
      localStorage.setItem(TERMINAL_SIDEBAR_KEY, v ? "1" : "0");
    } catch {
      // ignore
    }
    // Notify other components (Sidebar) that are already mounted.
    window.dispatchEvent(new Event("terminal-sidebar-changed"));
  }, []);

  return [visible, toggle];
}

export function OtherTab({ onError }: { onError: (msg: string | null) => void }) {
  const [launchAtStartup, setLaunchAtStartup] = React.useState(false);
  const [resetBusy, setResetBusy] = React.useState(false);
  const [terminalSidebar, setTerminalSidebar] = useTerminalSidebarVisible();

  const appVersion = pkg.version || "0.0.0";

  // Load the current launch-at-login state on mount.
  React.useEffect(() => {
    const api = getDesktopApiOrNull();
    if (!api?.getLaunchAtLogin) {return;}
    void api.getLaunchAtLogin().then((res) => setLaunchAtStartup(res.enabled));
  }, []);

  const toggleLaunchAtStartup = React.useCallback(
    async (enabled: boolean) => {
      const api = getDesktopApiOrNull();
      if (!api?.setLaunchAtLogin) {
        onError("Desktop API not available");
        return;
      }
      setLaunchAtStartup(enabled);
      try {
        await api.setLaunchAtLogin(enabled);
      } catch (err) {
        // Revert on failure.
        setLaunchAtStartup(!enabled);
        onError(String(err));
      }
    },
    [onError]
  );

  const resetAndClose = React.useCallback(async () => {
    const api = getDesktopApiOrNull();
    if (!api) {
      onError("Desktop API not available");
      return;
    }
    const ok = window.confirm(
      "All local data will be deleted and Google Workspace will be disconnected. The app will close and you’ll need to set it up again."
    );
    if (!ok) {return;}
    onError(null);
    setResetBusy(true);
    try {
      await api.resetAndClose();
    } catch (err) {
      onError(String(err));
      setResetBusy(false);
    }
  }, [onError]);

  const api = getDesktopApiOrNull();

  return (
    <div className="UiSettingsContentInner">
      <h2 className={s.UiSettingsOtherTitle}>Other</h2>

      <section className={s.UiSettingsOtherSection}>
        <h3 className={s.UiSettingsOtherSectionTitle}>OpenClaw Folder</h3>
        <div className={s.UiSettingsOtherCard}>
          <div className={s.UiSettingsOtherRow}>
            <span className={s.UiSettingsOtherRowLabel}>OpenClaw folder</span>
            <button
              type="button"
              className={s.UiSettingsOtherLink}
              onClick={() => void api?.openOpenclawFolder()}
            >
              Open folder
            </button>
          </div>
        </div>
        <p className={s.UiSettingsOtherHint}>
          Contains your local OpenClaw state and app data.
        </p>
      </section>

      <section className={s.UiSettingsOtherSection}>
        <h3 className={s.UiSettingsOtherSectionTitle}>Workspace</h3>
        <div className={s.UiSettingsOtherCard}>
          <div className={s.UiSettingsOtherRow}>
            <span className={s.UiSettingsOtherRowLabel}>Agent workspace</span>
            <button
              type="button"
              className={s.UiSettingsOtherLink}
              onClick={() => void api?.openWorkspaceFolder()}
            >
              Open folder
            </button>
          </div>
        </div>
        <p className={s.UiSettingsOtherHint}>
          Contains editable .md files (AGENTS, SOUL, USER, IDENTITY, TOOLS, HEARTBEAT, BOOTSTRAP) that shape the agent.
        </p>
      </section>

      <section className={s.UiSettingsOtherSection}>
        <h3 className={s.UiSettingsOtherSectionTitle}>Terminal</h3>
        <div className={s.UiSettingsOtherCard}>
          <div className={s.UiSettingsOtherRow}>
            <span className={s.UiSettingsOtherRowLabel}>Show in sidebar</span>
            <span className={s.UiSettingsOtherAppRowValue}>
              <label className={s.UiSettingsOtherToggle} aria-label="Show terminal in sidebar">
                <input
                  type="checkbox"
                  checked={terminalSidebar}
                  onChange={(e) => setTerminalSidebar(e.target.checked)}
                />
                <span className={s.UiSettingsOtherToggleTrack}>
                  <span className={s.UiSettingsOtherToggleThumb} />
                </span>
              </label>
            </span>
          </div>
          <div className={s.UiSettingsOtherRow}>
            <NavLink to={routes.terminal} className={s.UiSettingsOtherLink}>
              Open Terminal
            </NavLink>
          </div>
        </div>
        <p className={s.UiSettingsOtherHint}>
          Built-in terminal with openclaw and bundled tools in PATH.
        </p>
      </section>

      {/* About */}
      <section className={s.UiSettingsOtherSection}>
        <h3 className={s.UiSettingsOtherSectionTitle}>App</h3>
        <div className={s.UiSettingsOtherCard}>
          <div className={s.UiSettingsOtherRow}>
            <span className={s.UiSettingsOtherRowLabel}>Version</span>
            <span className={s.UiSettingsOtherAppRowValue}>Atomic Bot v{appVersion}</span>
          </div>

          <div className={s.UiSettingsOtherRow}>
            <span className={s.UiSettingsOtherRowLabel}>Auto start</span>
            <span className={s.UiSettingsOtherAppRowValue}>
              <label className={s.UiSettingsOtherToggle} aria-label="Launch at startup">
                <input
                  type="checkbox"
                  checked={launchAtStartup}
                  onChange={(e) => void toggleLaunchAtStartup(e.target.checked)}
                />
                <span className={s.UiSettingsOtherToggleTrack}>
                  <span className={s.UiSettingsOtherToggleThumb} />
                </span>
              </label>
            </span>
          </div>

          <div className={s.UiSettingsOtherRow}>
            <span className={s.UiSettingsOtherRowLabel}>License</span>
            <button
              type="button"
              className={s.UiSettingsOtherLink}
              onClick={() =>
                void api?.openExternal("https://polyformproject.org/licenses/noncommercial/1.0.0")
              }
            >
              PolyForm Noncommercial 1.0.0
            </button>
          </div>

          <div className={s.UiSettingsOtherRow}>
            <NavLink to={routes.legacy} className={s.UiSettingsOtherLink}>
              Legacy
            </NavLink>
          </div>
        </div>
      </section>

      {/* About */}
      <section className={s.UiSettingsOtherSection}>
        <h3 className={s.UiSettingsOtherSectionTitle}>About</h3>
        <div className={s.UiSettingsOtherCard}>
          <div className={s.UiSettingsOtherRow}>
            <span className={s.UiSettingsOtherRowLabel}>
              &copy; {new Date().getFullYear()} Atomic Bot
            </span>
          </div>
          <div className={s.UiSettingsOtherRow}>
            <span className={s.UiSettingsOtherRowLabel}>Support</span>
            <a href="mailto:support@atomicbot.ai" className={s.UiSettingsOtherLink}>
              support@atomicbot.ai
            </a>
          </div>
          <div className={s.UiSettingsOtherRow}>
            <button
              type="button"
              className={s.UiSettingsOtherLink}
              onClick={() => void api?.openExternal("https://github.com/AtomicBot-ai/atomicbot")}
            >
              GitHub
            </button>
          </div>
          <div className={s.UiSettingsOtherRow}>
            <button
              type="button"
              className={s.UiSettingsOtherLink}
              onClick={() => void api?.openExternal("https://atomicbot.ai")}
            >
              Website
            </button>
          </div>
          <div className={s.UiSettingsOtherRow}>
            <button
              type="button"
              className={s.UiSettingsOtherLink}
              onClick={() => void api?.openExternal("https://x.com/atomicbot_ai")}
            >
              X (Twitter)
            </button>
          </div>
          <div className={s.UiSettingsOtherRow}>
            <button
              type="button"
              className={s.UiSettingsOtherLink}
              onClick={() => void api?.openExternal("https://www.instagram.com/atomicbot.ai/")}
            >
              Instagram
            </button>
          </div>
          <div className={s.UiSettingsOtherRow}>
            <button
              type="button"
              className={s.UiSettingsOtherLink}
              onClick={() => void api?.openExternal("https://discord.gg/2TXafRV69m")}
            >
              Discord
            </button>
          </div>
        </div>
      </section>

      {/* Danger zone (reset) */}
      <section className={s.UiSettingsOtherSection}>
        <h3 className={s.UiSettingsOtherSectionTitle}>Account</h3>
        <h3 className={s.UiSettingsOtherDangerSubtitle}>
          This will wipe the app's local state and remove all Google Workspace authorizations. The
          app will restart.
        </h3>
        <div className={`${s.UiSettingsOtherCard} ${s["UiSettingsOtherCard--danger"]}`}>
          <div className={s.UiSettingsOtherRow}>
            <button
              type="button"
              className={s.UiSettingsOtherDangerButton}
              disabled={resetBusy}
              onClick={() => void resetAndClose()}
            >
              {resetBusy ? "Resetting..." : "Reset and sign out"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
