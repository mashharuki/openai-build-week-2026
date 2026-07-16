import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  ObservationLogSchema,
  SaveObservationInputSchema,
} from "@pawlens/shared";

import type { ObservationService } from "../observation-service.js";
import type { ConversationScope } from "../repositories.js";

export function registerSaveObservation(
  server: McpServer,
  observations: ObservationService,
  scope: ConversationScope,
): void {
  server.registerTool(
    "save_observation",
    {
      _meta: {
        "openai/widgetAccessible": true,
        ui: { visibility: ["app"] },
      },
      annotations: {
        destructiveHint: false,
        idempotentHint: false,
        readOnlyHint: false,
      },
      description:
        "Save only an owner-confirmed observation and one chosen action from the PawLens widget.",
      inputSchema: SaveObservationInputSchema,
      outputSchema: ObservationLogSchema,
      title: "確認済み観察を保存",
    },
    async (input) => {
      const observation = await observations.save(
        scope,
        SaveObservationInputSchema.parse(input),
      );

      return { content: [], structuredContent: observation };
    },
  );
}
