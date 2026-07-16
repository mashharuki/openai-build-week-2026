import { Hono } from "hono";

import type {
  ModelGateway,
  WorkerBindings,
  WorkerRuntimeDependencies,
} from "./env.js";
import { type McpRuntime, createMcpRuntime } from "./mcp/server.js";

export type { McpRuntime } from "./mcp/server.js";
export type { ModelGateway, WorkerRuntimeDependencies } from "./env.js";

export interface AppDependencies {
  createMcpRuntime: (dependencies: WorkerRuntimeDependencies) => McpRuntime;
  createWorkerDependencies: (
    bindings: WorkerBindings,
  ) => WorkerRuntimeDependencies;
  now: () => Date;
  serviceName: string;
  version: string;
}

const defaultDependencies: AppDependencies = {
  createMcpRuntime,
  createWorkerDependencies: (bindings) => ({
    assets: bindings.ASSETS,
    kv: bindings.PAWLENS_KV,
    model: {
      generateStructured: async () => {
        throw new Error("The model adapter has not been configured.");
      },
    },
  }),
  now: () => new Date(),
  serviceName: "pawlens-mcpserver",
  version: "0.0.0",
};

export function createApp(overrides: Partial<AppDependencies> = {}) {
  const dependencies = { ...defaultDependencies, ...overrides };
  const app = new Hono<{ Bindings: WorkerBindings }>();
  const runtimes = new Map<string, McpRuntime>();

  function createRuntime(bindings: WorkerBindings): McpRuntime {
    return dependencies.createMcpRuntime(
      dependencies.createWorkerDependencies(bindings),
    );
  }

  app.get("/health", (context) =>
    context.json({
      service: dependencies.serviceName,
      status: "ok",
      timestamp: dependencies.now().toISOString(),
      version: dependencies.version,
    }),
  );

  app.all("/mcp", async (context) => {
    const requestedSessionId = context.req.header("mcp-session-id");
    const activeRuntime = requestedSessionId
      ? runtimes.get(requestedSessionId)
      : createRuntime(context.env);

    if (!activeRuntime) {
      return context.json(
        {
          error: "Unknown MCP session.",
        },
        404,
      );
    }

    if (!activeRuntime.isConnected()) {
      await activeRuntime.connect();
    }

    if (context.req.method === "DELETE") {
      try {
        return (
          (await activeRuntime.handleRequest(context)) ??
          context.body(null, 204)
        );
      } finally {
        await activeRuntime.close();
        if (requestedSessionId) {
          runtimes.delete(requestedSessionId);
        }
      }
    }

    const response =
      (await activeRuntime.handleRequest(context)) ?? context.body(null, 204);
    const createdSessionId = activeRuntime.sessionId();

    if (!requestedSessionId && createdSessionId) {
      runtimes.set(createdSessionId, activeRuntime);
    }

    return response;
  });

  return app;
}

const app = createApp();

export default {
  fetch: app.fetch,
} satisfies ExportedHandler<WorkerBindings>;
