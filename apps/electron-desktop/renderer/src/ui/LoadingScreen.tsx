import React from "react";

import type { GatewayState } from "../../../src/main/types";

export function LoadingScreen({ state: _state }: { state: GatewayState | null }) {
  const splashLogoUrl = React.useMemo(() => {
    // Renderer lives at renderer/dist/index.html; the app's assets are at ../../assets/
    return new URL("../../assets/icon-simple-splash.png", document.baseURI).toString();
  }, []);

  return (
    <div className="GatewaySplash" role="status" aria-live="polite">
      <div className="GatewaySplashInner">
        <img className="GatewaySplashLogo" src={splashLogoUrl} alt="" aria-hidden="true" />

        <div className="GatewaySplashDots" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>

        <div className="GatewaySplashText">Please stand by....</div>
      </div>
    </div>
  );
}

