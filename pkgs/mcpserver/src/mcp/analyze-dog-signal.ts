import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  AssessmentResultSchema,
  OpenAiSignalInputSchema,
  OpenAiSignalToolInputSchema,
  SignalInputSchema,
} from "@pawlens/shared";

import type { AssessmentService } from "../assessment-service.js";
import type { ConversationScope } from "../repositories.js";
import { HELLO_WIDGET_RESOURCE_URI } from "./hello-widget.js";

export function registerAnalyzeDogSignal(
  server: McpServer,
  assessments: AssessmentService,
  scope: ConversationScope,
): void {
  server.registerTool(
    "analyze_dog_signal",
    {
      _meta: {
        "openai/fileParams": ["image", "audio"],
        "openai/outputTemplate": HELLO_WIDGET_RESOURCE_URI,
        ui: { resourceUri: HELLO_WIDGET_RESOURCE_URI },
      },
      annotations: {
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
        readOnlyHint: true,
      },
      description:
        "Use this when a dog owner describes a bark or other reaction and wants calm, non-diagnostic observation guidance. Provide the dog's profile ID, situation, factual reaction description, and distance_to_trigger_meters as a number in meters or null when unknown; image and audio evidence are optional. Returns possible observational hypotheses, confidence, cues to watch, one safe next action, limitations, and an escalation signal when appropriate; it never provides a veterinary diagnosis.",
      // The transformed parser is ideal for the handler, but MCP's tools/list
      // requires an object-shaped schema to publish its field descriptions.
      inputSchema: OpenAiSignalToolInputSchema,
      outputSchema: AssessmentResultSchema,
      title: "犬の反応を見立てる",
    },
    async (input) => {
      // Apps SDK supplies snake_case file parameters. The canonical form is
      // retained for the widget's already-stored evidence and local tests;
      // ChatGPT scans the descriptor above, so new host calls use the former.
      const appsSdkSignal = OpenAiSignalInputSchema.safeParse(
        withLegacyDistanceInMeters(input),
      );
      const signal = appsSdkSignal.success
        ? appsSdkSignal.data
        : SignalInputSchema.parse(input);
      const assessment = await assessments.assess(scope, signal);

      return { content: [], structuredContent: assessment };
    },
  );
}

/**
 * Keeps already-rendered widget bundles working while the public MCP contract
 * moves from an ambiguous text field to distance_to_trigger_meters.
 */
function withLegacyDistanceInMeters(input: unknown): unknown {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return input;
  }

  const candidate = input as Record<string, unknown>;
  if (
    "distance_to_trigger_meters" in candidate ||
    !("distanceToPerson" in candidate)
  ) {
    return input;
  }

  const legacyDistance = candidate.distanceToPerson;
  const meters =
    legacyDistance === null
      ? null
      : typeof legacyDistance === "number"
        ? legacyDistance
        : typeof legacyDistance === "string"
          ? Number.parseFloat(legacyDistance)
          : Number.NaN;

  if (!Number.isFinite(meters) && meters !== null) return input;

  const { distanceToPerson: _legacyDistance, ...appsSdkCandidate } = candidate;
  return { ...appsSdkCandidate, distance_to_trigger_meters: meters };
}
