import { StreamableHTTPTransport } from "@hono/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Context } from "hono";

import type { WorkerRuntimeDependencies } from "../env.js";
import {
  createConversationScope,
  createProfileRepository,
} from "../repositories.js";
import { registerHelloWidget } from "./hello-widget.js";
import { registerManageDogProfile } from "./profile-management.js";

export interface McpRuntime {
  close(): Promise<void>;
  connect(): Promise<void>;
  handleRequest(context: Context): Promise<Response | undefined>;
  isConnected(): boolean;
}

export function createMcpRuntime(
  dependencies: WorkerRuntimeDependencies,
): McpRuntime {
  const server = new McpServer({
    name: "pawlens-mcpserver",
    version: "0.0.0",
  });
  const transport = new StreamableHTTPTransport();

  const scope = createConversationScope();
  const profiles = createProfileRepository({
    createId: () => crypto.randomUUID(),
    kv: dependencies.kv,
    now: () => new Date(),
  });

  registerHelloWidget(server, dependencies.assets);
  registerManageDogProfile(server, profiles, scope);

  return {
    close: () => server.close(),
    connect: () => server.connect(transport),
    handleRequest: (context) => transport.handleRequest(context),
    isConnected: () => server.isConnected(),
  };
}
