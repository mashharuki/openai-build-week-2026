// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AssessmentResult, HistoryComparison } from "@pawlens/shared";

import { AssessmentCard } from "../src/assessment-card.js";

const assessment: AssessmentResult = {
  additionalQuestion: "耳の向きは玄関へ固定されていますか？",
  confidence: "low",
  evidenceSources: ["research", "confirmed_observation"],
  limitations: "短い観察だけでは理由を断定できません。",
  observationPoints: ["耳の向き", "体の硬さ"],
  primaryHypothesis: {
    label: "警戒の可能性",
    rationale: "来客直後の反応として説明できます。",
  },
  secondaryHypotheses: [
    { label: "期待による興奮の可能性", rationale: "玄関へ近づく反応です。" },
  ],
  status: "success",
  suggestedAction: "玄関から距離を取り、静かな場所へ誘導します。",
};

const history: HistoryComparison = {
  currentLog: null,
  previousLog: null,
  status: "unavailable",
  summary: "比較できる記録がまだありません。",
};

afterEach(cleanup);

describe("AssessmentCard", () => {
  it("通常・低確信度の見立てに仮説、根拠、限界、質問、未確認観察、主行動と専門家導線を表示する", () => {
    render(<AssessmentCard assessment={assessment} dogName="ココ" />);

    expect(
      screen.getByRole("heading", { name: "ココの見立て結果" }),
    ).not.toBeNull();
    expect(screen.getByText("警戒の可能性")).not.toBeNull();
    expect(screen.getByText("確信度: 低")).not.toBeNull();
    expect(screen.getByText("研究知見")).not.toBeNull();
    expect(screen.getByText("飼い主が確認した観察")).not.toBeNull();
    expect(screen.getByText(assessment.limitations)).not.toBeNull();
    expect(
      screen.getByText("耳の向きは玄関へ固定されていますか？"),
    ).not.toBeNull();
    expect(screen.getByText("未確認の観察ポイント")).not.toBeNull();
    expect(screen.getByText(assessment.suggestedAction)).not.toBeNull();
    expect(
      screen.getByRole("link", { name: "獣医師・行動専門家に相談する" }),
    ).not.toBeNull();
  });

  it("詳細は明示操作まで開かず、開くと次点仮説・観察説明・履歴を表示する", () => {
    render(<AssessmentCard assessment={assessment} history={history} />);

    expect(screen.queryByText("期待による興奮の可能性")).toBeNull();
    expect(screen.queryByText(history.summary)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "詳細を表示" }));

    expect(screen.getByText("期待による興奮の可能性")).not.toBeNull();
    expect(
      screen.getByText(/飼い主自身が確認した事実だけを記録します/),
    ).not.toBeNull();
    expect(screen.getByText(history.summary)).not.toBeNull();
  });

  it("緊急案内は通常の結果・システムエラーと区別して安全行動と専門家導線を優先する", () => {
    render(
      <AssessmentCard
        assessment={{ ...assessment, status: "urgent" }}
        dogName="ココ"
      />,
    );

    expect(screen.getByRole("alert")).not.toBeNull();
    expect(
      screen.getByRole("heading", { name: "緊急の安全案内" }),
    ).not.toBeNull();
    expect(screen.getByText(assessment.suggestedAction)).not.toBeNull();
    expect(screen.queryByText("システムエラー")).toBeNull();
    expect(screen.queryByRole("button", { name: "詳細を表示" })).toBeNull();
  });

  it("追加質問がない低確信度でも、次に確認する安全な補足を表示する", () => {
    render(
      <AssessmentCard
        assessment={{
          ...assessment,
          additionalQuestion: null,
          confidence: "low",
        }}
      />,
    );

    expect(screen.getByText("確信度: 低")).not.toBeNull();
    expect(
      screen.getByText("次に、耳の向きや体の硬さを確認できますか？"),
    ).not.toBeNull();
  });

  it("結果エラーは緊急案内と異なるシステムエラーとして表示する", () => {
    render(<AssessmentCard assessment={{ ...assessment, status: "error" }} />);

    expect(screen.getByLabelText("システムエラー")).not.toBeNull();
    expect(
      screen.getByRole("heading", { name: "システムエラー" }),
    ).not.toBeNull();
    expect(screen.getByRole("alert").style.color).toBe("rgb(185, 28, 28)");
    expect(screen.queryByText("緊急の安全案内")).toBeNull();
  });

  it("英語でも仮説、限界、観察、次の一手、追加質問を一貫して表示する", () => {
    render(<AssessmentCard assessment={assessment} locale="en" />);

    expect(screen.getByRole("heading", { name: "Assessment" })).not.toBeNull();
    expect(screen.getByText("Primary possibility")).not.toBeNull();
    expect(screen.getByText("Confidence: low")).not.toBeNull();
    expect(screen.getByText("Limits of this assessment")).not.toBeNull();
    expect(screen.getByText("What to check next")).not.toBeNull();
    expect(screen.getByText("A calm next step")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Show details" })).not.toBeNull();
  });

  it("詳細操作はキーボードでフォーカスでき、色以外の状態ラベルを持つ", () => {
    render(<AssessmentCard assessment={assessment} />);

    const button = screen.getByRole("button", { name: "詳細を表示" });
    button.focus();
    expect(document.activeElement).toBe(button);
    expect(screen.getByText("確信度: 低")).not.toBeNull();
  });

  it("必要に応じてChatGPTへ続きの相談を投稿できる", () => {
    const onFollowUp = vi.fn();
    render(<AssessmentCard assessment={assessment} onFollowUp={onFollowUp} />);

    fireEvent.click(
      screen.getByRole("button", { name: "ChatGPTで続きを相談する" }),
    );

    expect(onFollowUp).toHaveBeenCalledOnce();
  });

  it("会話主導モードでは、ウィジェット内の操作ボタンを表示しない", () => {
    render(<AssessmentCard assessment={assessment} readOnly />);

    expect(screen.queryByRole("button")).toBeNull();
    expect(
      screen.queryByRole("link", { name: "獣医師・行動専門家に相談する" }),
    ).toBeNull();
  });
});
