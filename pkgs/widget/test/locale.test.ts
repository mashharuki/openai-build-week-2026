import { describe, expect, it } from "vitest";

import { resolveToolInputLocale, resolveWidgetLocale } from "../src/locale.js";

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

describe("resolveToolInputLocale", () => {
  it.each([
    [{ locale: "en" }, "en"],
    [{ locale: "en-US" }, "en"],
    [{ locale: "ja" }, "ja"],
    [{ locale: "ja-JP" }, "ja"],
    [{}, undefined],
    [undefined, undefined],
  ] as const)("reads %o as %s", (input, expected) => {
    expect(resolveToolInputLocale(input)).toBe(expected);
  });
});
