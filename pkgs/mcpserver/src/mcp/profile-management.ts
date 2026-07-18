import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  ManageDogProfileInputSchema,
  ManageDogProfileToolInputSchema,
  ProfileManagementResultSchema,
  ProfileManagementToolOutputSchema,
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
        openWorldHint: false,
        readOnlyHint: false,
      },
      description:
        "Use this when the owner explicitly asks to create, update, or delete a dog profile in the current PawLens conversation. Creates or updates a name and optional temperament note, or deletes a profile only when action is delete and confirmed is true. Returns the created or updated profile, or the deleted profile ID. Do not use this merely to inspect a dog or analyze a reaction.",
      // Use object-shaped descriptor schemas so ChatGPT receives every field
      // description in tools/list; the action-specific union below remains
      // the authoritative runtime validator.
      inputSchema: ManageDogProfileToolInputSchema,
      outputSchema: ProfileManagementToolOutputSchema,
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
