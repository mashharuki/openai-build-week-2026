import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AssessmentResult, ObservationLog } from "@pawlens/shared";
import { describe, expect, it, vi } from "vitest";

import { createAssessmentService } from "../../pkgs/mcpserver/src/assessment-service.js";
import { createHistoryDiff } from "../../pkgs/mcpserver/src/history-diff.js";
import { registerPawLensTools } from "../../pkgs/mcpserver/src/mcp/server.js";
import { createObservationService } from "../../pkgs/mcpserver/src/observation-service.js";
import {
  createConversationScope,
  createProfileRepository,
} from "../../pkgs/mcpserver/src/repositories.js";

class InMemoryKv {
  readonly entries = new Map<string, string>();

  async delete(key: string): Promise<void> {
    this.entries.delete(key);
  }

  async get(key: string): Promise<string | null> {
    return this.entries.get(key) ?? null;
  }

  async list(options: { cursor?: string; prefix?: string }): Promise<{
    keys: Array<{ name: string }>;
    list_complete: true;
  }> {
    return {
      keys: [...this.entries.keys()]
        .filter((key) => key.startsWith(options.prefix ?? ""))
        .map((name) => ({ name })),
      list_complete: true,
    };
  }

  async put(key: string, value: string): Promise<void> {
    this.entries.set(key, value);
  }
}

const safeCandidate: AssessmentResult = {
  additionalQuestion: null,
  confidence: "medium",
  evidenceSources: ["research"],
  limitations: "観察だけでは断定できません。",
  observationPoints: ["耳としっぽの向きを確認してください。"],
  primaryHypothesis: {
    label: "警戒している可能性",
    rationale: "来客やチャイムの直後に吠えています。",
  },
  secondaryHypotheses: [],
  status: "success",
  suggestedAction: "人と距離を取り、静かな場所へ誘導してください。",
};

function registeredHandlers() {
  const kv = new InMemoryKv();
  const registerTool = vi.fn();
  const ids = ["dog-1", "log-1", "log-2"];
  const createId = () => ids.shift() ?? "unexpected-id";
  const now = vi
    .fn<() => Date>()
    .mockReturnValueOnce(new Date("2026-07-16T00:00:00.000Z"))
    .mockReturnValueOnce(new Date("2026-07-16T00:01:00.000Z"))
    .mockReturnValueOnce(new Date("2026-07-16T00:02:00.000Z"));
  const scope = createConversationScope(() => "conversation-1");
  const profiles = createProfileRepository({
    createId,
    kv: kv as unknown as KVNamespace,
    now,
  });
  const observations = createObservationService({
    createId,
    kv: kv as unknown as KVNamespace,
    now,
    profiles,
  });
  const model = {
    generate: vi.fn(async () => ({
      candidate: safeCandidate,
      kind: "valid" as const,
    })),
  };
  const assessments = createAssessmentService({ model, observations });

  registerPawLensTools({ registerTool } as unknown as McpServer, {
    assessments,
    conversationStable: true,
    history: createHistoryDiff({ observations }),
    observations,
    profiles,
    scope,
  });

  return {
    handlers: Object.fromEntries(
      registerTool.mock.calls.map(([name, _descriptor, handler]) => [
        name,
        handler,
      ]),
    ) as Record<
      string,
      (input: unknown) => Promise<{ structuredContent: unknown }>
    >,
    model,
  };
}

describe("PawLens MCP flow", () => {
  it("実際のツール境界で、見立てから飼い主確認済みの2回目比較まで確認済み事実だけを使う", async () => {
    const { handlers, model } = registeredHandlers();
    const profile = (
      await handlers.manage_dog_profile({
        action: "create",
        name: "ココ",
        temperamentNote: null,
      })
    ).structuredContent as { profile: { id: string } };
    const firstAssessment = (
      await handlers.analyze_dog_signal({
        audio: null,
        barkDescription: "短く鋭く吠えた",
        context: "visitor",
        distanceToPerson: "2m",
        dogId: profile.profile.id,
        image: null,
        locale: "ja",
        precedingEvent: "チャイム",
      })
    ).structuredContent as AssessmentResult;

    expect(firstAssessment.primaryHypothesis.label).toContain("可能性");
    expect(firstAssessment.limitations).not.toBe("");

    const firstLog = (
      await handlers.save_observation({
        chosenAction: "玄関から距離を取る",
        dogId: profile.profile.id,
        observedCues: ["耳が後ろを向いた"],
      })
    ).structuredContent as ObservationLog;
    const secondAssessment = (
      await handlers.analyze_dog_signal({
        audio: null,
        barkDescription: "チャイムの後に短く吠えた",
        context: "visitor",
        distanceToPerson: "3m",
        dogId: profile.profile.id,
        image: null,
        locale: "ja",
        precedingEvent: "チャイム",
      })
    ).structuredContent as AssessmentResult;

    expect(secondAssessment.primaryHypothesis.label).toContain("可能性");
    expect(model.generate).toHaveBeenLastCalledWith(
      expect.objectContaining({ observations: [firstLog] }),
    );
    const secondLog = (
      await handlers.save_observation({
        chosenAction: "別室へ誘導する",
        dogId: profile.profile.id,
        observedCues: ["体が硬くなった"],
      })
    ).structuredContent as ObservationLog;
    const comparison = (
      await handlers.get_dog_history({
        dogId: profile.profile.id,
        recentLogs: [firstLog, secondLog],
      })
    ).structuredContent as {
      currentLog: ObservationLog | null;
      previousLog: ObservationLog | null;
      status: string;
    };

    expect(comparison).toMatchObject({
      currentLog: secondLog,
      previousLog: firstLog,
      status: "available",
    });
    expect(JSON.stringify([firstLog, secondLog, comparison])).not.toContain(
      firstAssessment.primaryHypothesis.label,
    );
    expect(model.generate).toHaveBeenCalledWith(
      expect.objectContaining({ observations: [] }),
    );
  });

  it("記録不足・来客外・状況不明・画像なしで比較や見立てを断定しない", async () => {
    const { handlers } = registeredHandlers();
    const profile = (
      await handlers.manage_dog_profile({
        action: "create",
        name: "ココ",
        temperamentNote: null,
      })
    ).structuredContent as { profile: { id: string } };
    const assessment = (
      await handlers.analyze_dog_signal({
        audio: null,
        barkDescription: "急に何度も吠えた",
        context: "other",
        distanceToPerson: null,
        dogId: profile.profile.id,
        image: null,
        locale: "ja",
        precedingEvent: null,
      })
    ).structuredContent as AssessmentResult;
    const onlyLog = (
      await handlers.save_observation({
        chosenAction: "距離を取る",
        dogId: profile.profile.id,
        observedCues: ["後ずさりした"],
      })
    ).structuredContent as ObservationLog;
    const comparison = (
      await handlers.get_dog_history({
        dogId: profile.profile.id,
        recentLogs: [onlyLog],
      })
    ).structuredContent as {
      currentLog: ObservationLog | null;
      previousLog: ObservationLog | null;
      status: string;
    };

    expect(assessment).toMatchObject({ confidence: "low", status: "partial" });
    expect(assessment.primaryHypothesis.label).toContain("可能性");
    expect(assessment.additionalQuestion).not.toBeNull();
    const unknownContextAssessment = (
      await handlers.analyze_dog_signal({
        audio: null,
        barkDescription: "何度も吠えた",
        context: "unknown",
        distanceToPerson: null,
        dogId: profile.profile.id,
        image: null,
        locale: "ja",
        precedingEvent: null,
      })
    ).structuredContent as AssessmentResult;

    expect(unknownContextAssessment).toMatchObject({ confidence: "low" });
    expect(unknownContextAssessment.primaryHypothesis.label).toContain(
      "可能性",
    );
    expect(comparison).toMatchObject({
      currentLog: null,
      previousLog: null,
      status: "unavailable",
    });
  });

  it("添付非対応や不適合画像では記述だけの安全な低確信度フローへ縮退する", async () => {
    const { handlers } = registeredHandlers();
    const profile = (
      await handlers.manage_dog_profile({
        action: "create",
        name: "ココ",
        temperamentNote: null,
      })
    ).structuredContent as { profile: { id: string } };
    const assessment = (
      await handlers.analyze_dog_signal({
        audio: {
          durationSeconds: 4,
          fileId: "audio-1",
          mimeType: "audio/wav",
        },
        barkDescription: "短く鋭く吠えた",
        context: "visitor",
        distanceToPerson: "2m",
        dogId: profile.profile.id,
        image: { fileId: "image-1", mimeType: "text/plain" },
        locale: "ja",
        precedingEvent: "チャイム",
      })
    ).structuredContent as AssessmentResult;

    expect(assessment).toMatchObject({ confidence: "low", status: "partial" });
    expect(assessment.additionalQuestion).not.toBeNull();
    expect(assessment.limitations).toContain("音声");
    expect(assessment.limitations).toContain("視覚的な手がかり");
  });
});
