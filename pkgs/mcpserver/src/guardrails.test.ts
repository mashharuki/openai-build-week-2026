import { describe, expect, it } from "vitest";

import { AssessmentResultSchema } from "@pawlens/shared";

import { applyGuardrails } from "./guardrails.js";

const candidate = {
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

describe("Guardrails", () => {
  it.each([
    { ...candidate, limitations: "" },
    { ...candidate, confidence: "certain" },
    {
      ...candidate,
      primaryHypothesis: {
        ...candidate.primaryHypothesis,
        label: "ぼくは怖い",
      },
    },
    {
      ...candidate,
      primaryHypothesis: {
        ...candidate.primaryHypothesis,
        label: "I am scared",
      },
    },
    {
      ...candidate,
      primaryHypothesis: {
        ...candidate.primaryHypothesis,
        rationale: "犬が『帰って』と言っています。",
      },
    },
    {
      ...candidate,
      primaryHypothesis: {
        ...candidate.primaryHypothesis,
        rationale: "犬は『帰って』と話している。",
      },
    },
    {
      ...candidate,
      primaryHypothesis: {
        ...candidate.primaryHypothesis,
        rationale: "これは行動診断です。",
      },
    },
  ])("不正または断定的な候補を行動可能なエラーへ変換する", (unsafe) => {
    expect(
      applyGuardrails(unsafe, {
        context: "visitor",
        locale: "ja",
        missingInformation: [],
      }),
    ).toEqual({
      kind: "error",
      message:
        "見立ての安全確認に失敗しました。入力を見直してからもう一度お試しください。",
      reason: "unsafe_candidate",
    });
  });

  it("来客外と状況不明を低確信度・限界・追加質問のある部分結果にする", () => {
    const other = applyGuardrails(candidate, {
      context: "other",
      locale: "ja",
      missingInformation: [],
    });
    const unknown = applyGuardrails(candidate, {
      context: "unknown",
      locale: "en",
      missingInformation: [],
    });

    expect(other).toMatchObject({
      kind: "safe",
      assessment: {
        confidence: "low",
        status: "partial",
        additionalQuestion: expect.stringContaining("来客場面ほど較正"),
        limitations: expect.stringContaining("来客場面ほど較正"),
      },
    });
    expect(unknown).toMatchObject({
      kind: "safe",
      assessment: {
        confidence: "low",
        status: "partial",
        additionalQuestion: expect.stringContaining("what happened"),
      },
    });
  });

  it("緊急性の兆候を見立てより優先し、安全と専門家相談を案内する", () => {
    expect(
      applyGuardrails(
        {
          ...candidate,
          observationPoints: ["過度の震え", "うずくまり"],
        },
        { context: "visitor", locale: "ja", missingInformation: [] },
      ),
    ).toEqual({
      kind: "safe",
      assessment: expect.objectContaining({
        confidence: "low",
        status: "urgent",
        suggestedAction:
          "安全を優先し、距離を確保してください。兆候が続く・悪化する場合は獣医師または行動専門家へ相談してください。",
      }),
    });
  });

  it("不足情報を低確信度の部分結果と具体的な再入力質問へ変換する", () => {
    expect(
      applyGuardrails(candidate, {
        context: "visitor",
        locale: "en",
        missingInformation: ["bark_description", "distance_to_person"],
      }),
    ).toMatchObject({
      kind: "safe",
      assessment: {
        confidence: "low",
        status: "partial",
        additionalQuestion: expect.stringContaining("bark description"),
        limitations: expect.stringContaining("bark description"),
      },
    });
  });

  it.each([
    {
      candidate,
      context: "visitor",
      locale: "en",
      missingInformation: [],
    },
    {
      candidate,
      context: "other",
      locale: "ja",
      missingInformation: [],
    },
    {
      candidate: { ...candidate, observationPoints: ["過度の震え"] },
      context: "visitor",
      locale: "ja",
      missingInformation: ["preceding_event"],
    },
  ] as const)(
    "すべての安全な結果に教育・観察支援であり専門的判断の代替ではない限界を付与する",
    ({ candidate: nextCandidate, context, locale, missingInformation }) => {
      const result = applyGuardrails(nextCandidate, {
        context,
        locale,
        missingInformation,
      });

      expect(result).toMatchObject({
        kind: "safe",
        assessment: {
          limitations: expect.stringMatching(
            locale === "ja"
              ? /専門的な判断の代替ではありません/u
              : /not a substitute for professional judgment/u,
          ),
        },
      });
    },
  );

  it("限界文への安全文言追記で共有スキーマを超える候補をエラーへ変換する", () => {
    expect(
      applyGuardrails(
        { ...candidate, limitations: "あ".repeat(1_000) },
        { context: "visitor", locale: "ja", missingInformation: [] },
      ),
    ).toEqual({
      kind: "error",
      message:
        "見立ての安全確認に失敗しました。入力を見直してからもう一度お試しください。",
      reason: "unsafe_candidate",
    });
  });

  it.each([
    {
      locale: "ja",
      limitation:
        "これは教育および観察支援であり、専門的な判断の代替ではありません。",
    },
    {
      locale: "en",
      limitation:
        "This is educational observation support and not a substitute for professional judgment.",
    },
  ] as const)(
    "専門的判断の非代替文言を %s でちょうど一度に正規化する",
    ({ locale, limitation }) => {
      const result = applyGuardrails(
        { ...candidate, limitations: `${limitation} ${limitation}` },
        { context: "visitor", locale, missingInformation: [] },
      );

      expect(result.kind).toBe("safe");
      if (result.kind !== "safe") {
        return;
      }

      expect(result.assessment.limitations.split(limitation)).toHaveLength(2);
    },
  );

  it.each([
    { candidate, context: "visitor", locale: "en", missingInformation: [] },
    { candidate, context: "other", locale: "ja", missingInformation: [] },
    {
      candidate: { ...candidate, observationPoints: ["過度の震え"] },
      context: "visitor",
      locale: "ja",
      missingInformation: [],
    },
  ] as const)("安全な変換結果は共有スキーマを満たす", (input) => {
    const result = applyGuardrails(input.candidate, input);

    expect(result.kind).toBe("safe");
    if (result.kind !== "safe") {
      return;
    }

    expect(AssessmentResultSchema.safeParse(result.assessment).success).toBe(
      true,
    );
  });
});
