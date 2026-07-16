import { StreamableHTTPTransport } from "@hono/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Context } from "hono";

import { createAssessmentService } from "../assessment-service.js";
import { probeAudioEvidence } from "../audio-evidence.js";
import type { WorkerRuntimeDependencies } from "../env.js";
import type { ObservationLogReader } from "../history-diff.js";
import { createModelAdapter } from "../model.js";
import { createObservationService } from "../observation-service.js";
import {
  createConversationScope,
  createProfileRepository,
} from "../repositories.js";
import { registerAnalyzeDogSignal } from "./analyze-dog-signal.js";
import { registerHelloWidget } from "./hello-widget.js";
import { registerManageDogProfile } from "./profile-management.js";
import { registerSaveObservation } from "./save-observation.js";

export interface McpRuntime {
  close(): Promise<void>;
  connect(): Promise<void>;
  handleRequest(context: Context): Promise<Response | undefined>;
  isConnected(): boolean;
}

export function createRuntimeAssessmentService(
  dependencies: Pick<WorkerRuntimeDependencies, "audioAvailable" | "model">,
  observations: ObservationLogReader,
) {
  return createAssessmentService({
    audioCapability: probeAudioEvidence(dependencies.audioAvailable),
    model: createModelAdapter(dependencies.model),
    observations,
  });
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
  const observations = createObservationService({
    createId: () => crypto.randomUUID(),
    kv: dependencies.kv,
    now: () => new Date(),
    profiles,
  });
  const assessments = createRuntimeAssessmentService(
    dependencies,
    observations,
  );

  registerHelloWidget(server, dependencies.assets);
  registerAnalyzeDogSignal(server, assessments, scope);
  registerManageDogProfile(server, profiles, scope);
  registerSaveObservation(server, observations, scope);

  return {
    close: () => server.close(),
    connect: () => server.connect(transport),
    handleRequest: (context) => transport.handleRequest(context),
    isConnected: () => server.isConnected(),
  };
}
