import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  GetDogHistoryInputSchema,
  HistoryComparisonSchema,
} from "@pawlens/shared";

import type { HistoryDiff } from "../history-diff.js";
import type { ConversationScope } from "../repositories.js";

export function registerGetDogHistory(
  server: McpServer,
  history: HistoryDiff,
  scope: ConversationScope,
  conversationStable: boolean,
): void {
  server.registerTool(
    "get_dog_history",
    {
      annotations: {
        destructiveHint: false,
        idempotentHint: true,
        readOnlyHint: true,
      },
      description:
        "Compare owner-confirmed observations for one dog within the current conversation only.",
      inputSchema: GetDogHistoryInputSchema,
      outputSchema: HistoryComparisonSchema,
      title: "同一会話の観察履歴を比較",
    },
    async (input) => {
      const request = GetDogHistoryInputSchema.parse(input);
      // This result is a runtime probe outcome, never a model-provided input.
      // HistoryDiff returns unavailable when a stable conversation is unproven.
      const comparison = await history.compare(scope, {
        ...request,
        conversationStable,
      });

      return { content: [], structuredContent: comparison };
    },
  );
}
