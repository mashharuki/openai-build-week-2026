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
  let runtime: McpRuntime | undefined;

  function getRuntime(bindings: WorkerBindings): McpRuntime {
    if (!runtime) {
      runtime = dependencies.createMcpRuntime(
        dependencies.createWorkerDependencies(bindings),
      );
    }

    return runtime;
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
    const activeRuntime = getRuntime(context.env);

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
        runtime = undefined;
      }
    }

    return (
      (await activeRuntime.handleRequest(context)) ?? context.body(null, 204)
    );
  });

  return app;
}

const app = createApp();

export default {
  fetch: app.fetch,
} satisfies ExportedHandler<WorkerBindings>;
