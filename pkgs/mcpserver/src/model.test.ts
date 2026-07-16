import { describe, expect, it, vi } from "vitest";

import { createModelAdapter } from "./model.js";

const validCandidate = {
  additionalQuestion: null,
  confidence: "medium",
  evidenceSources: ["research"],
  limitations: "鳴き声の記述と状況だけでは断定できません。",
  observationPoints: ["耳の向き", "尻尾の高さ"],
  primaryHypothesis: {
    label: "警戒している可能性",
    rationale: "来客直後に反応しているためです。",
  },
  secondaryHypotheses: [],
  status: "success",
  suggestedAction: "玄関から距離を取り、刺激を下げて様子を見ます。",
};

describe("ModelAdapter", () => {
  it("偽のモデルから有効な構造化候補だけを返し、生出力の余分な情報を返さない", async () => {
    const gateway = {
      generateStructured: vi.fn(async () => ({
        ...validCandidate,
        rawModelOutput: "hidden",
        imageUrl: "https://files.example/dog.jpg",
      })),
    };
    const adapter = createModelAdapter(gateway);

    await expect(
      adapter.generate({ task: "visitor-assessment" }),
    ).resolves.toEqual({ kind: "valid", candidate: validCandidate });
    expect(gateway.generateStructured).toHaveBeenCalledWith({
      task: "visitor-assessment",
    });
  });

  it("不正な構造化候補を識別し、生出力やメディアURLを返さない", async () => {
    const adapter = createModelAdapter({
      generateStructured: async () => ({
        ...validCandidate,
        confidence: "certain",
        imageUrl: "https://files.example/dog.jpg",
        rawModelOutput: "hidden",
      }),
    });

    await expect(
      adapter.generate({ task: "visitor-assessment" }),
    ).resolves.toEqual({
      kind: "invalid",
      reason: "invalid_structured_candidate",
    });
  });
});
