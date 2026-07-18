import {
  type HistoryComparison,
  HistoryComparisonSchema,
  type ObservationLog,
  ObservationLogSchema,
  dedupeObservationLogs,
} from "@pawlens/shared";

import type { ConversationScope } from "./repositories.js";

const UNAVAILABLE_FOR_INSUFFICIENT_LOGS = {
  currentLog: null,
  previousLog: null,
  status: "unavailable",
  summary: "比較できる確認済み観察がまだありません。",
} as const;

const UNAVAILABLE_FOR_UNSTABLE_CONVERSATION = {
  currentLog: null,
  previousLog: null,
  status: "unavailable",
  summary: "この会話では履歴比較を利用できません。",
} as const;

export interface HistoryDiffInput {
  conversationStable: boolean;
  dogId: string;
  recentLogs: readonly ObservationLog[];
}

export interface ObservationLogReader {
  list(scope: ConversationScope, dogId: string): Promise<ObservationLog[]>;
}

export interface HistoryDiff {
  compare(
    scope: ConversationScope,
    input: HistoryDiffInput,
  ): Promise<HistoryComparison>;
}

export interface HistoryDiffDependencies {
  observations: ObservationLogReader;
}

function validateRecentLogs(
  scope: ConversationScope,
  dogId: string,
  recentLogs: readonly ObservationLog[],
): ObservationLog[] {
  return recentLogs.map((log) => {
    const parsed = ObservationLogSchema.parse(log);

    if (parsed.conversationId !== scope) {
      throw new Error(
        "Recent logs must belong to the current conversation scope.",
      );
    }

    if (parsed.dogId !== dogId) {
      throw new Error("Recent logs must belong to the requested dog.");
    }

    return parsed;
  });
}

function sortLogs(logs: readonly ObservationLog[]): ObservationLog[] {
  return [...logs].sort((left, right) => {
    const timeDifference =
      new Date(left.recordedAt).getTime() -
      new Date(right.recordedAt).getTime();

    return timeDifference === 0
      ? left.id.localeCompare(right.id)
      : timeDifference;
  });
}

export function createHistoryDiff(
  dependencies: HistoryDiffDependencies,
): HistoryDiff {
  return {
    async compare(scope, input) {
      if (!input.conversationStable) {
        // A transport session is not enough to prove a ChatGPT conversation;
        // withholding a comparison is safer than inventing a cross-turn diff.
        return HistoryComparisonSchema.parse(
          UNAVAILABLE_FOR_UNSTABLE_CONVERSATION,
        );
      }

      const recentLogs = validateRecentLogs(
        scope,
        input.dogId,
        input.recentLogs,
      );
      const persistedLogs = await dependencies.observations.list(
        scope,
        input.dogId,
      );
      // KV is eventually consistent. Merge the widget's just-saved logs, then
      // deduplicate by ID so a second-round comparison is deterministic.
      const logs = sortLogs(
        dedupeObservationLogs([...recentLogs, ...persistedLogs]),
      );

      if (logs.length < 2) {
        return HistoryComparisonSchema.parse(UNAVAILABLE_FOR_INSUFFICIENT_LOGS);
      }

      return HistoryComparisonSchema.parse({
        currentLog: logs.at(-1),
        previousLog: logs.at(-2),
        status: "available",
        summary: "同一会話内の確認済み観察を比較できます。",
      });
    },
  };
}
