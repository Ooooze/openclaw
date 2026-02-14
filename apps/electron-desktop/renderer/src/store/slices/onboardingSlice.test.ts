/**
 * Tests for onboardingSlice — initial state, reducers, and thunks.
 */
import { configureStore } from "@reduxjs/toolkit";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  loadOnboardingFromStorage,
  onboardingActions,
  onboardingReducer,
  setOnboarded,
} from "./onboardingSlice";

// ── Initial state ──────────────────────────────────────────────────────────────

describe("onboardingSlice initial state", () => {
  it("starts with onboarded: false", () => {
    const state = onboardingReducer(undefined, { type: "@@INIT" });
    expect(state).toEqual({ onboarded: false });
  });
});

// ── Reducers ───────────────────────────────────────────────────────────────────

describe("onboardingSlice reducers", () => {
  it("setOnboardedState sets true", () => {
    const state = onboardingReducer(
      { onboarded: false },
      onboardingActions.setOnboardedState(true)
    );
    expect(state.onboarded).toBe(true);
  });

  it("setOnboardedState sets false", () => {
    const state = onboardingReducer(
      { onboarded: true },
      onboardingActions.setOnboardedState(false)
    );
    expect(state.onboarded).toBe(false);
  });
});

// ── Thunks ─────────────────────────────────────────────────────────────────────

function createTestStore() {
  return configureStore({
    reducer: { onboarding: onboardingReducer },
  });
}

// Minimal localStorage shim for tests running in node environment
const storageMap = new Map<string, string>();
const localStorageShim = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, val: string) => storageMap.set(key, val),
  removeItem: (key: string) => storageMap.delete(key),
};

describe("onboarding thunks", () => {
  beforeEach(() => {
    storageMap.clear();
    // @ts-expect-error - shimming localStorage for node env
    globalThis.localStorage = localStorageShim;
  });

  afterEach(() => {
    storageMap.clear();
  });

  it("loadOnboardingFromStorage reads true from localStorage", async () => {
    storageMap.set("openclaw.desktop.onboarded.v1", "1");
    const store = createTestStore();

    await store.dispatch(loadOnboardingFromStorage());

    expect(store.getState().onboarding.onboarded).toBe(true);
  });

  it("loadOnboardingFromStorage defaults to false when not set", async () => {
    const store = createTestStore();

    await store.dispatch(loadOnboardingFromStorage());

    expect(store.getState().onboarding.onboarded).toBe(false);
  });

  it("setOnboarded(true) writes to localStorage and updates state", async () => {
    const store = createTestStore();

    await store.dispatch(setOnboarded(true));

    expect(store.getState().onboarding.onboarded).toBe(true);
    expect(storageMap.get("openclaw.desktop.onboarded.v1")).toBe("1");
  });

  it("setOnboarded(false) removes from localStorage and updates state", async () => {
    storageMap.set("openclaw.desktop.onboarded.v1", "1");
    const store = createTestStore();

    await store.dispatch(setOnboarded(false));

    expect(store.getState().onboarding.onboarded).toBe(false);
    expect(storageMap.has("openclaw.desktop.onboarded.v1")).toBe(false);
  });
});
