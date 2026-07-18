const MCP_APPS_PROTOCOL_VERSION = "2026-01-26";
const INITIALIZE_METHOD = "ui/initialize";
const INITIALIZED_METHOD = "ui/notifications/initialized";

interface BridgeHost {
  addEventListener(
    type: "message",
    listener: (event: { data: unknown }) => void,
  ): void;
  parent: { postMessage(message: unknown, targetOrigin: string): void };
  removeEventListener(
    type: "message",
    listener: (event: { data: unknown }) => void,
  ): void;
}

export interface OpenAiToolHost {
  capabilities?: { audioEvidence?: boolean };
  callTool?: (name: string, arguments_: unknown) => Promise<unknown>;
  getFileDownloadUrl?: (
    input: { fileId: string },
  ) => Promise<{ downloadUrl: string } | string>;
  uploadFile?: (file: File) => Promise<{ fileId: string } | string>;
}

export interface AppsSdkToolFile {
  download_url: string;
  duration_seconds?: number;
  file_id: string;
  file_name?: string;
  mime_type?: string;
}

export type AppsSdkFileUploader = (
  file: File,
  durationSeconds?: number,
) => Promise<AppsSdkToolFile | undefined>;

/**
 * Converts a widget-selected File into the documented Apps SDK file-parameter
 * shape. A missing optional host extension fails closed so no browser-local
 * filename is mistaken for an authorized attachment.
 */
export function createAppsSdkFileUploader(
  host: OpenAiToolHost,
): AppsSdkFileUploader {
  return async (file, durationSeconds) => {
    if (!host.uploadFile || !host.getFileDownloadUrl) return undefined;

    const uploaded = await host.uploadFile(file);
    const fileId = typeof uploaded === "string" ? uploaded : uploaded.fileId;
    const result = await host.getFileDownloadUrl({ fileId });
    const downloadUrl =
      typeof result === "string" ? result : result.downloadUrl;

    return {
      download_url: downloadUrl,
      ...(durationSeconds === undefined
        ? {}
        : { duration_seconds: durationSeconds }),
      file_id: fileId,
      ...(file.name ? { file_name: file.name } : {}),
      ...(file.type ? { mime_type: file.type } : {}),
    };
  };
}

export function getToolCaller(
  host: OpenAiToolHost,
): (name: string, input: unknown) => Promise<unknown> {
  const callTool = host.callTool;
  if (!callTool) {
    return async () => {
      throw new Error("The host does not support widget tool calls.");
    };
  }

  return (name, input) => callTool(name, input);
}

export function getDogIdFromToolInputMessage(
  message: unknown,
): string | undefined {
  if (
    !message ||
    typeof message !== "object" ||
    !("jsonrpc" in message) ||
    message.jsonrpc !== "2.0" ||
    !("method" in message) ||
    message.method !== "ui/notifications/tool-input" ||
    !("params" in message) ||
    !message.params ||
    typeof message.params !== "object" ||
    !("input" in message.params) ||
    !message.params.input ||
    typeof message.params.input !== "object" ||
    !("dogId" in message.params.input) ||
    typeof message.params.input.dogId !== "string"
  ) {
    return undefined;
  }

  return message.params.input.dogId;
}

export function startMcpAppsBridge(host: BridgeHost): () => void {
  const requestId = `pawlens-hello-${crypto.randomUUID()}`;
  const onMessage = (event: { data: unknown }) => {
    const message = event.data;

    if (
      !message ||
      typeof message !== "object" ||
      !("jsonrpc" in message) ||
      message.jsonrpc !== "2.0" ||
      !("id" in message) ||
      message.id !== requestId ||
      !("result" in message)
    ) {
      return;
    }

    host.parent.postMessage(
      { jsonrpc: "2.0", method: INITIALIZED_METHOD, params: {} },
      "*",
    );
  };

  host.addEventListener("message", onMessage);
  host.parent.postMessage(
    {
      id: requestId,
      jsonrpc: "2.0",
      method: INITIALIZE_METHOD,
      params: {
        appCapabilities: {},
        appInfo: { name: "pawlens-hello-widget", version: "0.0.0" },
        protocolVersion: MCP_APPS_PROTOCOL_VERSION,
      },
    },
    "*",
  );

  return () => host.removeEventListener("message", onMessage);
}

export function getStructuredContentFromBridgeMessage(
  message: unknown,
): unknown | undefined {
  if (
    !message ||
    typeof message !== "object" ||
    !("jsonrpc" in message) ||
    message.jsonrpc !== "2.0" ||
    !("method" in message) ||
    message.method !== "ui/notifications/tool-result" ||
    !("params" in message) ||
    !message.params ||
    typeof message.params !== "object" ||
    !("structuredContent" in message.params)
  ) {
    return undefined;
  }

  return message.params.structuredContent;
}
