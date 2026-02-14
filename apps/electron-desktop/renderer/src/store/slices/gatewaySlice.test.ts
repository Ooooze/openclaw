/**
 * Tests for gatewaySlice — initial state and setGatewayState reducer.
 * The initGatewayState thunk depends on window.openclawDesktop which
 * is not available in unit tests; we test the reducer directly.
 */
import { describe, expect, it } from "vitest";

import { gatewayActions, gatewayReducer } from "./gatewaySlice";
import type { GatewaySliceState } from "./gatewaySlice";

// ── Initial state ──────────────────────────────────────────────────────────────

describe("gatewaySlice initial state", () => {
  it("starts with null state", () => {
    const state = gatewayReducer(undefined, { type: "@@INIT" });
    expect(state).toEqual({ state: null });
  });
});

// ── Reducers ───────────────────────────────────────────────────────────────────

describe("gatewaySlice reducers", () => {
  it("setGatewayState stores the gateway state", () => {
    const gwState = {
      kind: "ready" as const,
      port: 18789,
      logsDir: "/tmp/logs",
      url: "http://localhost:18789",
      token: "tok",
    };
    const state = gatewayReducer(
      { state: null },
      gatewayActions.setGatewayState(gwState)
    );
    expect(state.state).toEqual(gwState);
  });

  it("setGatewayState accepts null", () => {
    const base: GatewaySliceState = {
      state: {
        kind: "ready",
        port: 18789,
        logsDir: "/tmp/logs",
        url: "http://localhost:18789",
        token: "tok",
      },
    };
    const state = gatewayReducer(base, gatewayActions.setGatewayState(null));
    expect(state.state).toBeNull();
  });

  it("setGatewayState updates from starting to ready", () => {
    const starting: GatewaySliceState = {
      state: {
        kind: "starting",
        port: 18789,
        logsDir: "/tmp/logs",
        token: "tok",
      },
    };
    const ready = {
      kind: "ready" as const,
      port: 18789,
      logsDir: "/tmp/logs",
      url: "http://localhost:18789",
      token: "tok",
    };
    const state = gatewayReducer(starting, gatewayActions.setGatewayState(ready));
    expect(state.state?.kind).toBe("ready");
  });

  it("setGatewayState stores failed state", () => {
    const failed = {
      kind: "failed" as const,
      port: 18789,
      logsDir: "/tmp/logs",
      details: "port in use",
      token: "tok",
    };
    const state = gatewayReducer({ state: null }, gatewayActions.setGatewayState(failed));
    expect(state.state?.kind).toBe("failed");
  });
});
