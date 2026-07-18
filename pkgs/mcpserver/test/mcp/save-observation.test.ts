import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ObservationLog } from "@pawlens/shared";
import { describe, expect, it, vi } from "vitest";

import { registerSaveObservation } from "../../src/mcp/save-observation.js";
import type { ObservationService } from "../../src/observation-service.js";
import { createConversationScope } from "../../src/repositories.js";

const observation: ObservationLog = {
  chosenAction: "人との距離を取った",
  conversationId: "server-scope",
  dogId: "dog-1",
  id: "observation-1",
  observedCues: ["耳が後ろを向いた"],
  recordedAt: "2026-07-16T00:00:00.000Z",
};

describe("registerSaveObservation", () => {
  it("明示的なアプリ操作として確認済み観察と主行動だけを保存する", async () => {
    const registerTool = vi.fn();
    const service: ObservationService = {
      list: vi.fn(async () => []),
      save: vi.fn(async () => observation),
    };
    const scope = createConversationScope(() => "server-scope");
    const input = {
      chosenAction: "人との距離を取った",
      dogId: "dog-1",
      observedCues: ["耳が後ろを向いた"],
    };

    registerSaveObservation(
      { registerTool } as unknown as McpServer,
      service,
      scope,
    );
    const handler = registerTool.mock.calls[0]?.[2] as (
      input: unknown,
    ) => Promise<unknown>;

    expect(registerTool).toHaveBeenCalledWith(
      "save_observation",
      expect.objectContaining({
        _meta: {
          "openai/widgetAccessible": true,
          ui: { visibility: ["app"] },
        },
        annotations: {
          destructiveHint: false,
          idempotentHint: false,
          openWorldHint: false,
          readOnlyHint: false,
        },
      }),
      expect.any(Function),
    );
    await expect(handler(input)).resolves.toEqual({
      content: [],
      structuredContent: observation,
    });
    expect(service.save).toHaveBeenCalledWith(scope, input);
    await expect(
      handler({
        ...input,
        primaryHypothesis: { label: "AI仮説", rationale: "保存しない" },
      }),
    ).rejects.toThrow();
  });
});
