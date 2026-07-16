import { describe, expect, it } from "vitest";

import { getHelloMessage } from "../src/hello.js";

describe("getHelloMessage", () => {
  it("MCP Apps bridgeから届いた構造化結果を描画用テキストへ変換する", () => {
    expect(getHelloMessage({ greeting: "こんにちは、PawLensです" })).toBe(
      "こんにちは、PawLensです",
    );
  });

  it("構造化結果がまだない場合は待機メッセージを返す", () => {
    expect(getHelloMessage(undefined)).toBe("PawLensを準備しています…");
  });
});
