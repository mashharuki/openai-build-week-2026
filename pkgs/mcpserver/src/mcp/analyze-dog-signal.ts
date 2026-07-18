import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  AssessmentResultSchema,
  OpenAiSignalInputSchema,
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
        "Use this when a dog owner describes a bark or other reaction and wants calm, non-diagnostic observation guidance. Accepts the dog's profile ID, situation, bark description, and optional image or audio evidence. Returns possible observational hypotheses, confidence, cues to watch, one safe next action, limitations, and an escalation signal when appropriate; it never provides a veterinary diagnosis.",
      inputSchema: OpenAiSignalInputSchema,
      outputSchema: AssessmentResultSchema,
      title: "犬の反応を見立てる",
    },
    async (input) => {
      // Apps SDK supplies snake_case file parameters. The canonical form is
      // retained for the widget's already-stored evidence and local tests;
      // ChatGPT scans the descriptor above, so new host calls use the former.
      const appsSdkSignal = OpenAiSignalInputSchema.safeParse(input);
      const signal = appsSdkSignal.success
        ? appsSdkSignal.data
        : SignalInputSchema.parse(input);
      const assessment = await assessments.assess(scope, signal);

      return { content: [], structuredContent: assessment };
    },
  );
}
