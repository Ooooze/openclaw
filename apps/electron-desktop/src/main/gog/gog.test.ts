/**
 * Tests for gog.ts — parseGogAuthListEmails, runGog, clearGogAuthTokens.
 */
import { EventEmitter } from "node:events";
import { afterEach, describe, expect, it, vi } from "vitest";

import { clearGogAuthTokens, parseGogAuthListEmails, runGog } from "./gog";

// ── parseGogAuthListEmails ─────────────────────────────────────────────────────

describe("parseGogAuthListEmails", () => {
  it("extracts emails from valid accounts array", () => {
    const json = JSON.stringify({
      accounts: [{ email: "alice@example.com" }, { email: "bob@example.com" }],
    });
    expect(parseGogAuthListEmails(json)).toEqual(["alice@example.com", "bob@example.com"]);
  });

  it("deduplicates emails", () => {
    const json = JSON.stringify({
      accounts: [{ email: "dup@test.com" }, { email: "dup@test.com" }],
    });
    expect(parseGogAuthListEmails(json)).toEqual(["dup@test.com"]);
  });

  it("trims whitespace from emails", () => {
    const json = JSON.stringify({
      accounts: [{ email: "  spaced@test.com  " }],
    });
    expect(parseGogAuthListEmails(json)).toEqual(["spaced@test.com"]);
  });

  it("skips entries without email", () => {
    const json = JSON.stringify({
      accounts: [{ name: "no-email" }, { email: "valid@test.com" }],
    });
    expect(parseGogAuthListEmails(json)).toEqual(["valid@test.com"]);
  });

  it("returns empty for empty accounts", () => {
    expect(parseGogAuthListEmails(JSON.stringify({ accounts: [] }))).toEqual([]);
  });

  it("returns empty for missing accounts key", () => {
    expect(parseGogAuthListEmails(JSON.stringify({}))).toEqual([]);
  });

  it("returns empty for malformed JSON", () => {
    expect(parseGogAuthListEmails("not json")).toEqual([]);
  });

  it("returns empty for empty string", () => {
    expect(parseGogAuthListEmails("")).toEqual([]);
  });

  it("skips empty string emails", () => {
    const json = JSON.stringify({
      accounts: [{ email: "" }, { email: "ok@test.com" }],
    });
    expect(parseGogAuthListEmails(json)).toEqual(["ok@test.com"]);
  });

  it("skips non-string email values", () => {
    const json = JSON.stringify({
      accounts: [{ email: 42 }, { email: null }, { email: "ok@test.com" }],
    });
    expect(parseGogAuthListEmails(json)).toEqual(["ok@test.com"]);
  });
});

// ── Mock setup ─────────────────────────────────────────────────────────────────

// Helper to create a mock child process
function createMockChild() {
  const child = new EventEmitter() as EventEmitter & {
    stdout: EventEmitter;
    stderr: EventEmitter;
    kill: ReturnType<typeof vi.fn>;
  };
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.kill = vi.fn();
  return child;
}

// Hoist mocks so vi.mock factories can reference them
const { existsSyncMock } = vi.hoisted(() => ({
  existsSyncMock: vi.fn<(path: string) => boolean>(),
}));

// Mock child_process at module level (ESM-safe)
vi.mock("node:child_process", () => ({
  spawn: vi.fn(),
  spawnSync: vi.fn(),
}));

// Mock node:fs existsSync (ESM namespace is not configurable, so use vi.mock)
vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return {
    ...actual,
    default: { ...actual, existsSync: existsSyncMock },
    existsSync: existsSyncMock,
  };
});

const { spawn } = await import("node:child_process");

// ── runGog ─────────────────────────────────────────────────────────────────────

describe("runGog", () => {
  afterEach(() => {
    vi.mocked(spawn).mockReset();
  });

  it("resolves with ok:true for successful command", async () => {
    const child = createMockChild();
    vi.mocked(spawn).mockReturnValue(child as never);

    const promise = runGog({
      bin: "/usr/bin/gog",
      args: ["auth", "list"],
      cwd: "/tmp",
      timeoutMs: 5000,
    });

    child.stdout.emit("data", Buffer.from("output data"));
    child.emit("close", 0);

    const result = await promise;
    expect(result.ok).toBe(true);
    expect(result.code).toBe(0);
    expect(result.stdout).toBe("output data");
    expect(result.stderr).toBe("");
  });

  it("resolves with ok:false for non-zero exit", async () => {
    const child = createMockChild();
    vi.mocked(spawn).mockReturnValue(child as never);

    const promise = runGog({
      bin: "/usr/bin/gog",
      args: ["fail"],
      cwd: "/tmp",
      timeoutMs: 5000,
    });

    child.stderr.emit("data", Buffer.from("error msg"));
    child.emit("close", 1);

    const result = await promise;
    expect(result.ok).toBe(false);
    expect(result.code).toBe(1);
    expect(result.stderr).toBe("error msg");
  });

  it("resolves with ok:false on timeout", async () => {
    const child = createMockChild();
    vi.mocked(spawn).mockReturnValue(child as never);

    const promise = runGog({
      bin: "/usr/bin/gog",
      args: ["slow"],
      cwd: "/tmp",
      timeoutMs: 50,
    });

    // Let the timeout fire, then simulate child close
    setTimeout(() => child.emit("close", null), 80);

    const result = await promise;
    expect(result.ok).toBe(false);
    expect(child.kill).toHaveBeenCalledWith("SIGKILL");
  });

  it("resolves with ok:false on spawn error", async () => {
    const child = createMockChild();
    vi.mocked(spawn).mockReturnValue(child as never);

    const promise = runGog({
      bin: "/nonexistent/gog",
      args: [],
      cwd: "/tmp",
      timeoutMs: 5000,
    });

    child.emit("error", new Error("spawn ENOENT"));

    const result = await promise;
    expect(result.ok).toBe(false);
    expect(result.stderr).toContain("ENOENT");
  });

  it("captures both stdout and stderr", async () => {
    const child = createMockChild();
    vi.mocked(spawn).mockReturnValue(child as never);

    const promise = runGog({
      bin: "/usr/bin/gog",
      args: ["mixed"],
      cwd: "/tmp",
      timeoutMs: 5000,
    });

    child.stdout.emit("data", Buffer.from("out1"));
    child.stderr.emit("data", Buffer.from("err1"));
    child.stdout.emit("data", Buffer.from("out2"));
    child.emit("close", 0);

    const result = await promise;
    expect(result.stdout).toBe("out1out2");
    expect(result.stderr).toBe("err1");
  });

  it("uses default timeout of 120s when not specified", async () => {
    const child = createMockChild();
    vi.mocked(spawn).mockReturnValue(child as never);

    const promise = runGog({
      bin: "/usr/bin/gog",
      args: [],
      cwd: "/tmp",
    });

    child.emit("close", 0);
    const result = await promise;
    expect(result.ok).toBe(true);
  });
});

// ── clearGogAuthTokens ─────────────────────────────────────────────────────────

describe("clearGogAuthTokens", () => {
  afterEach(() => {
    existsSyncMock.mockReset();
    vi.mocked(spawn).mockReset();
  });

  it("adds warning when gog binary does not exist", async () => {
    existsSyncMock.mockReturnValue(false);

    const warnings: string[] = [];
    await clearGogAuthTokens({
      gogBin: "/missing/gog",
      openclawDir: "/tmp",
      warnings,
    });

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("gog binary not found");
  });

  it("adds warning when auth list fails", async () => {
    existsSyncMock.mockReturnValue(true);

    const child = createMockChild();
    vi.mocked(spawn).mockReturnValue(child as never);

    const warnings: string[] = [];
    const promise = clearGogAuthTokens({
      gogBin: "/usr/bin/gog",
      openclawDir: "/tmp",
      warnings,
    });

    // Make auth list fail
    child.stderr.emit("data", Buffer.from("auth error"));
    child.emit("close", 1);

    await promise;

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("gog auth list failed");
  });

  it("removes each email returned by auth list", async () => {
    existsSyncMock.mockReturnValue(true);

    const children: ReturnType<typeof createMockChild>[] = [];
    vi.mocked(spawn).mockImplementation(() => {
      const child = createMockChild();
      children.push(child);
      return child as never;
    });

    const warnings: string[] = [];
    const promise = clearGogAuthTokens({
      gogBin: "/usr/bin/gog",
      openclawDir: "/tmp",
      warnings,
    });

    // First spawn: auth list returns two emails
    await new Promise((r) => setTimeout(r, 10));
    children[0].stdout.emit(
      "data",
      Buffer.from(
        JSON.stringify({ accounts: [{ email: "a@test.com" }, { email: "b@test.com" }] })
      )
    );
    children[0].emit("close", 0);

    // Second spawn: remove a@test.com
    await new Promise((r) => setTimeout(r, 10));
    children[1].emit("close", 0);

    // Third spawn: remove b@test.com
    await new Promise((r) => setTimeout(r, 10));
    children[2].emit("close", 0);

    await promise;

    expect(warnings).toEqual([]);
    expect(children).toHaveLength(3);

    // Verify spawn was called with correct args for removals
    const spawnCalls = vi.mocked(spawn).mock.calls;
    expect(spawnCalls[1][1]).toContain("a@test.com");
    expect(spawnCalls[2][1]).toContain("b@test.com");
  });

  it("adds warning for each failed removal", async () => {
    existsSyncMock.mockReturnValue(true);

    const children: ReturnType<typeof createMockChild>[] = [];
    vi.mocked(spawn).mockImplementation(() => {
      const child = createMockChild();
      children.push(child);
      return child as never;
    });

    const warnings: string[] = [];
    const promise = clearGogAuthTokens({
      gogBin: "/usr/bin/gog",
      openclawDir: "/tmp",
      warnings,
    });

    // auth list succeeds with one email
    await new Promise((r) => setTimeout(r, 10));
    children[0].stdout.emit(
      "data",
      Buffer.from(JSON.stringify({ accounts: [{ email: "fail@test.com" }] }))
    );
    children[0].emit("close", 0);

    // remove fails
    await new Promise((r) => setTimeout(r, 10));
    children[1].stderr.emit("data", Buffer.from("permission denied"));
    children[1].emit("close", 1);

    await promise;

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("gog auth remove failed for fail@test.com");
  });
});
