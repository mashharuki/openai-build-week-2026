import { describe, expect, it } from "vitest";

import { toWidgetState } from "./widget-state.js";

const assessmentResult = {
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
  suggestedAction: "玄関から距離を取ります。",
} as const;

describe("widget state", () => {
  it("構造化された見立てだけをsuccess状態に変換する", () => {
    expect(toWidgetState(assessmentResult)).toEqual({
      assessment: assessmentResult,
      kind: "success",
    });
  });

  it("構造化されていないツール結果を表示前にerror状態へ拒否する", () => {
    expect(toWidgetState({ greeting: "Hello PawLens" })).toEqual({
      kind: "error",
      message: "ツール結果を安全に表示できません。もう一度お試しください。",
    });
  });

  it("empty、loading、success、errorの型付き状態を公開する", () => {
    expect(toWidgetState(undefined)).toEqual({ kind: "empty" });
    expect(toWidgetState({ loading: true })).toEqual({ kind: "loading" });
  });
});
