import { StreamableHTTPTransport } from "@hono/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Context } from "hono";

import { createAssessmentService } from "../assessment-service.js";
import type { AssessmentService } from "../assessment-service.js";
import { probeAudioEvidence } from "../audio-evidence.js";
import type { WorkerRuntimeDependencies } from "../env.js";
import {
  type HistoryDiff,
  type ObservationLogReader,
  createHistoryDiff,
} from "../history-diff.js";
import { createModelAdapter } from "../model.js";
import {
  type ObservationService,
  createObservationService,
} from "../observation-service.js";
import {
  type ConversationScope,
  type ProfileRepository,
  createConversationScope,
  createProfileRepository,
} from "../repositories.js";
import { registerAnalyzeDogSignal } from "./analyze-dog-signal.js";
import { registerGetDogHistory } from "./get-dog-history.js";
import { registerHelloWidget } from "./hello-widget.js";
import { registerManageDogProfile } from "./profile-management.js";
import { registerSaveObservation } from "./save-observation.js";

export interface McpRuntime {
  close(): Promise<void>;
  connect(): Promise<void>;
  handleRequest(context: Context): Promise<Response | undefined>;
  isConnected(): boolean;
  sessionId(): string | undefined;
}

export interface PawLensToolDependencies {
  assessments: AssessmentService;
  conversationStable: boolean;
  history: HistoryDiff;
  observations: ObservationService;
  profiles: ProfileRepository;
  scope: ConversationScope;
}

export function registerPawLensTools(
  server: McpServer,
  dependencies: PawLensToolDependencies,
): void {
  registerAnalyzeDogSignal(
    server,
    dependencies.assessments,
    dependencies.scope,
  );
  registerGetDogHistory(
    server,
    dependencies.history,
    dependencies.scope,
    dependencies.conversationStable,
  );
  registerManageDogProfile(server, dependencies.profiles, dependencies.scope);
  registerSaveObservation(
    server,
    dependencies.observations,
    dependencies.scope,
  );
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
  const scope = createConversationScope();
  const transport = new StreamableHTTPTransport({
    sessionIdGenerator: () => scope,
  });
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
  const history = createHistoryDiff({ observations });

  registerHelloWidget(server, dependencies.assets);
  registerPawLensTools(server, {
    assessments,
    conversationStable: dependencies.conversationStable ?? true,
    history,
    observations,
    profiles,
    scope,
  });

  return {
    close: () => server.close(),
    connect: () => server.connect(transport),
    handleRequest: (context) => transport.handleRequest(context),
    isConnected: () => server.isConnected(),
    sessionId: () => transport.sessionId,
  };
}
