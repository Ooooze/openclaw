import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { GatewayState } from "../../../../src/main/types";

export type GatewaySliceState = {
  state: GatewayState | null;
};

const initialState: GatewaySliceState = {
  state: null,
};

let unsubGatewayState: (() => void) | null = null;
let didInit = false;

export const initGatewayState = createAsyncThunk("gateway/initGatewayState", async (_: void, thunkApi) => {
  // Ensure we only register a single window subscription.
  if (didInit) {
    return;
  }
  const waitForApi = async (timeoutMs: number) => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (thunkApi.signal.aborted) {
        return null;
      }
      const api = window.openclawDesktop;
      if (api) {
        return api;
      }
      await new Promise((r) => setTimeout(r, 50));
    }
    return window.openclawDesktop ?? null;
  };

  const api = await waitForApi(2_000);
  if (!api) {
    // Do not lock init if preload is not ready yet.
    return;
  }
  didInit = true;

  try {
    const info = await api.getGatewayInfo();
    thunkApi.dispatch(gatewayActions.setGatewayState(info.state ?? null));
  } catch {
    // ignore
  }

  try {
    unsubGatewayState?.();
  } catch {
    // ignore
  }
  unsubGatewayState = api.onGatewayState((next) => {
    thunkApi.dispatch(gatewayActions.setGatewayState(next));
  });
});

const gatewaySlice = createSlice({
  name: "gateway",
  initialState,
  reducers: {
    setGatewayState(state, action: PayloadAction<GatewayState | null>) {
      state.state = action.payload;
    },
  },
});

export const gatewayActions = gatewaySlice.actions;
export const gatewayReducer = gatewaySlice.reducer;

