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
        // The model must not persist its own hypothesis as an owner-confirmed
        // observation, so this write path is callable only from the widget.
        "openai/widgetAccessible": true,
        ui: { visibility: ["app"] },
      },
      annotations: {
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
        readOnlyHint: false,
      },
      description:
        "Use this only from the PawLens widget after the owner has reviewed and explicitly confirmed observed cues and a chosen next action. Saves one observation for the selected dog within the current conversation and returns the saved log. This is a write operation; never save a model-generated hypothesis as an owner-confirmed observation.",
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
