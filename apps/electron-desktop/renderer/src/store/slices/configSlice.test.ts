/**
 * Tests for configSlice — initial state, reducers, reloadConfig thunk.
 */
import { configureStore } from "@reduxjs/toolkit";
import { describe, expect, it, vi } from "vitest";

import {
  type ConfigSliceState,
  configActions,
  configReducer,
  reloadConfig,
} from "./configSlice";

// ── Initial state ──────────────────────────────────────────────────────────────

describe("configSlice initial state", () => {
  it("starts with null snapshot, idle status, no error", () => {
    const state = configReducer(undefined, { type: "@@INIT" });
    expect(state).toEqual({
      snap: null,
      status: "idle",
      error: null,
    });
  });
});

// ── Reducers ───────────────────────────────────────────────────────────────────

describe("configSlice reducers", () => {
  const base: ConfigSliceState = { snap: null, status: "idle", error: null };

  it("setStatus updates status", () => {
    const state = configReducer(base, configActions.setStatus("loading"));
    expect(state.status).toBe("loading");
  });

  it("setError sets and clears error", () => {
    const state = configReducer(base, configActions.setError("fail"));
    expect(state.error).toBe("fail");
    const state2 = configReducer(state, configActions.setError(null));
    expect(state2.error).toBeNull();
  });

  it("setSnapshot stores config snapshot", () => {
    const snap = { path: "/config.yaml", exists: true, valid: true, config: { key: "val" } };
    const state = configReducer(base, configActions.setSnapshot(snap));
    expect(state.snap).toEqual(snap);
  });

  it("setSnapshot accepts null", () => {
    const withSnap: ConfigSliceState = {
      ...base,
      snap: { path: "/config.yaml", exists: true },
    };
    const state = configReducer(withSnap, configActions.setSnapshot(null));
    expect(state.snap).toBeNull();
  });
});

// ── reloadConfig thunk ─────────────────────────────────────────────────────────

function createTestStore() {
  return configureStore({
    reducer: { config: configReducer },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredActionPaths: ["meta.arg.request"],
        },
      }),
  });
}

describe("reloadConfig thunk", () => {
  it("sets status to ready and stores snapshot on success", async () => {
    const store = createTestStore();
    const snap = { path: "/conf.yaml", exists: true, valid: true, config: {} };
    const mockRequest = vi.fn().mockResolvedValue(snap);

    await store.dispatch(reloadConfig({ request: mockRequest }));

    const state = store.getState().config;
    expect(state.status).toBe("ready");
    expect(state.snap).toEqual(snap);
    expect(state.error).toBeNull();
  });

  it("sets status to error on failure", async () => {
    const store = createTestStore();
    const mockRequest = vi.fn().mockRejectedValue(new Error("gateway down"));

    await store.dispatch(reloadConfig({ request: mockRequest }));

    const state = store.getState().config;
    expect(state.status).toBe("error");
    expect(state.error).toContain("gateway down");
  });
});
