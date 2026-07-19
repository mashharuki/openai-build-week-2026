import { describe, expect, it, vi } from "vitest";

import {
  createAppsSdkFilePicker,
  createAppsSdkFileUploader,
  getDogIdFromToolInputMessage,
  getStructuredContentFromBridgeMessage,
  getToolCaller,
  sendFollowUpMessage,
  startMcpAppsBridge,
} from "../src/openai-runtime.js";

describe("getStructuredContentFromBridgeMessage", () => {
  it("Apps SDKのアップロード済みファイルをツール用snake_case参照へ変換する", async () => {
    const uploadFile = vi.fn(async () => ({ fileId: "file-1" }));
    const getFileDownloadUrl = vi.fn(async () => ({
      downloadUrl: "https://files.example/file-1",
    }));
    const uploader = createAppsSdkFileUploader({
      getFileDownloadUrl,
      uploadFile,
    });

    await expect(
      uploader(new File(["bark"], "coco.wav", { type: "audio/wav" }), 4),
    ).resolves.toEqual({
      download_url: "https://files.example/file-1",
      duration_seconds: 4,
      file_id: "file-1",
      file_name: "coco.wav",
      mime_type: "audio/wav",
    });
    expect(getFileDownloadUrl).toHaveBeenCalledWith({ fileId: "file-1" });
  });

  it("ファイルAPIがないホストでは添付を送らない", async () => {
    const uploader = createAppsSdkFileUploader({});

    await expect(
      uploader(new File(["photo"], "coco.jpg", { type: "image/jpeg" })),
    ).resolves.toBeUndefined();
  });

  it("ChatGPTファイルライブラリの選択済み画像をツール参照へ変換する", async () => {
    const selectFiles = vi.fn(async () => [
      {
        fileId: "file-photo-1",
        fileName: "coco.jpg",
        mimeType: "image/jpeg",
      },
    ]);
    const getFileDownloadUrl = vi.fn(
      async () => "https://files.example/file-photo-1",
    );
    const picker = createAppsSdkFilePicker({
      getFileDownloadUrl,
      selectFiles,
    });

    await expect(picker?.()).resolves.toEqual([
      {
        download_url: "https://files.example/file-photo-1",
        file_id: "file-photo-1",
        file_name: "coco.jpg",
        mime_type: "image/jpeg",
      },
    ]);
    expect(getFileDownloadUrl).toHaveBeenCalledWith({ fileId: "file-photo-1" });
  });

  it("ChatGPTの会話へフォローアップを投稿する", () => {
    const postMessage = vi.fn();

    sendFollowUpMessage(
      { parent: { postMessage } },
      "次に確認することを教えてください。",
    );

    expect(postMessage).toHaveBeenCalledWith(
      {
        jsonrpc: "2.0",
        method: "ui/message",
        params: {
          content: [
            { text: "次に確認することを教えてください。", type: "text" },
          ],
          role: "user",
        },
      },
      "*",
    );
  });

  it("Apps SDKのcallToolとtool-inputから、明示操作に必要な型付き経路を提供する", async () => {
    const callTool = vi.fn(async () => ({ ok: true }));
    await expect(
      getToolCaller({ callTool })("save_observation", { dogId: "dog-1" }),
    ).resolves.toEqual({ ok: true });
    expect(
      getDogIdFromToolInputMessage({
        jsonrpc: "2.0",
        method: "ui/notifications/tool-input",
        params: { input: { dogId: "dog-1" } },
      }),
    ).toBe("dog-1");
  });

  it("Apps SDKのcallTool結果ラッパーからstructuredContentを取り出す", async () => {
    const callTool = vi.fn(async () => ({
      content: [],
      structuredContent: {
        profile: { id: "dog-1", name: "ココ" },
        status: "created",
      },
    }));

    await expect(
      getToolCaller({ callTool })("manage_dog_profile", { action: "create" }),
    ).resolves.toEqual({
      profile: { id: "dog-1", name: "ココ" },
      status: "created",
    });
  });

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
