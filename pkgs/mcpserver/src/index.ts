import { Hono } from "hono";

import type {
  ModelGateway,
  WorkerBindings,
  WorkerRuntimeDependencies,
} from "./env.js";
import { type McpRuntime, createMcpRuntime } from "./mcp/server.js";
import { createConversationScope } from "./repositories.js";
import { createOpenAiResponsesGateway } from "./openai-responses-gateway.js";

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

export const defaultDependencies: AppDependencies = {
  createMcpRuntime,
  createWorkerDependencies: (bindings) => ({
    assets: bindings.ASSETS,
    kv: bindings.PAWLENS_KV,
    model: createOpenAiResponsesGateway({ apiKey: bindings.OPENAI_API_KEY }),
  }),
  now: () => new Date(),
  serviceName: "pawlens-mcpserver",
  version: "0.0.0",
};

function createSessionApp(runtime: McpRuntime) {
  const app = new Hono();

  app.all("/mcp", async (context) => {
    if (!runtime.isConnected()) await runtime.connect();
    if (context.req.method === "DELETE") {
      try {
        return (
          (await runtime.handleRequest(context)) ?? context.body(null, 204)
        );
      } finally {
        await runtime.close();
      }
    }
    return (await runtime.handleRequest(context)) ?? context.body(null, 204);
  });

  return app;
}

/** Routes one Streamable HTTP session to a single Durable Object instance. */
export class PawLensMcpSession {
  private runtime: McpRuntime | undefined;

  constructor(
    _state: DurableObjectState,
    private readonly env: WorkerBindings,
  ) {}

  async fetch(request: Request): Promise<Response> {
    const scopeId = request.headers.get("x-pawlens-session-id");
    if (!scopeId)
      return new Response("Missing MCP session route.", { status: 400 });

    if (!this.runtime) {
      if (request.headers.has("mcp-session-id")) {
        // The DO was evicted or a deployment replaced it. MCP clients must
        // reinitialize after this protocol-level session expiry.
        return new Response("MCP session expired.", { status: 404 });
      }
      this.runtime = createMcpRuntime(
        defaultDependencies.createWorkerDependencies(this.env),
        createConversationScope(() => scopeId),
      );
    }

    return createSessionApp(this.runtime).fetch(request);
  }
}

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
    if (context.env?.MCP_SESSIONS) {
      const sessionId =
        context.req.header("mcp-session-id") ?? crypto.randomUUID();
      const headers = new Headers(context.req.raw.headers);
      headers.set("x-pawlens-session-id", sessionId);
      return context.env.MCP_SESSIONS.getByName(sessionId).fetch(
        new Request(context.req.raw, { headers }),
      );
    }

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
        // Streamable HTTP clients own session lifetime; do not retain an
        // in-memory scope after their explicit disconnect.
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
      // This ID scopes server storage, but it is not proof of a stable ChatGPT
      // conversation ID; history comparison probes that separately.
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
