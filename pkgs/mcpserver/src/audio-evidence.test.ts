import { describe, expect, it } from "vitest";

import { adaptEvidence, probeAudioEvidence } from "./audio-evidence.js";

describe("evidence adapter", () => {
  it("音声能力プローブは有効時だけavailableを返す", () => {
    expect(probeAudioEvidence(true)).toEqual({ available: true });
    expect(probeAudioEvidence(false)).toEqual({ available: false });
    expect(probeAudioEvidence()).toEqual({ available: false });
  });
  it("使えない画像は理由を残して他の入力だけで継続する", () => {
    expect(
      adaptEvidence({
        audio: null,
        image: { fileId: "image-1", mimeType: "application/pdf" },
        locale: "ja",
        supportsAudio: false,
      }),
    ).toMatchObject({
      audio: null,
      image: null,
      kind: "partial",
      messages: expect.arrayContaining([
        expect.stringContaining("視覚的な手がかり"),
        expect.stringContaining("個人情報"),
      ]),
    });
  });

  it.each([
    { durationSeconds: undefined, label: "長さなし" },
    { durationSeconds: 0.2, label: "短すぎる" },
    { durationSeconds: 0, label: "無音" },
    { durationSeconds: 11, label: "10秒超過" },
  ])("%s の音声を使わず安全に継続する", ({ durationSeconds }) => {
    expect(
      adaptEvidence({
        audio: { durationSeconds, fileId: "audio-1", mimeType: "audio/wav" },
        image: null,
        locale: "en",
        supportsAudio: true,
      }),
    ).toMatchObject({
      audio: null,
      kind: "partial",
      messages: expect.arrayContaining([expect.stringContaining("record")]),
    });
  });

  it("音声非対応では記述・状況・任意画像へ縮退し、有効な10秒音声だけを使う", () => {
    const audio = {
      durationSeconds: 10,
      fileId: "audio-1",
      mimeType: "audio/wav",
    };
    expect(
      adaptEvidence({ audio, image: null, locale: "en", supportsAudio: false }),
    ).toMatchObject({ audio: null, kind: "partial" });
    expect(
      adaptEvidence({ audio, image: null, locale: "en", supportsAudio: true }),
    ).toMatchObject({ audio, kind: "ready" });
  });

  it("音声能力が未確定でも音声を使わない", () => {
    expect(
      adaptEvidence({
        audio: {
          durationSeconds: 10,
          fileId: "audio-1",
          mimeType: "audio/wav",
        },
        image: null,
        locale: "ja",
      }),
    ).toMatchObject({ audio: null, kind: "partial" });
  });
});
