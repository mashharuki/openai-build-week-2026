import { describe, expect, it, vi } from "vitest";

import {
  type McpRuntime,
  type WorkerRuntimeDependencies,
  createApp,
} from "../src/index.js";

function createRuntime(): McpRuntime & {
  close: ReturnType<typeof vi.fn>;
  connect: ReturnType<typeof vi.fn>;
  handleRequest: ReturnType<typeof vi.fn>;
  sessionId: ReturnType<typeof vi.fn>;
} {
  let connected = false;

  return {
    close: vi.fn(async () => {
      connected = false;
    }),
    connect: vi.fn(async () => {
      connected = true;
    }),
    handleRequest: vi.fn(
      async () => new Response("mcp response", { status: 202 }),
    ),
    isConnected: () => connected,
    sessionId: vi.fn(() => "session-owner"),
  };
}

describe("createApp", () => {
  it("秘密や設定値を出さずにヘルスチェックを返す", async () => {
    const app = createApp({
      createMcpRuntime: createRuntime,
      now: () => new Date("2026-07-16T00:00:00.000Z"),
      serviceName: "pawlens-mcpserver",
      version: "0.0.0-test",
    });

    const response = await app.request("https://pawlens.example/health");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      service: "pawlens-mcpserver",
      status: "ok",
      timestamp: "2026-07-16T00:00:00.000Z",
      version: "0.0.0-test",
    });
  });

  it("MCPセッションごとにランタイムを分離し、DELETE後に閉じる", async () => {
    const runtime = createRuntime();
    const runtimeDependencies = {
      assets: {} as Fetcher,
      kv: {} as KVNamespace,
      model: {
        generateStructured: vi.fn(),
      },
    } satisfies WorkerRuntimeDependencies;
    const createMcpRuntime = vi.fn(() => runtime);
    const createWorkerDependencies = vi.fn(() => runtimeDependencies);
    const app = createApp({
      createMcpRuntime,
      createWorkerDependencies,
      now: () => new Date("2026-07-16T00:00:00.000Z"),
      serviceName: "pawlens-mcpserver",
      version: "0.0.0-test",
    });

    expect(
      (await app.request("https://pawlens.example/mcp", { method: "POST" }))
        .status,
    ).toBe(202);
    expect(
      (
        await app.request("https://pawlens.example/mcp", {
          headers: { "mcp-session-id": "session-owner" },
          method: "POST",
        })
      ).status,
    ).toBe(202);
    expect(runtime.connect).toHaveBeenCalledTimes(1);
    expect(createWorkerDependencies).toHaveBeenCalledTimes(1);
    expect(createMcpRuntime).toHaveBeenCalledWith(runtimeDependencies);

    expect(
      (
        await app.request("https://pawlens.example/mcp", {
          headers: { "mcp-session-id": "session-owner" },
          method: "DELETE",
        })
      ).status,
    ).toBe(202);
    expect(runtime.close).toHaveBeenCalledTimes(1);
    expect(runtime.isConnected()).toBe(false);
  });

  it("別のMCPセッションは別ランタイムに束縛する", async () => {
    const firstRuntime = createRuntime();
    firstRuntime.sessionId.mockReturnValue("session-first");
    const secondRuntime = createRuntime();
    secondRuntime.sessionId.mockReturnValue("session-second");
    const createMcpRuntime = vi
      .fn()
      .mockReturnValueOnce(firstRuntime)
      .mockReturnValueOnce(secondRuntime);
    const app = createApp({
      createMcpRuntime,
      createWorkerDependencies: () => ({
        assets: {} as Fetcher,
        kv: {} as KVNamespace,
        model: { generateStructured: vi.fn() },
      }),
    });

    await app.request("https://pawlens.example/mcp", { method: "POST" });
    await app.request("https://pawlens.example/mcp", { method: "POST" });

    expect(createMcpRuntime).toHaveBeenCalledTimes(2);
    expect(firstRuntime.handleRequest).toHaveBeenCalledTimes(1);
    expect(secondRuntime.handleRequest).toHaveBeenCalledTimes(1);
  });

  it("Durable Object が設定されている場合は MCP セッションを同じインスタンスへ転送する", async () => {
    const fetchSession = vi.fn(
      async (_request: Request) => new Response("proxied", { status: 202 }),
    );
    const getByName = vi.fn(() => ({ fetch: fetchSession }));
    const app = createApp({
      createMcpRuntime: createRuntime,
      createWorkerDependencies: () => ({
        assets: {} as Fetcher,
        kv: {} as KVNamespace,
        model: { generateStructured: vi.fn() },
      }),
    });

    const response = await app.fetch(
      new Request("https://pawlens.example/mcp", {
        headers: { "mcp-session-id": "session-owner" },
        method: "POST",
      }),
      { MCP_SESSIONS: { getByName } },
    );

    expect(response.status).toBe(202);
    expect(getByName).toHaveBeenCalledWith("session-owner");
    expect(fetchSession).toHaveBeenCalledTimes(1);
    const forwardedRequest = fetchSession.mock.calls[0]![0];
    expect(forwardedRequest.headers.get("mcp-session-id")).toBe("session-owner");
    expect(forwardedRequest.headers.get("x-pawlens-session-id")).toBe(
      "session-owner",
    );
  });
});
