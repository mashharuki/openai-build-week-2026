import { describe, expect, it, vi } from "vitest";

import { createHistoryDiff } from "./history-diff.js";
import { createConversationScope } from "./repositories.js";

const scope = createConversationScope(() => "scope-owner");
const firstLog = {
  chosenAction: "玄関から距離を取る",
  conversationId: "scope-owner",
  dogId: "dog-1",
  id: "log-1",
  observedCues: ["耳が後ろを向いた"],
  recordedAt: "2026-07-16T00:00:00.000Z",
};
const secondLog = {
  chosenAction: "別室へ誘導する",
  conversationId: "scope-owner",
  dogId: "dog-1",
  id: "log-2",
  observedCues: ["体が硬くなった"],
  recordedAt: "2026-07-16T00:01:00.000Z",
};

describe("HistoryDiff", () => {
  it("KVの既存記録と保存直後のrecentLogsを重複排除して同一会話内の2回目比較に使う", async () => {
    const observations = {
      list: vi.fn(async () => [firstLog]),
    };
    const history = createHistoryDiff({ observations });

    await expect(
      history.compare(scope, {
        conversationStable: true,
        dogId: "dog-1",
        recentLogs: [firstLog, secondLog],
      }),
    ).resolves.toEqual({
      currentLog: secondLog,
      previousLog: firstLog,
      status: "available",
      summary: "同一会話内の確認済み観察を比較できます。",
    });
    expect(observations.list).toHaveBeenCalledWith(scope, "dog-1");
  });

  it("記録不足または会話ID不安定時は推測せずunavailableを返す", async () => {
    const observations = {
      list: vi.fn(async () => [firstLog]),
    };
    const history = createHistoryDiff({ observations });

    await expect(
      history.compare(scope, {
        conversationStable: true,
        dogId: "dog-1",
        recentLogs: [],
      }),
    ).resolves.toEqual({
      currentLog: null,
      previousLog: null,
      status: "unavailable",
      summary: "比較できる確認済み観察がまだありません。",
    });
    await expect(
      history.compare(scope, {
        conversationStable: false,
        dogId: "dog-1",
        recentLogs: [firstLog, secondLog],
      }),
    ).resolves.toEqual({
      currentLog: null,
      previousLog: null,
      status: "unavailable",
      summary: "この会話では履歴比較を利用できません。",
    });
    expect(observations.list).toHaveBeenCalledTimes(1);
  });

  it("別スコープまたは別個体のrecentLogsを比較へ混入させない", async () => {
    const history = createHistoryDiff({
      observations: { list: vi.fn(async () => [firstLog, secondLog]) },
    });

    await expect(
      history.compare(scope, {
        conversationStable: true,
        dogId: "dog-1",
        recentLogs: [{ ...secondLog, conversationId: "scope-other" }],
      }),
    ).rejects.toThrow(
      "Recent logs must belong to the current conversation scope.",
    );
    await expect(
      history.compare(scope, {
        conversationStable: true,
        dogId: "dog-1",
        recentLogs: [{ ...secondLog, dogId: "dog-other" }],
      }),
    ).rejects.toThrow("Recent logs must belong to the requested dog.");
  });
});
