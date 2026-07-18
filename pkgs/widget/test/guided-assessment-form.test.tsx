// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AssessmentResult } from "@pawlens/shared";

import { GuidedAssessmentForm } from "../src/guided-assessment-form.js";

const assessment: AssessmentResult = {
  additionalQuestion: null,
  confidence: "medium",
  evidenceSources: ["research"],
  limitations: "観察だけでは断定できません。",
  observationPoints: ["耳の向き"],
  primaryHypothesis: {
    label: "警戒の可能性",
    rationale: "来客直後の反応です。",
  },
  secondaryHypotheses: [],
  status: "success",
  suggestedAction: "玄関から距離を取ります。",
};

afterEach(cleanup);

describe("GuidedAssessmentForm", () => {
  it("見立て依頼中はライブな処理中表示と重複送信防止を示す", async () => {
    let resolveAssessment: (value: unknown) => void = () => undefined;
    const callTool = vi.fn((name: string) => {
      if (name === "manage_dog_profile") {
        return Promise.resolve({
          profile: {
            createdAt: "2026-07-17T00:00:00.000Z",
            id: "dog-1",
            name: "ココ",
            temperamentNote: null,
            updatedAt: "2026-07-17T00:00:00.000Z",
          },
          status: "created",
        });
      }
      return new Promise((resolve) => {
        resolveAssessment = resolve;
      });
    });
    render(
      <GuidedAssessmentForm
        callTool={callTool}
        locale="ja"
        onAssessment={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText("愛犬の名前"), {
      target: { value: "ココ" },
    });
    fireEvent.click(screen.getByRole("button", { name: "プロフィールを登録" }));
    await waitFor(() =>
      expect(screen.getByText("ココの見立てを始めます")).not.toBeNull(),
    );
    fireEvent.change(screen.getByLabelText("鳴き方の特徴"), {
      target: { value: "短く吠えました" },
    });
    fireEvent.click(screen.getByRole("button", { name: "見立てを依頼" }));
    expect(
      screen.getByRole("button", { name: "見立てを準備しています…" }),
    ).toHaveProperty("disabled", true);
    expect(screen.getByRole("status")).not.toBeNull();
    resolveAssessment(assessment);
  });

  it("英語ではプロフィール開始と入力項目を英語で示す", () => {
    render(
      <GuidedAssessmentForm
        callTool={vi.fn()}
        locale="en"
        onAssessment={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Tell us about your dog" }),
    ).not.toBeNull();
    expect(screen.getByLabelText("Dog's name")).not.toBeNull();
    expect(
      screen.getByRole("button", { name: "Create profile" }),
    ).not.toBeNull();
  });

  it("プロフィール作成の失敗を見立て失敗として表示しない", async () => {
    render(
      <GuidedAssessmentForm
        callTool={vi.fn(async () => {
          throw new Error("unavailable");
        })}
        locale="ja"
        onAssessment={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("愛犬の名前"), {
      target: { value: "ココ" },
    });
    fireEvent.click(screen.getByRole("button", { name: "プロフィールを登録" }));

    expect(
      await screen.findByText(
        "プロフィールを保存できませんでした。接続を確認してからもう一度お試しください。",
      ),
    ).not.toBeNull();
    expect(screen.queryByText("見立てを準備できませんでした。入力を見直してからもう一度お試しください。")).toBeNull();
  });

  it("個体名がなければ見立てを開始できず、登録後は記述と状況だけで送信できる", async () => {
    const callTool = vi.fn(async (name: string) => {
      if (name === "manage_dog_profile") {
        return {
          profile: {
            createdAt: "2026-07-17T00:00:00.000Z",
            id: "dog-1",
            name: "ココ",
            temperamentNote: null,
            updatedAt: "2026-07-17T00:00:00.000Z",
          },
          status: "created",
        };
      }
      return assessment;
    });
    const onAssessment = vi.fn();
    render(
      <GuidedAssessmentForm
        callTool={callTool}
        locale="ja"
        onAssessment={onAssessment}
      />,
    );

    expect(
      screen.getByRole("button", { name: "プロフィールを登録" }),
    ).toHaveProperty("disabled", true);
    expect(screen.queryByRole("button", { name: "見立てを依頼" })).toBeNull();

    fireEvent.change(screen.getByLabelText("愛犬の名前"), {
      target: { value: "ココ" },
    });
    fireEvent.click(screen.getByRole("button", { name: "プロフィールを登録" }));

    await waitFor(() =>
      expect(callTool).toHaveBeenCalledWith("manage_dog_profile", {
        action: "create",
        name: "ココ",
        temperamentNote: null,
      }),
    );
    expect(screen.getByText("ココの見立てを始めます")).not.toBeNull();

    fireEvent.change(screen.getByLabelText("鳴き方の特徴"), {
      target: { value: "低い声で2回吠えました" },
    });
    fireEvent.change(screen.getByLabelText("状況"), {
      target: { value: "doorbell" },
    });
    fireEvent.click(screen.getByRole("button", { name: "見立てを依頼" }));

    await waitFor(() =>
      expect(callTool).toHaveBeenCalledWith("analyze_dog_signal", {
        audio: null,
        barkDescription: "低い声で2回吠えました",
        context: "doorbell",
        distanceToPerson: null,
        dogId: "dog-1",
        image: null,
        locale: "ja",
        precedingEvent: null,
      }),
    );
    expect(onAssessment).toHaveBeenCalledWith(assessment);
  });

  it("写真・音声を選ぶ前にメディアのプライバシー通知を示す", async () => {
    const callTool = vi.fn(async () => ({
      profile: {
        createdAt: "2026-07-17T00:00:00.000Z",
        id: "dog-1",
        name: "ココ",
        temperamentNote: null,
        updatedAt: "2026-07-17T00:00:00.000Z",
      },
      status: "created",
    }));
    render(
      <GuidedAssessmentForm
        callTool={callTool}
        locale="ja"
        onAssessment={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("愛犬の名前"), {
      target: { value: "ココ" },
    });
    fireEvent.click(screen.getByRole("button", { name: "プロフィールを登録" }));

    await waitFor(() =>
      expect(screen.getByText("ココの見立てを始めます")).not.toBeNull(),
    );
    expect(screen.queryByText(/写真や音声には個人情報/)).toBeNull();
    expect(screen.queryByText(/写真や音声には個人情報/)).toBeNull();
    fireEvent.click(screen.getByLabelText("写真を追加"));
    expect(screen.getByText(/写真や音声には個人情報/)).not.toBeNull();
    expect(screen.getByLabelText("音声を追加（対応時）")).toHaveProperty(
      "disabled",
      true,
    );
  });

  it("選択した写真をApps SDKのファイル参照として見立てへ渡す", async () => {
    const callTool = vi.fn(async (name: string) => {
      if (name === "manage_dog_profile") {
        return {
          profile: {
            createdAt: "2026-07-17T00:00:00.000Z",
            id: "dog-1",
            name: "ココ",
            temperamentNote: null,
            updatedAt: "2026-07-17T00:00:00.000Z",
          },
          status: "created",
        };
      }
      return assessment;
    });
    const fileUploader = vi.fn(async () => ({
      download_url: "https://files.example/coco.jpg",
      file_id: "file-image-1",
      file_name: "coco.jpg",
      mime_type: "image/jpeg",
    }));
    render(
      <GuidedAssessmentForm
        callTool={callTool}
        fileUploader={fileUploader}
        locale="ja"
        onAssessment={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("愛犬の名前"), {
      target: { value: "ココ" },
    });
    fireEvent.click(screen.getByRole("button", { name: "プロフィールを登録" }));
    await waitFor(() =>
      expect(screen.getByText("ココの見立てを始めます")).not.toBeNull(),
    );

    fireEvent.change(screen.getByLabelText("鳴き方の特徴"), {
      target: { value: "短く吠えました" },
    });
    fireEvent.change(screen.getByLabelText("写真を追加"), {
      target: {
        files: [new File(["photo"], "coco.jpg", { type: "image/jpeg" })],
      },
    });
    await waitFor(() => expect(fileUploader).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "見立てを依頼" }));

    await waitFor(() =>
      expect(callTool).toHaveBeenCalledWith(
        "analyze_dog_signal",
        expect.objectContaining({
          audio: null,
          image: {
            download_url: "https://files.example/coco.jpg",
            file_id: "file-image-1",
            file_name: "coco.jpg",
            mime_type: "image/jpeg",
          },
        }),
      ),
    );
  });

  it("対応時の10秒以内の音声を見立てへ渡す", async () => {
    const callTool = vi.fn(async (name: string) => {
      if (name === "manage_dog_profile") {
        return {
          profile: {
            createdAt: "2026-07-17T00:00:00.000Z",
            id: "dog-1",
            name: "ココ",
            temperamentNote: null,
            updatedAt: "2026-07-17T00:00:00.000Z",
          },
          status: "created",
        };
      }
      return assessment;
    });
    render(
      <GuidedAssessmentForm
        audioSupported
        callTool={callTool}
        getAudioDuration={async () => 4}
        locale="ja"
        onAssessment={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("愛犬の名前"), {
      target: { value: "ココ" },
    });
    fireEvent.click(screen.getByRole("button", { name: "プロフィールを登録" }));
    await waitFor(() =>
      expect(screen.getByText("ココの見立てを始めます")).not.toBeNull(),
    );
    fireEvent.change(screen.getByLabelText("鳴き方の特徴"), {
      target: { value: "玄関に向けて短く吠えました" },
    });
    fireEvent.change(screen.getByLabelText("音声を追加（対応時）"), {
      target: {
        files: [new File(["audio"], "coco.wav", { type: "audio/wav" })],
      },
    });
    await waitFor(() =>
      expect(screen.getByText(/写真や音声には個人情報/)).not.toBeNull(),
    );
    fireEvent.click(screen.getByRole("button", { name: "見立てを依頼" }));

    await waitFor(() =>
      expect(callTool).toHaveBeenCalledWith(
        "analyze_dog_signal",
        expect.objectContaining({
          audio: {
            durationSeconds: 4,
            fileId: "coco.wav",
            mimeType: "audio/wav",
          },
        }),
      ),
    );
  });

  it("10秒を超える音声は見立てへ渡さない", async () => {
    const callTool = vi.fn(async (name: string) => {
      if (name === "manage_dog_profile") {
        return {
          profile: {
            createdAt: "2026-07-17T00:00:00.000Z",
            id: "dog-1",
            name: "ココ",
            temperamentNote: null,
            updatedAt: "2026-07-17T00:00:00.000Z",
          },
          status: "created",
        };
      }
      return assessment;
    });
    render(
      <GuidedAssessmentForm
        audioSupported
        callTool={callTool}
        getAudioDuration={async () => 11}
        locale="ja"
        onAssessment={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("愛犬の名前"), {
      target: { value: "ココ" },
    });
    fireEvent.click(screen.getByRole("button", { name: "プロフィールを登録" }));
    await waitFor(() =>
      expect(screen.getByText("ココの見立てを始めます")).not.toBeNull(),
    );
    fireEvent.change(screen.getByLabelText("鳴き方の特徴"), {
      target: { value: "玄関に向けて短く吠えました" },
    });
    fireEvent.change(screen.getByLabelText("音声を追加（対応時）"), {
      target: {
        files: [new File(["audio"], "long.wav", { type: "audio/wav" })],
      },
    });
    await waitFor(() => expect(screen.getByRole("status")).not.toBeNull());
    fireEvent.click(screen.getByRole("button", { name: "見立てを依頼" }));

    await waitFor(() =>
      expect(callTool).toHaveBeenCalledWith(
        "analyze_dog_signal",
        expect.objectContaining({ audio: null }),
      ),
    );
  });

  it("更新した個体名を以後の見立て開始表示へ反映する", async () => {
    const callTool = vi.fn(async (name: string, input: unknown) => {
      if (name !== "manage_dog_profile") return assessment;
      const action = (input as { action: string }).action;
      return {
        profile: {
          createdAt: "2026-07-17T00:00:00.000Z",
          id: "dog-1",
          name: action === "update" ? "ココア" : "ココ",
          temperamentNote: null,
          updatedAt: "2026-07-17T00:00:00.000Z",
        },
        status: action === "update" ? "updated" : "created",
      };
    });
    const onProfileChange = vi.fn();
    render(
      <GuidedAssessmentForm
        callTool={callTool}
        locale="ja"
        onAssessment={vi.fn()}
        onProfileChange={onProfileChange}
      />,
    );

    fireEvent.change(screen.getByLabelText("愛犬の名前"), {
      target: { value: "ココ" },
    });
    fireEvent.click(screen.getByRole("button", { name: "プロフィールを登録" }));
    await waitFor(() =>
      expect(screen.getByText("ココの見立てを始めます")).not.toBeNull(),
    );
    fireEvent.click(screen.getByRole("button", { name: "プロフィールを編集" }));
    fireEvent.change(screen.getByLabelText("愛犬の名前"), {
      target: { value: "ココア" },
    });
    fireEvent.click(screen.getByRole("button", { name: "プロフィールを更新" }));

    await waitFor(() =>
      expect(callTool).toHaveBeenCalledWith("manage_dog_profile", {
        action: "update",
        dogId: "dog-1",
        name: "ココア",
        temperamentNote: null,
      }),
    );
    expect(screen.getByText("ココアの見立てを始めます")).not.toBeNull();
    expect(onProfileChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: "dog-1", name: "ココア" }),
    );
  });
});
