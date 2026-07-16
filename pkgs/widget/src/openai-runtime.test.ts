import { describe, expect, it, vi } from "vitest";

import {
  getStructuredContentFromBridgeMessage,
  startMcpAppsBridge,
} from "./openai-runtime.js";

describe("getStructuredContentFromBridgeMessage", () => {
  it("MCP Apps bridgeのツール結果通知から構造化結果を取り出す", () => {
    expect(
      getStructuredContentFromBridgeMessage({
        jsonrpc: "2.0",
        method: "ui/notifications/tool-result",
        params: { structuredContent: { greeting: "Hello PawLens" } },
      }),
    ).toEqual({ greeting: "Hello PawLens" });
  });

  it("別の通知は無視する", () => {
    expect(
      getStructuredContentFromBridgeMessage({
        jsonrpc: "2.0",
        method: "ui/notifications/tool-input",
      }),
    ).toBeUndefined();
  });

  it("初期化応答後にinitialized通知を返す", () => {
    let onMessage: ((event: { data: unknown }) => void) | undefined;
    const postMessage = vi.fn();
    const host = {
      addEventListener: vi.fn(
        (_type: string, listener: (event: { data: unknown }) => void) => {
          onMessage = listener;
        },
      ),
      parent: { postMessage },
      removeEventListener: vi.fn(),
    };

    startMcpAppsBridge(host);

    const initializeRequest = postMessage.mock.calls[0]?.[0] as {
      id: string;
      method: string;
      params: {
        appCapabilities: Record<string, never>;
        protocolVersion: string;
      };
    };
    expect(initializeRequest).toMatchObject({
      jsonrpc: "2.0",
      method: "ui/initialize",
      params: { appCapabilities: {}, protocolVersion: "2026-01-26" },
    });

    onMessage?.({
      data: { id: initializeRequest.id, jsonrpc: "2.0", result: {} },
    });
    expect(postMessage).toHaveBeenLastCalledWith(
      { jsonrpc: "2.0", method: "ui/notifications/initialized", params: {} },
      "*",
    );
  });
});
