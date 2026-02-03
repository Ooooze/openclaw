import React from "react";
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { ChatPage } from "./ChatPage";
import { SettingsPage } from "./SettingsPage";
import { WelcomePage } from "./WelcomePage";
import { ConsentScreen, type ConsentDesktopApi } from "./ConsentScreen";
import { LoadingScreen } from "./LoadingScreen";
import { Brand, ToolbarButton } from "./kit";
import { GatewayRpcProvider } from "../gateway/context";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { initGatewayState } from "../store/slices/gatewaySlice";
import { loadOnboardingFromStorage } from "../store/slices/onboardingSlice";
import type { GatewayState } from "../../../src/main/types";
import { isBootstrapPath, routes } from "./routes";

function Topbar() {
  const api = window.openclawDesktop;
  return (
    <div className="UiAppTopbar">
      <Brand text="ATOMIC BOT" />
      <div className="UiAppTopbarNav">
        <NavLink
          to={routes.legacy}
          className={({ isActive }) => `UiNavLink${isActive ? " UiNavLink-active" : ""}`}
        >
          Legacy
        </NavLink>
        <NavLink
          to={routes.chat}
          className={({ isActive }) => `UiNavLink${isActive ? " UiNavLink-active" : ""}`}
        >
          Chat
        </NavLink>
        <NavLink
          to={routes.settings}
          className={({ isActive }) => `UiNavLink${isActive ? " UiNavLink-active" : ""}`}
        >
          Settings
        </NavLink>
      </div>
      <div className="UiAppTopbarActions">
        <ToolbarButton
          onClick={() => {
            void api?.openLogs();
          }}
        >
          Open logs
        </ToolbarButton>
        <ToolbarButton
          onClick={() => {
            void api?.toggleDevTools();
          }}
        >
          DevTools
        </ToolbarButton>
        <ToolbarButton
          variant="primary"
          onClick={() => {
            void api?.retry();
          }}
        >
          Retry
        </ToolbarButton>
      </div>
    </div>
  );
}

function ErrorScreen({ state }: { state: Extract<GatewayState, { kind: "failed" }> }) {
  return (
    <div className="Centered">
      <div className="Card">
        <div className="CardTitle">OpenClaw Gateway failed to start</div>
        <div className="CardSubtitle">
          The Gateway process did not become available. Open the logs to see the root cause.
        </div>
        <div className="Meta">
          <div className="Pill">port: {state.port}</div>
          <div className="Pill">logs: {state.logsDir}</div>
        </div>
        <pre>{state.details || "No details."}</pre>
      </div>
    </div>
  );
}

function LegacyScreen({ state }: { state: Extract<GatewayState, { kind: "ready" }> }) {
  const legacyUrl = React.useMemo(() => {
    const base = state.url.endsWith("/") ? state.url : `${state.url}/`;
    const token = encodeURIComponent(state.token);
    // When the gateway Control UI basePath is empty (default), the legacy UI lives at
    // /overview, /chat, ... and /ui/* is explicitly 404'd by the gateway.
    // The legacy UI supports ?token=... (see ui navigation tests).
    return `${base}overview?token=${token}`;
  }, [state.url, state.token]);
  return (
    <div className="IframeWrap">
      <iframe title="OpenClaw Control UI" src={legacyUrl} />
    </div>
  );
}

function BootstrapRoutes({ state }: { state: GatewayState | null }) {
  return (
    <Routes>
      <Route path={routes.loading} element={<LoadingScreen state={state} />} />
      <Route
        path={routes.error}
        element={state?.kind === "failed" ? <ErrorScreen state={state} /> : <Navigate to={routes.loading} replace />}
      />
      <Route path="*" element={<Navigate to={routes.loading} replace />} />
    </Routes>
  );
}

function ReadyRoutes({ state }: { state: Extract<GatewayState, { kind: "ready" }> }) {
  return (
    <GatewayRpcProvider url={state.url} token={state.token}>
      <Routes>
        <Route path={routes.loading} element={<LoadingScreen state={state} />} />
        <Route path={routes.error} element={<Navigate to={routes.chat} replace />} />
        <Route path={routes.welcome} element={<WelcomePage state={state} />} />
        <Route path={routes.legacy} element={<LegacyScreen state={state} />} />
        <Route path={routes.chat} element={<ChatPage state={state} />} />
        <Route path={routes.settings} element={<SettingsPage state={state} />} />
        <Route path="*" element={<Navigate to={routes.chat} replace />} />
      </Routes>
    </GatewayRpcProvider>
  );
}

export function App() {
  const dispatch = useAppDispatch();
  const state = useAppSelector((s) => s.gateway.state);
  const onboarded = useAppSelector((s) => s.onboarding.onboarded);
  const navigate = useNavigate();
  const location = useLocation();
  const didAutoNavRef = React.useRef(false);
  const [consent, setConsent] = React.useState<"unknown" | "required" | "accepted">("unknown");

  React.useEffect(() => {
    void dispatch(initGatewayState());
    void dispatch(loadOnboardingFromStorage());
  }, [dispatch]);

  React.useEffect(() => {
    const api = window.openclawDesktop as ConsentDesktopApi | undefined;
    let alive = true;
    (async () => {
      try {
        const info = await api?.getConsentInfo();
        const accepted = info?.accepted === true;
        if (alive) {
          setConsent(accepted ? "accepted" : "required");
        }
      } catch {
        if (alive) {
          setConsent("required");
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  React.useEffect(() => {
    if (consent !== "accepted") {
      return;
    }
    if (!state) {
      return;
    }
    if (state.kind === "ready") {
      // Only auto-navigate once (first time we become ready), and only if the user
      // is still on the bootstrap screens. Otherwise, user navigation would be
      // overridden on every render.
      if (didAutoNavRef.current) {
        return;
      }
      const path = location.pathname || "/";
      const isBootstrap = isBootstrapPath(path);
      if (isBootstrap) {
        didAutoNavRef.current = true;
        navigate(onboarded ? routes.chat : routes.welcome, { replace: true });
      }
      return;
    }
    if (state.kind === "failed") {
      navigate(routes.error, { replace: true });
    }
    if (state.kind === "starting") {
      navigate(routes.loading, { replace: true });
    }
  }, [state, consent, onboarded, navigate, location.pathname]);

  if (consent !== "accepted") {
    // While consent is loading, keep showing the splash to avoid a flash of unstyled content.
    if (consent === "unknown") {
      return <LoadingScreen state={null} />;
    }
    return (
      <ConsentScreen
        onAccepted={() => {
          setConsent("accepted");
          // Avoid getting stuck on /loading when gateway is already ready.
          if (state?.kind === "ready") {
            navigate(onboarded ? routes.chat : routes.welcome, { replace: true });
            return;
          }
          if (state?.kind === "failed") {
            navigate(routes.error, { replace: true });
            return;
          }
          navigate(routes.loading, { replace: true });
        }}
      />
    );
  }

  // Render the loading screen outside the App shell so it has no header/topbar.
  if (location.pathname === routes.loading) {
    return <LoadingScreen state={state ?? null} />;
  }

  return (
    <div className="UiAppShell">
      <Topbar />
      <div className="UiAppPage">
        {state?.kind === "ready" ? <ReadyRoutes state={state} /> : <BootstrapRoutes state={state} />}
      </div>
    </div>
  );
}

