import { describe, expect, it, vi } from "vitest";

import { createRuntimeAssessmentService } from "../../src/mcp/server.js";
import { createConversationScope } from "../../src/repositories.js";

const candidate = {
  additionalQuestion: null,
  confidence: "medium",
  evidenceSources: ["research"],
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

describe("createRuntimeAssessmentService", () => {
  it("実行時の音声能力が有効なら、条件付き音声をモデル入力に渡す", async () => {
    const model = {
      generateStructured: vi.fn(async () => candidate),
    };
    const service = createRuntimeAssessmentService(
      { audioAvailable: true, model } as never,
      { list: vi.fn(async () => []) },
    );

    await service.assess(
      createConversationScope(() => "scope"),
      {
        audio: {
          durationSeconds: 4,
          fileId: "audio-1",
          mimeType: "audio/wav",
        },
        barkDescription: "短く鋭い",
        context: "visitor",
        distanceToPerson: "2m",
        dogId: "dog-1",
        image: null,
        locale: "ja",
        precedingEvent: "チャイム",
      },
    );

    expect(model.generateStructured).toHaveBeenCalledWith(
      expect.objectContaining({
        evidence: expect.objectContaining({
          audio: expect.objectContaining({ fileId: "audio-1" }),
        }),
      }),
    );
  });
});
