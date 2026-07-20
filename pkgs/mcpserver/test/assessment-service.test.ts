import { AssessmentResultSchema } from "@pawlens/shared";
import { describe, expect, it, vi } from "vitest";

import { createAssessmentService } from "../src/assessment-service.js";
import { createConversationScope } from "../src/repositories.js";

const candidate = {
  additionalQuestion: null,
  confidence: "medium",
  evidenceSources: ["research", "confirmed_observation"],
  limitations: "観察だけでは断定できません。",
  observationPoints: ["耳の向き"],
  primaryHypothesis: {
    label: "警戒している可能性",
    rationale: "来客直後の反応です。",
  },
  secondaryHypotheses: [],
  status: "success",
  suggestedAction: "距離を取ります。",
};

const scope = createConversationScope(() => "scope");
const input = {
  audio: null,
  barkDescription: "短く鋭い",
  context: "visitor" as const,
  distanceToPerson: "2m",
  dogId: "dog-1",
  image: null,
  locale: "ja" as const,
  precedingEvent: "チャイム",
};

describe("AssessmentService", () => {
  it("記述だけの主要フローを研究根拠と確認済み観察で組み立て、安全な構造化結果を返す", async () => {
    const model = {
      generate: vi.fn(async () => ({ candidate, kind: "valid" as const })),
    };
    const observation = {
      chosenAction: "距離を取った",
      conversationId: scope,
      dogId: "dog-1",
      id: "observation-1",
      observedCues: ["耳が後ろ向き"],
      recordedAt: "2026-07-16T00:00:00.000Z",
    };
    const service = createAssessmentService({
      model,
      observations: { list: vi.fn(async () => [observation]) },
    });

    const result = await service.assess(scope, input);

    expect(result).toMatchObject({
      evidenceSummary: [
        { kind: "owner_description", status: "included" },
        { kind: "photo", status: "not_provided" },
        { kind: "audio", status: "not_provided" },
        { kind: "confirmed_observations", status: "included" },
        { kind: "research", status: "included" },
      ],
      observationTimeline: [
        { kind: "preceding_event", value: "チャイム" },
        { kind: "reaction", value: "短く鋭い" },
        { kind: "distance", value: "2m" },
      ],
      resources: [
        expect.objectContaining({
          href: "https://www.jvma.or.jp/",
          kind: "professional",
        }),
      ],
      status: "success",
    });
    expect(AssessmentResultSchema.safeParse(result).success).toBe(true);
    expect(model.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        input,
        observations: [observation],
        repair: false,
        research: expect.any(Array),
      }),
    );
  });

  it("有効な画像と音声を添付したフローで、利用可能な証拠を渡して検証済み結果を返す", async () => {
    const model = {
      generate: vi.fn(async () => ({ candidate, kind: "valid" as const })),
    };
    const service = createAssessmentService({
      audioCapability: { available: true },
      model,
      observations: { list: vi.fn(async () => []) },
    });
    const withAttachments = {
      ...input,
      audio: {
        durationSeconds: 4,
        fileId: "audio-1",
        mimeType: "audio/wav",
        name: "bark.wav",
        url: "https://example.test/bark.wav",
      },
      image: {
        fileId: "image-1",
        mimeType: "image/jpeg",
        name: "dog.jpg",
        url: "https://example.test/dog.jpg",
      },
    };

    const result = await service.assess(scope, withAttachments);

    expect(result).toMatchObject({ status: "success" });
    expect(result.evidenceSummary).toEqual(
      expect.arrayContaining([
        { kind: "audio", status: "included" },
        { kind: "photo", status: "included" },
      ]),
    );
    expect(AssessmentResultSchema.safeParse(result).success).toBe(true);
    expect(model.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        evidence: expect.objectContaining({
          audio: expect.objectContaining({
            fileId: "audio-1",
            mimeType: "audio/wav",
          }),
          image: expect.objectContaining({
            fileId: "image-1",
            mimeType: "image/jpeg",
          }),
          kind: "ready",
        }),
      }),
    );
  });

  it("候補が不正なら一度だけ修復し、再失敗時は生出力を返さない", async () => {
    const model = {
      generate: vi
        .fn()
        .mockResolvedValueOnce({
          kind: "invalid" as const,
          reason: "invalid_structured_candidate" as const,
        })
        .mockResolvedValueOnce({
          kind: "invalid" as const,
          reason: "invalid_structured_candidate" as const,
        }),
    };
    const service = createAssessmentService({
      model,
      observations: { list: vi.fn(async () => []) },
    });

    await expect(service.assess(scope, input)).resolves.toMatchObject({
      status: "error",
    });
    expect(model.generate).toHaveBeenCalledTimes(2);
    expect(model.generate).toHaveBeenLastCalledWith(
      expect.objectContaining({ repair: true }),
    );
  });

  it("利用できない添付があっても、低確信度の部分結果として継続する", async () => {
    const model = {
      generate: vi.fn(async () => ({ candidate, kind: "valid" as const })),
    };
    const service = createAssessmentService({
      model,
      observations: { list: vi.fn(async () => []) },
    });

    const result = await service.assess(scope, {
      ...input,
      audio: {
        durationSeconds: 0.5,
        fileId: "audio-too-short",
        mimeType: "audio/wav",
      },
      image: {
        fileId: "not-an-image",
        mimeType: "text/plain",
      },
    });

    expect(result).toMatchObject({ confidence: "low", status: "partial" });
    expect(result.evidenceSummary).toEqual(
      expect.arrayContaining([
        { kind: "audio", status: "unavailable" },
        { kind: "photo", status: "unavailable" },
      ]),
    );
    expect(result.limitations).toContain("音声を録り直す");
  });

  it("英語の通常・緊急結果には、監査済みのAVSAB導線だけを返す", async () => {
    const model = {
      generate: vi.fn(async () => ({ candidate, kind: "valid" as const })),
    };
    const service = createAssessmentService({
      model,
      observations: { list: vi.fn(async () => []) },
    });

    const normal = await service.assess(scope, { ...input, locale: "en" });
    expect(normal.resources).toEqual([
      expect.objectContaining({
        href: "https://avsab.org/resources/position-statements/",
        kind: "education",
      }),
      expect.objectContaining({
        href: "https://avsab.org/directory/",
        kind: "professional",
      }),
    ]);

    const urgentService = createAssessmentService({
      model: {
        generate: vi.fn(async () => ({
          candidate: {
            ...candidate,
            limitations: "The dog is trembling excessively.",
          },
          kind: "valid" as const,
        })),
      },
      observations: { list: vi.fn(async () => []) },
    });
    const urgent = await urgentService.assess(scope, {
      ...input,
      locale: "en",
    });
    expect(urgent.status).toBe("urgent");
    expect(urgent.resources).toEqual([
      expect.objectContaining({
        href: "https://avsab.org/directory/",
        kind: "professional",
      }),
    ]);
  });

  it("モデル例外時も一度だけ再試行し、行動可能な安全エラーを返す", async () => {
    const model = {
      generate: vi.fn(async () => {
        throw new Error("gateway unavailable");
      }),
    };
    const service = createAssessmentService({
      model,
      observations: { list: vi.fn(async () => []) },
    });

    await expect(service.assess(scope, input)).resolves.toMatchObject({
      status: "error",
    });
    expect(model.generate).toHaveBeenCalledTimes(2);
  });

  it("成功、部分成功、生成失敗、緊急性を許可済み監視メタデータだけで記録する", async () => {
    const events: unknown[] = [];
    const telemetry = { record: (event: unknown) => events.push(event) };
    const createService = (model: {
      generate: () => Promise<
        | { candidate: typeof candidate; kind: "valid" }
        | { kind: "invalid"; reason: "invalid_structured_candidate" }
      >;
    }) =>
      createAssessmentService({
        audioCapability: { available: true },
        createCorrelationId: () => `correlation-${events.length + 1}`,
        model,
        now: () => 100,
        observations: { list: vi.fn(async () => []) },
        telemetry,
      });

    await createService({
      generate: async () => ({ candidate, kind: "valid" }),
    }).assess(scope, input);
    await createService({
      generate: async () => ({ candidate, kind: "valid" }),
    }).assess(scope, {
      ...input,
      image: { fileId: "not-an-image", mimeType: "text/plain" },
    });
    await createService({
      generate: async () => ({
        kind: "invalid",
        reason: "invalid_structured_candidate",
      }),
    }).assess(scope, input);
    await createService({
      generate: async () => ({
        candidate: { ...candidate, limitations: "過度の震えが見られます。" },
        kind: "valid",
      }),
    }).assess(scope, input);

    expect(events).toEqual([
      {
        audioAvailable: true,
        correlationId: "correlation-1",
        latencyMs: 0,
        resultKind: "success",
        schemaFailureKind: "none",
        toolName: "analyze_dog_signal",
      },
      {
        audioAvailable: true,
        correlationId: "correlation-2",
        latencyMs: 0,
        resultKind: "partial",
        schemaFailureKind: "none",
        toolName: "analyze_dog_signal",
      },
      {
        audioAvailable: true,
        correlationId: "correlation-3",
        latencyMs: 0,
        resultKind: "error",
        schemaFailureKind: "model_invalid",
        toolName: "analyze_dog_signal",
      },
      {
        audioAvailable: true,
        correlationId: "correlation-4",
        latencyMs: 0,
        resultKind: "urgent",
        schemaFailureKind: "none",
        toolName: "analyze_dog_signal",
      },
    ]);
    expect(JSON.stringify(events)).not.toContain("not-an-image");
  });
});
