import { describe, expect, it } from "vitest";

import { resolveWidgetLocale } from "../src/locale.js";

describe("resolveWidgetLocale", () => {
  it.each([
    ["ja", "ja"],
    ["ja-JP", "ja"],
    ["en-US", "en"],
    [undefined, "ja"],
  ] as const)("maps %s to a supported locale", (input, expected) => {
    expect(resolveWidgetLocale(input)).toBe(expected);
  });
});
