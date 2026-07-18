import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  ManageDogProfileInputSchema,
  ProfileManagementResultSchema,
} from "@pawlens/shared";

import type { ConversationScope, ProfileRepository } from "../repositories.js";

export function registerManageDogProfile(
  server: McpServer,
  profiles: ProfileRepository,
  scope: ConversationScope,
): void {
  server.registerTool(
    "manage_dog_profile",
    {
      annotations: {
        destructiveHint: true,
        idempotentHint: false,
        readOnlyHint: false,
      },
      description:
        "Create, update, or delete the current conversation's dog profile.",
      inputSchema: ManageDogProfileInputSchema,
      outputSchema: ProfileManagementResultSchema,
      title: "犬のプロフィールを管理",
    },
    async (input) => {
      const operation = ManageDogProfileInputSchema.parse(input);

      if (operation.action === "create") {
        const profile = await profiles.create(scope, operation);

        return {
          content: [],
          structuredContent: { profile, status: "created" as const },
        };
      }

      if (operation.action === "update") {
        const profile = await profiles.update(
          scope,
          operation.dogId,
          operation,
        );

        return profile
          ? {
              content: [],
              structuredContent: { profile, status: "updated" as const },
            }
          : profileNotFound();
      }

      // The schema requires `confirmed: true`; descriptor annotations inform
      // clients but do not enforce intent within a server handler.
      const deleted = await profiles.delete(scope, operation);

      return deleted
        ? {
            content: [],
            structuredContent: {
              dogId: operation.dogId,
              status: "deleted" as const,
            },
          }
        : profileNotFound();
    },
  );
}

function profileNotFound() {
  return {
    content: [
      {
        text: "The requested dog profile was not found in this conversation.",
        type: "text" as const,
      },
    ],
    isError: true,
  };
}
