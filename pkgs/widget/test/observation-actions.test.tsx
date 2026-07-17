// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  type AssessmentResult,
  type ObservationLog,
  getErrorMessage,
} from "@pawlens/shared";

import { ObservationActions } from "../src/observation-actions.js";

const assessment: AssessmentResult = {
  additionalQuestion: null,
  confidence: "medium",
  evidenceSources: ["research"],
  limitations: "観察だけでは断定できません。",
  observationPoints: ["耳の向き", "体の硬さ"],
  primaryHypothesis: {
    label: "警戒の可能性",
    rationale: "来客直後の反応です。",
  },
  secondaryHypotheses: [],
  status: "success",
  suggestedAction: "玄関から距離を取ります。",
};

const savedLog: ObservationLog = {
  chosenAction: assessment.suggestedAction,
  conversationId: "server-session",
  dogId: "dog-1",
  id: "log-1",
  observedCues: ["耳の向き"],
  recordedAt: "2026-07-17T00:00:00.000Z",
};

afterEach(() => {
  cleanup();
});

describe("ObservationActions", () => {
  it("プライバシー確認と飼い主の観察確認後だけ、確認済み事実だけを保存して比較する", async () => {
    const callTool = vi.fn(async (name: string) => {
      if (name === "save_observation") return savedLog;
      return {
        currentLog: savedLog,
        previousLog: null,
        status: "unavailable",
        summary: "比較できる記録がまだありません。",
      };
    });
    render(
      <ObservationActions
        assessment={assessment}
        callTool={callTool}
        dogId="dog-1"
        locale="ja"
      />,
    );

    expect(screen.getByRole("button", { name: "観察を保存" })).toHaveProperty(
      "disabled",
      true,
    );
    fireEvent.click(screen.getByLabelText("保存内容と削除方法を確認しました"));
    fireEvent.click(screen.getByLabelText("耳の向き"));
    fireEvent.click(screen.getByRole("button", { name: "観察を保存" }));

    await waitFor(() =>
      expect(callTool).toHaveBeenCalledWith("save_observation", {
        chosenAction: assessment.suggestedAction,
        dogId: "dog-1",
        observedCues: ["耳の向き"],
      }),
    );
    await waitFor(() =>
      expect(callTool).toHaveBeenCalledWith("get_dog_history", {
        dogId: "dog-1",
        recentLogs: [savedLog],
      }),
    );
    expect(screen.queryByText(assessment.primaryHypothesis.label)).toBeNull();
  });

  it("更新後の個体名を観察記録と保存済み表示に反映する", async () => {
    const callTool = vi.fn(async (name: string) => {
      if (name === "save_observation") return savedLog;
      return {
        currentLog: savedLog,
        previousLog: null,
        status: "unavailable",
        summary: "比較できる記録がまだありません。",
      };
    });
    render(
      <ObservationActions
        assessment={assessment}
        callTool={callTool}
        dogId="dog-1"
        dogName="ココア"
        locale="ja"
      />,
    );

    expect(
      screen.getByRole("heading", { name: "ココアの観察記録" }),
    ).not.toBeNull();
    fireEvent.click(screen.getByLabelText("保存内容と削除方法を確認しました"));
    fireEvent.click(screen.getByLabelText("耳の向き"));
    fireEvent.click(screen.getByRole("button", { name: "ココアの観察を保存" }));

    await waitFor(() =>
      expect(
        screen.getByText("ココアの保存済み観察を表示しています。"),
      ).not.toBeNull(),
    );
  });

  it("連鎖削除の確認なしに削除ツールを呼ばず、確認後に保存済み観察を画面から除く", async () => {
    const callTool = vi.fn(async () => ({ dogId: "dog-1", status: "deleted" }));
    render(
      <ObservationActions
        assessment={assessment}
        callTool={callTool}
        dogId="dog-1"
        locale="ja"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "プロフィールを削除" }));
    expect(callTool).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByLabelText(
        "この犬の保存済み観察も削除されることを確認しました",
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: "プロフィールを削除" }));

    await waitFor(() =>
      expect(callTool).toHaveBeenCalledWith("manage_dog_profile", {
        action: "delete",
        confirmed: true,
        dogId: "dog-1",
      }),
    );
  });

  it("削除ツールが確認済みの削除結果を返さなければ、削除完了を表示しない", async () => {
    const callTool = vi.fn(async () => ({ status: "deleted" }));
    render(
      <ObservationActions
        assessment={assessment}
        callTool={callTool}
        dogId="dog-1"
        locale="ja"
      />,
    );

    fireEvent.click(
      screen.getByLabelText(
        "この犬の保存済み観察も削除されることを確認しました",
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: "プロフィールを削除" }));

    await waitFor(() => expect(callTool).toHaveBeenCalledTimes(1));
    expect(
      screen.queryByText("プロフィールと保存済み観察を削除しました。"),
    ).toBeNull();
  });

  it("保存ツールの失敗時は比較を呼ばず、ローカライズされたエラーを表示する", async () => {
    const callTool = vi.fn(async () => {
      throw new Error("save failed");
    });
    render(
      <ObservationActions
        assessment={assessment}
        callTool={callTool}
        dogId="dog-1"
        locale="ja"
      />,
    );

    fireEvent.click(screen.getByLabelText("保存内容と削除方法を確認しました"));
    fireEvent.click(screen.getByLabelText("耳の向き"));
    fireEvent.click(screen.getByRole("button", { name: "観察を保存" }));

    await waitFor(() =>
      expect(
        screen.getByText(getErrorMessage("generation_failed", "ja")),
      ).not.toBeNull(),
    );
    expect(callTool).toHaveBeenCalledTimes(1);
  });

  it("比較ツールの失敗時も、保存済み観察を壊さずローカライズされたエラーを表示する", async () => {
    const callTool = vi.fn(async (name: string) => {
      if (name === "save_observation") return savedLog;
      throw new Error("history failed");
    });
    render(
      <ObservationActions
        assessment={assessment}
        callTool={callTool}
        dogId="dog-1"
        locale="ja"
      />,
    );

    fireEvent.click(screen.getByLabelText("保存内容と削除方法を確認しました"));
    fireEvent.click(screen.getByLabelText("耳の向き"));
    fireEvent.click(screen.getByRole("button", { name: "観察を保存" }));

    await waitFor(() =>
      expect(
        screen.getByText(getErrorMessage("generation_failed", "ja")),
      ).not.toBeNull(),
    );
    expect(callTool).toHaveBeenCalledWith("get_dog_history", {
      dogId: "dog-1",
      recentLogs: [savedLog],
    });
  });
});
