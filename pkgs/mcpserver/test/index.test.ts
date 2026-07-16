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

  it("MCP接続を一度だけ初期化し、DELETE後に閉じる", async () => {
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
      (await app.request("https://pawlens.example/mcp", { method: "POST" }))
        .status,
    ).toBe(202);
    expect(runtime.connect).toHaveBeenCalledTimes(1);
    expect(createWorkerDependencies).toHaveBeenCalledTimes(1);
    expect(createMcpRuntime).toHaveBeenCalledWith(runtimeDependencies);

    expect(
      (await app.request("https://pawlens.example/mcp", { method: "DELETE" }))
        .status,
    ).toBe(202);
    expect(runtime.close).toHaveBeenCalledTimes(1);
    expect(runtime.isConnected()).toBe(false);
  });
});
