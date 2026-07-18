import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ObservationLog } from "@pawlens/shared";
import { describe, expect, it, vi } from "vitest";

import { createHistoryDiff } from "../../src/history-diff.js";
import { registerGetDogHistory } from "../../src/mcp/get-dog-history.js";
import { createConversationScope } from "../../src/repositories.js";

const ownerScope = createConversationScope(() => "scope-owner");
const firstLog: ObservationLog = {
  chosenAction: "玄関から距離を取る",
  conversationId: "scope-owner",
  dogId: "dog-1",
  id: "log-1",
  observedCues: ["耳が後ろを向いた"],
  recordedAt: "2026-07-16T00:00:00.000Z",
};
const secondLog: ObservationLog = {
  chosenAction: "別室へ誘導する",
  conversationId: "scope-owner",
  dogId: "dog-1",
  id: "log-2",
  observedCues: ["体が硬くなった"],
  recordedAt: "2026-07-16T00:01:00.000Z",
};

describe("registerGetDogHistory", () => {
  it("実行時の会話スコープ内の確認済み観察だけを比較する", async () => {
    const registerTool = vi.fn();
    const observations = {
      list: vi.fn(async () => [firstLog, secondLog]),
    };
    const history = createHistoryDiff({ observations });

    registerGetDogHistory(
      { registerTool } as unknown as McpServer,
      history,
      ownerScope,
      true,
    );
    const handler = registerTool.mock.calls[0]?.[2] as (
      input: unknown,
    ) => Promise<unknown>;

    expect(registerTool).toHaveBeenCalledWith(
      "get_dog_history",
      expect.objectContaining({
        annotations: {
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
          readOnlyHint: true,
        },
      }),
      expect.any(Function),
    );
    await expect(
      handler({ dogId: "dog-1", recentLogs: [firstLog, secondLog] }),
    ).resolves.toEqual({
      content: [],
      structuredContent: {
        currentLog: secondLog,
        previousLog: firstLog,
        status: "available",
        summary: "同一会話内の確認済み観察を比較できます。",
      },
    });
    expect(observations.list).toHaveBeenCalledWith(ownerScope, "dog-1");
    await expect(
      handler({
        conversationId: "scope-other",
        dogId: "dog-1",
        recentLogs: [firstLog, secondLog],
      }),
    ).rejects.toThrow();
  });

  it("会話識別子が不安定な場合は推測せずunavailableを返す", async () => {
    const registerTool = vi.fn();
    const history = createHistoryDiff({
      observations: { list: vi.fn(async () => [firstLog, secondLog]) },
    });

    registerGetDogHistory(
      { registerTool } as unknown as McpServer,
      history,
      ownerScope,
      false,
    );
    const handler = registerTool.mock.calls[0]?.[2] as (
      input: unknown,
    ) => Promise<unknown>;

    await expect(
      handler({ dogId: "dog-1", recentLogs: [firstLog, secondLog] }),
    ).resolves.toEqual({
      content: [],
      structuredContent: {
        currentLog: null,
        previousLog: null,
        status: "unavailable",
        summary: "この会話では履歴比較を利用できません。",
      },
    });
  });
});
