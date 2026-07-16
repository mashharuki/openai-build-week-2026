import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type {
  AssessmentResult,
  HistoryComparison,
  ObservationLog,
} from "@pawlens/shared";
import { describe, expect, it, vi } from "vitest";

import type { AssessmentService } from "../../src/assessment-service.js";
import type { HistoryDiff } from "../../src/history-diff.js";
import { registerPawLensTools } from "../../src/mcp/server.js";
import type { ObservationService } from "../../src/observation-service.js";
import type { ProfileRepository } from "../../src/repositories.js";
import { createConversationScope } from "../../src/repositories.js";

const scope = createConversationScope(() => "session-owner");
const observation: ObservationLog = {
  chosenAction: "別室へ誘導する",
  conversationId: "session-owner",
  dogId: "dog-1",
  id: "log-1",
  observedCues: ["体が硬くなった"],
  recordedAt: "2026-07-16T00:00:00.000Z",
};
const assessment: AssessmentResult = {
  additionalQuestion: null,
  confidence: "medium",
  evidenceSources: ["research"],
  limitations: "観察だけでは断定できません。",
  observationPoints: ["耳の向きを確認してください。"],
  primaryHypothesis: {
    label: "警戒の可能性",
    rationale: "来客直後の反応です。",
  },
  secondaryHypotheses: [],
  status: "success",
  suggestedAction: "距離を取ります。",
};
const comparison: HistoryComparison = {
  currentLog: observation,
  previousLog: observation,
  status: "available",
  summary: "同一会話内の確認済み観察を比較できます。",
};

describe("registerPawLensTools", () => {
  it("4ツールを正しいApps SDK記述子で列挙し、それぞれ呼び出せる", async () => {
    const registerTool = vi.fn();
    const assessments: AssessmentService = {
      assess: vi.fn(async () => assessment),
    };
    const history: HistoryDiff = { compare: vi.fn(async () => comparison) };
    const observations: ObservationService = {
      list: vi.fn(async () => []),
      save: vi.fn(async () => observation),
    };
    const profiles: ProfileRepository = {
      create: vi.fn(async () => ({
        createdAt: "2026-07-16T00:00:00.000Z",
        id: "dog-1",
        name: "ココ",
        temperamentNote: null,
        updatedAt: "2026-07-16T00:00:00.000Z",
      })),
      delete: vi.fn(async () => true),
      get: vi.fn(async () => null),
      registerDeletionHandler: vi.fn(),
      update: vi.fn(async () => null),
    };

    registerPawLensTools({ registerTool } as unknown as McpServer, {
      assessments,
      conversationStable: true,
      history,
      observations,
      profiles,
      scope,
    });

    expect(registerTool.mock.calls.map(([name]) => name)).toEqual([
      "analyze_dog_signal",
      "get_dog_history",
      "manage_dog_profile",
      "save_observation",
    ]);
    const descriptors = Object.fromEntries(
      registerTool.mock.calls.map(([name, descriptor]) => [name, descriptor]),
    );
    expect(descriptors).toMatchObject({
      analyze_dog_signal: {
        annotations: {
          destructiveHint: false,
          idempotentHint: true,
          readOnlyHint: true,
        },
      },
      get_dog_history: {
        annotations: {
          destructiveHint: false,
          idempotentHint: true,
          readOnlyHint: true,
        },
      },
      manage_dog_profile: {
        annotations: {
          destructiveHint: true,
          idempotentHint: false,
          readOnlyHint: false,
        },
      },
      save_observation: {
        _meta: { ui: { visibility: ["app"] } },
        annotations: {
          destructiveHint: false,
          idempotentHint: false,
          readOnlyHint: false,
        },
      },
    });

    const handlers = Object.fromEntries(
      registerTool.mock.calls.map(([name, _descriptor, handler]) => [
        name,
        handler,
      ]),
    ) as Record<string, (input: unknown) => Promise<unknown>>;
    await expect(
      handlers.analyze_dog_signal({
        audio: null,
        barkDescription: "短く鋭い",
        context: "visitor",
        distanceToPerson: null,
        dogId: "dog-1",
        image: null,
        locale: "ja",
        precedingEvent: null,
      }),
    ).resolves.toMatchObject({ structuredContent: assessment });
    await expect(
      handlers.get_dog_history({ dogId: "dog-1", recentLogs: [] }),
    ).resolves.toMatchObject({ structuredContent: comparison });
    await expect(
      handlers.manage_dog_profile({
        action: "create",
        name: "ココ",
        temperamentNote: null,
      }),
    ).resolves.toMatchObject({ structuredContent: { status: "created" } });
    await expect(
      handlers.save_observation({
        chosenAction: observation.chosenAction,
        dogId: observation.dogId,
        observedCues: observation.observedCues,
      }),
    ).resolves.toMatchObject({ structuredContent: observation });
  });
});
