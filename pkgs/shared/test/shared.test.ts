import { describe, expect, it } from "vitest";

import {
  CAPABILITY_FLAGS,
  ERROR_MESSAGES,
  MAX_AUDIO_DURATION_SECONDS,
  OpenAiSignalInputSchema,
  SignalInputSchema,
  getErrorMessage,
} from "../src/index.js";
import { dedupeObservationLogs, normalizeFileReference } from "../src/utils.js";

describe("共有スキーマ", () => {
  it("Apps SDKのファイル入力を正規化し、ダウンロードURLがない添付を拒否する", () => {
    const input = {
      audio: {
        download_url: "https://files.example/bark.wav",
        duration_seconds: 4,
        file_id: "audio-1",
        mime_type: "audio/wav",
      },
      barkDescription: "玄関のチャイム後に短く連続して吠えた",
      context: "visitor",
      distance_to_trigger_meters: null,
      dogId: "dog-1",
      image: {
        download_url: "https://files.example/photo.jpg",
        file_id: "image-1",
        mime_type: "image/jpeg",
      },
      locale: "ja",
      precedingEvent: null,
    };

    expect(OpenAiSignalInputSchema.parse(input).audio).toEqual({
      downloadUrl: "https://files.example/bark.wav",
      durationSeconds: 4,
      fileId: "audio-1",
      mimeType: "audio/wav",
    });
    expect(
      OpenAiSignalInputSchema.safeParse({
        ...input,
        audio: { file_id: "audio-1", mime_type: "audio/wav" },
      }).success,
    ).toBe(false);
  });

  it("旧ウィジェットの距離フィールドを、ハンドラで変換できるよう保持する", () => {
    expect(
      OpenAiSignalInputSchema.safeParse({
        audio: null,
        barkDescription: "短く吠えました。",
        context: "visitor",
        distanceToPerson: "2m",
        dogId: "dog-coco",
        image: null,
        locale: "ja",
        precedingEvent: null,
      }).success,
    ).toBe(true);
  });

  it("記述優先の見立て入力を検証し、不正な状況と長すぎる音声を拒否する", () => {
    const baseInput = {
      dogId: "dog-1",
      locale: "ja",
      context: "visitor",
      barkDescription: "玄関のチャイム後に短く連続して吠えた",
      precedingEvent: "チャイムが鳴った",
      distanceToPerson: "玄関から2メートル",
      image: null,
      audio: null,
    };

    expect(SignalInputSchema.safeParse(baseInput).success).toBe(true);
    expect(
      SignalInputSchema.safeParse({ ...baseInput, context: "medical" }).success,
    ).toBe(false);
    expect(
      SignalInputSchema.safeParse({
        ...baseInput,
        audio: {
          downloadUrl: "https://files.example/audio.wav",
          durationSeconds: MAX_AUDIO_DURATION_SECONDS + 1,
          fileId: "file-audio",
          mimeType: "audio/wav",
        },
      }).success,
    ).toBe(false);
  });
});

describe("共有表示・定数・純粋ユーティリティ", () => {
  it("すべてのシステム文言を日本語と英語で提供する", () => {
    for (const key of Object.keys(ERROR_MESSAGES) as Array<
      keyof typeof ERROR_MESSAGES
    >) {
      expect(getErrorMessage(key, "ja")).not.toHaveLength(0);
      expect(getErrorMessage(key, "en")).not.toHaveLength(0);
    }

    const japanesePrivacyNotice = getErrorMessage("privacy_notice", "ja");
    expect(japanesePrivacyNotice).toContain("プロフィール");
    expect(japanesePrivacyNotice).toContain("観察");
    expect(japanesePrivacyNotice).toContain("削除");
    expect(japanesePrivacyNotice).toContain("保存期間");
    expect(japanesePrivacyNotice).toContain("第三者");

    const englishPrivacyNotice = getErrorMessage("privacy_notice", "en");
    expect(englishPrivacyNotice).toContain("profile");
    expect(englishPrivacyNotice).toContain("observations");
    expect(englishPrivacyNotice).toContain("delete");
    expect(englishPrivacyNotice).toContain("retention");
    expect(englishPrivacyNotice).toContain("third parties");

    expect(CAPABILITY_FLAGS.audioEvidence).toBe("audio_evidence");
  });

  it("ファイル参照を正規化し、確認済み観察をIDで重複排除する", () => {
    expect(
      normalizeFileReference({
        downloadUrl: "https://files.example/photo.jpg",
        fileId: "  file-photo  ",
        mimeType: "image/jpeg",
      }),
    ).toEqual({
      downloadUrl: "https://files.example/photo.jpg",
      fileId: "file-photo",
      mimeType: "image/jpeg",
    });

    const log = {
      chosenAction: "玄関から距離を取る",
      conversationId: "conversation-1",
      dogId: "dog-1",
      id: "log-1",
      observedCues: ["耳が後ろ向き"],
      recordedAt: "2026-07-16T00:00:00.000Z",
    };

    expect(
      dedupeObservationLogs([log, { ...log }, { ...log, id: "log-2" }]),
    ).toEqual([log, { ...log, id: "log-2" }]);
  });
});
