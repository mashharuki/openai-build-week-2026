// @vitest-environment jsdom

import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HelloWidget } from "./app.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("HelloWidget", () => {
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
            params: { structuredContent: { greeting: "Hello PawLens" } },
          },
          source: window.parent,
        }),
      );
    });

    expect(screen.getByRole("heading", { name: "PawLens" })).not.toBeNull();
    expect(screen.getByText("Hello PawLens")).not.toBeNull();
    expect(postMessage).toHaveBeenLastCalledWith(
      { jsonrpc: "2.0", method: "ui/notifications/initialized", params: {} },
      "*",
    );
  });
});
