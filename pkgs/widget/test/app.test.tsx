// @vitest-environment jsdom

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AssessmentResult } from "@pawlens/shared";

import { HelloWidget, WidgetStateView } from "../src/app.js";

const assessmentResult: AssessmentResult = {
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
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("HelloWidget", () => {
  it("低モーション設定では静的表示を指定する", () => {
    const matchMedia = vi.fn(() => ({ matches: true }));
    vi.stubGlobal("matchMedia", matchMedia);
    render(<HelloWidget />);

    expect(screen.getByRole("main").dataset.motion).toBe("reduced");
  });

  it("bridge初期化後にtool-resultの構造化結果をインライン描画する", () => {
    const postMessage = vi.spyOn(window.parent, "postMessage");
    render(<HelloWidget />);

    const initializeRequest = postMessage.mock.calls[0]?.[0] as {
      id: string;
    };
    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: { id: initializeRequest.id, jsonrpc: "2.0", result: {} },
          source: window.parent,
        }),
      );
      window.dispatchEvent(
        new MessageEvent("message", {
          data: {
            jsonrpc: "2.0",
            method: "ui/notifications/tool-result",
            params: { structuredContent: assessmentResult },
          },
          source: window.parent,
        }),
      );
    });

    expect(screen.getByRole("heading", { name: "PawLens" })).not.toBeNull();
    expect(screen.getByText("警戒している可能性")).not.toBeNull();
    expect(postMessage).toHaveBeenLastCalledWith(
      { jsonrpc: "2.0", method: "ui/notifications/initialized", params: {} },
      "*",
    );
    expect(screen.queryByLabelText("愛犬の名前")).toBeNull();
  });

  it("結果からの続き相談をChatGPTのフォローアップAPIへ送る", async () => {
    const sendFollowUpMessage = vi.fn();
    vi.stubGlobal("openai", { sendFollowUpMessage });
    render(<HelloWidget />);

    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: {
            jsonrpc: "2.0",
            method: "ui/notifications/tool-result",
            params: { structuredContent: assessmentResult },
          },
          source: window.parent,
        }),
      );
    });
    fireEvent.click(
      screen.getByRole("button", { name: "ChatGPTで続きを相談する" }),
    );

    expect(sendFollowUpMessage).toHaveBeenCalledWith({
      prompt: "愛犬の見立てを受けて、次に確認することを教えてください。",
      scrollToBottom: true,
    });
  });

  it("プロフィール管理ツールの結果をプロフィールとして描画する", () => {
    render(<HelloWidget />);

    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: {
            jsonrpc: "2.0",
            method: "ui/notifications/tool-result",
            params: {
              structuredContent: {
                profile: {
                  createdAt: "2026-07-16T00:00:00.000Z",
                  id: "dog-1",
                  name: "ノア",
                  temperamentNote: "やんちゃ",
                  updatedAt: "2026-07-16T00:00:00.000Z",
                },
                status: "created",
              },
            },
          },
          source: window.parent,
        }),
      );
    });

    expect(screen.getByLabelText("プロフィール")).not.toBeNull();
    expect(screen.getByRole("heading", { name: "ノア" })).not.toBeNull();
    expect(screen.getByText("やんちゃ")).not.toBeNull();
    expect(screen.getByText("ノアの見立てを始めます")).not.toBeNull();
    expect(screen.queryByLabelText("システムエラー")).toBeNull();
  });

  it("プロフィール下書きを受け取ると、保存前の入力欄へ反映する", () => {
    render(<HelloWidget />);

    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: {
            jsonrpc: "2.0",
            method: "ui/notifications/tool-result",
            params: {
              structuredContent: {
                greeting: "こんにちは、PawLensです",
                profileDraft: {
                  name: "ノア",
                  temperamentNote: "人見知り",
                },
              },
            },
          },
          source: window.parent,
        }),
      );
    });

    expect(screen.getByLabelText("愛犬の名前")).toHaveProperty("value", "ノア");
    expect(screen.getByLabelText("性格メモ（任意）")).toHaveProperty(
      "value",
      "人見知り",
    );
    expect(
      screen.getByRole("button", { name: "プロフィールを登録" }),
    ).toHaveProperty("disabled", false);
  });

  it("empty、loading、成功、システムエラー、緊急を区別して表示する", () => {
    const { rerender } = render(<WidgetStateView state={{ kind: "empty" }} />);
    expect(screen.getByText("見立てを始める準備ができました。")).not.toBeNull();

    rerender(<WidgetStateView state={{ kind: "loading" }} />);
    expect(screen.getByRole("status")).not.toBeNull();

    rerender(
      <WidgetStateView
        dogName="ココア"
        state={{ assessment: assessmentResult, kind: "success" }}
      />,
    );
    expect(screen.getAllByLabelText("見立て結果")).not.toHaveLength(0);
    expect(
      screen.getByRole("heading", { name: "ココアの見立て結果" }),
    ).not.toBeNull();

    rerender(
      <WidgetStateView
        state={{ kind: "error", message: "再試行してください。" }}
      />,
    );
    expect(screen.getByLabelText("システムエラー").style.color).toBe(
      "rgb(185, 28, 28)",
    );

    rerender(
      <WidgetStateView
        state={{
          assessment: { ...assessmentResult, status: "urgent" },
          kind: "success",
        }}
      />,
    );
    expect(screen.getByLabelText("緊急の安全案内").style.color).toBe(
      "rgb(180, 83, 9)",
    );
  });

  it("英語の4状態でも表示文言を切り替える", () => {
    const { rerender } = render(
      <WidgetStateView locale="en" state={{ kind: "empty" }} />,
    );
    expect(screen.getByText("Ready to begin an assessment.")).not.toBeNull();

    rerender(<WidgetStateView locale="en" state={{ kind: "loading" }} />);
    expect(screen.getByText("Preparing the assessment.")).not.toBeNull();

    rerender(
      <WidgetStateView
        locale="en"
        state={{ kind: "error", message: "Try again." }}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "System error" }),
    ).not.toBeNull();
  });
});
