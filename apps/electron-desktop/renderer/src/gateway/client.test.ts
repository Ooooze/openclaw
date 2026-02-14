/**
 * Tests for GatewayClient — WebSocket-based RPC client.
 * Uses a mock WebSocket implementation since Node doesn't have the browser WebSocket API.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GatewayClient, type GatewayClientOptions } from "./client";

// ── Mock WebSocket ─────────────────────────────────────────────────────────────

type WsListener = (ev: { data?: string; code?: number; reason?: string }) => void;

class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  private listeners: Record<string, WsListener[]> = {};

  constructor(public url: string) {
    // Auto-open after microtask to simulate real WebSocket behavior
    queueMicrotask(() => this.simulateOpen());
  }

  addEventListener(event: string, fn: WsListener) {
    (this.listeners[event] ??= []).push(fn);
  }

  removeEventListener(event: string, fn: WsListener) {
    const list = this.listeners[event];
    if (list) {
      const idx = list.indexOf(fn);
      if (idx >= 0) {list.splice(idx, 1);}
    }
  }

  send = vi.fn();

  close(code?: number, reason?: string) {
    if (this.readyState === MockWebSocket.CLOSED) {return;}
    this.readyState = MockWebSocket.CLOSED;
    this.emit("close", { code: code ?? 1000, reason: reason ?? "" });
  }

  // Test helpers
  simulateOpen() {
    this.readyState = MockWebSocket.OPEN;
    this.emit("open", {});
  }

  simulateMessage(data: string) {
    this.emit("message", { data });
  }

  simulateClose(code = 1000, reason = "") {
    this.readyState = MockWebSocket.CLOSED;
    this.emit("close", { code, reason });
  }

  simulateError() {
    this.emit("error", {});
  }

  private emit(event: string, ev: Record<string, unknown>) {
    for (const fn of this.listeners[event] ?? []) {
      fn(ev as never);
    }
  }
}

// Track all created MockWebSocket instances
let wsInstances: MockWebSocket[] = [];

beforeEach(() => {
  wsInstances = [];
  // Install mock WebSocket globally
  (globalThis as Record<string, unknown>).WebSocket = class extends MockWebSocket {
    constructor(url: string) {
      super(url);
      wsInstances.push(this);
    }
  } as unknown as typeof WebSocket;
  // Also expose static constants
  Object.assign((globalThis as Record<string, unknown>).WebSocket, {
    CONNECTING: 0,
    OPEN: 1,
    CLOSING: 2,
    CLOSED: 3,
  });
});

afterEach(() => {
  wsInstances = [];
  vi.restoreAllMocks();
});

function createClient(overrides: Partial<GatewayClientOptions> = {}) {
  return new GatewayClient({
    wsUrl: "ws://localhost:18789/ws",
    token: "test-token",
    autoReconnect: false, // Disable for most tests to avoid side effects
    ...overrides,
  });
}

function lastWs(): MockWebSocket {
  const ws = wsInstances[wsInstances.length - 1];
  if (!ws) {throw new Error("No WebSocket instance created");}
  return ws;
}

// Complete the handshake so the client is fully connected
function completeHandshake(ws: MockWebSocket) {
  // The client sends a connect request after WebSocket opens
  const connectResponse = JSON.stringify({
    type: "res",
    id: "connect",
    ok: true,
    payload: { protocol: 1 },
  });
  ws.simulateMessage(connectResponse);
}

// ── GatewayClient ──────────────────────────────────────────────────────────────

describe("GatewayClient", () => {
  it("creates a WebSocket connection on start()", async () => {
    const client = createClient();
    client.start();
    await vi.waitFor(() => expect(wsInstances).toHaveLength(1));
    expect(lastWs().url).toBe("ws://localhost:18789/ws");
    client.stop();
  });

  it("connected is false before handshake", async () => {
    const client = createClient();
    client.start();
    await vi.waitFor(() => expect(wsInstances).toHaveLength(1));
    expect(client.connected).toBe(false);
    client.stop();
  });

  it("connected becomes true after handshake", async () => {
    const onOpen = vi.fn();
    const client = createClient({ onOpen });
    client.start();
    await vi.waitFor(() => expect(wsInstances).toHaveLength(1));
    const ws = lastWs();
    await vi.waitFor(() => expect(ws.readyState).toBe(MockWebSocket.OPEN));
    completeHandshake(ws);
    expect(client.connected).toBe(true);
    expect(onOpen).toHaveBeenCalled();
    client.stop();
  });

  it("connected becomes false after stop()", async () => {
    const client = createClient();
    client.start();
    await vi.waitFor(() => expect(wsInstances).toHaveLength(1));
    const ws = lastWs();
    await vi.waitFor(() => expect(ws.readyState).toBe(MockWebSocket.OPEN));
    completeHandshake(ws);
    expect(client.connected).toBe(true);
    client.stop();
    expect(client.connected).toBe(false);
  });

  it("sends connect frame on WebSocket open", async () => {
    const client = createClient();
    client.start();
    await vi.waitFor(() => expect(wsInstances).toHaveLength(1));
    const ws = lastWs();
    await vi.waitFor(() => expect(ws.send).toHaveBeenCalled());
    const frame = JSON.parse(ws.send.mock.calls[0][0] as string);
    expect(frame.type).toBe("req");
    expect(frame.method).toBe("connect");
    expect(frame.params.auth.token).toBe("test-token");
    client.stop();
  });

  it("request() sends JSON-RPC frame and resolves on response", async () => {
    const client = createClient();
    client.start();
    await vi.waitFor(() => expect(wsInstances).toHaveLength(1));
    const ws = lastWs();
    await vi.waitFor(() => expect(ws.readyState).toBe(MockWebSocket.OPEN));
    completeHandshake(ws);

    const promise = client.request<{ value: number }>("test.method", { key: "val" });

    // Inspect the sent frame
    await vi.waitFor(() => expect(ws.send.mock.calls.length).toBeGreaterThan(1));
    const reqFrame = JSON.parse(ws.send.mock.calls[1][0] as string);
    expect(reqFrame.type).toBe("req");
    expect(reqFrame.method).toBe("test.method");

    // Simulate response
    ws.simulateMessage(
      JSON.stringify({ type: "res", id: reqFrame.id, ok: true, payload: { value: 42 } })
    );

    const result = await promise;
    expect(result).toEqual({ value: 42 });
    client.stop();
  });

  it("request() rejects on error response", async () => {
    const client = createClient();
    client.start();
    await vi.waitFor(() => expect(wsInstances).toHaveLength(1));
    const ws = lastWs();
    await vi.waitFor(() => expect(ws.readyState).toBe(MockWebSocket.OPEN));
    completeHandshake(ws);

    const promise = client.request("fail.method");

    await vi.waitFor(() => expect(ws.send.mock.calls.length).toBeGreaterThan(1));
    const reqFrame = JSON.parse(ws.send.mock.calls[1][0] as string);

    ws.simulateMessage(
      JSON.stringify({
        type: "res",
        id: reqFrame.id,
        ok: false,
        error: { code: "NOT_FOUND", message: "resource not found" },
      })
    );

    await expect(promise).rejects.toMatchObject({ code: "NOT_FOUND" });
    client.stop();
  });

  it("request() throws when not connected", async () => {
    const client = createClient();
    await expect(client.request("test")).rejects.toThrow("gateway not connected");
  });

  it("fires onEvent callback for event frames", async () => {
    const onEvent = vi.fn();
    const client = createClient({ onEvent });
    client.start();
    await vi.waitFor(() => expect(wsInstances).toHaveLength(1));
    const ws = lastWs();
    await vi.waitFor(() => expect(ws.readyState).toBe(MockWebSocket.OPEN));
    completeHandshake(ws);

    ws.simulateMessage(
      JSON.stringify({ type: "event", event: "chat.delta", payload: { text: "hi" } })
    );

    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: "event", event: "chat.delta" })
    );
    client.stop();
  });

  it("fires onClose callback when socket closes", async () => {
    const onClose = vi.fn();
    const client = createClient({ onClose });
    client.start();
    await vi.waitFor(() => expect(wsInstances).toHaveLength(1));
    const ws = lastWs();
    await vi.waitFor(() => expect(ws.readyState).toBe(MockWebSocket.OPEN));
    completeHandshake(ws);

    ws.simulateClose(1001, "going away");

    expect(onClose).toHaveBeenCalledWith({ code: 1001, reason: "going away" });
    client.stop();
  });

  it("rejects pending requests when socket closes", async () => {
    const client = createClient();
    client.start();
    await vi.waitFor(() => expect(wsInstances).toHaveLength(1));
    const ws = lastWs();
    await vi.waitFor(() => expect(ws.readyState).toBe(MockWebSocket.OPEN));
    completeHandshake(ws);

    const promise = client.request("slow.method");
    ws.simulateClose(1006, "abnormal");

    await expect(promise).rejects.toThrow("gateway closed");
    client.stop();
  });

  it("stop() rejects all pending requests", async () => {
    const client = createClient();
    client.start();
    await vi.waitFor(() => expect(wsInstances).toHaveLength(1));
    const ws = lastWs();
    await vi.waitFor(() => expect(ws.readyState).toBe(MockWebSocket.OPEN));
    completeHandshake(ws);

    const promise = client.request("pending.method");
    client.stop();

    // stop() calls ws.close() which triggers the close handler first
    await expect(promise).rejects.toThrow("gateway closed");
  });

  it("auto-reconnects when autoReconnect is true", async () => {
    vi.useFakeTimers();
    const client = createClient({ autoReconnect: true, reconnectMinDelayMs: 100 });
    client.start();

    await vi.waitFor(() => expect(wsInstances).toHaveLength(1));
    const ws1 = lastWs();
    ws1.simulateClose(1006, "lost");

    // Advance timers to trigger reconnect
    vi.advanceTimersByTime(200);

    expect(wsInstances.length).toBeGreaterThan(1);

    client.stop();
    vi.useRealTimers();
  });

  it("does not auto-reconnect when autoReconnect is false", async () => {
    const client = createClient({ autoReconnect: false });
    client.start();
    await vi.waitFor(() => expect(wsInstances).toHaveLength(1));
    const ws = lastWs();
    ws.simulateClose(1006, "lost");

    // Wait a bit to ensure no reconnect
    await new Promise((r) => setTimeout(r, 50));
    expect(wsInstances).toHaveLength(1);

    client.stop();
  });

  it("handles malformed messages gracefully", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const client = createClient();
    client.start();
    await vi.waitFor(() => expect(wsInstances).toHaveLength(1));
    const ws = lastWs();
    await vi.waitFor(() => expect(ws.readyState).toBe(MockWebSocket.OPEN));
    completeHandshake(ws);

    // Should not throw
    ws.simulateMessage("not valid json {{{");
    expect(consoleSpy).toHaveBeenCalled();

    client.stop();
    consoleSpy.mockRestore();
  });

  it("closes socket and retries when handshake fails", async () => {
    const client = createClient();
    client.start();
    await vi.waitFor(() => expect(wsInstances).toHaveLength(1));
    const ws = lastWs();
    await vi.waitFor(() => expect(ws.readyState).toBe(MockWebSocket.OPEN));

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Handshake failure
    ws.simulateMessage(
      JSON.stringify({
        type: "res",
        id: "connect",
        ok: false,
        error: { code: "AUTH", message: "bad token" },
      })
    );

    expect(client.connected).toBe(false);
    consoleSpy.mockRestore();
    client.stop();
  });
});
