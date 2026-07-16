import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { describe, expect, it, vi } from "vitest";

import {
  HELLO_WIDGET_RESOURCE_URI,
  registerHelloWidget,
} from "../../src/mcp/hello-widget.js";

describe("registerHelloWidget", () => {
  it("versioned ui://リソースとしてVite出力を登録する", async () => {
    const registerResource = vi.fn();
    const registerTool = vi.fn();
    const assets = {
      fetch: vi.fn(async () => new Response("<html>Hello PawLens</html>")),
    } as unknown as Fetcher;

    registerHelloWidget(
      { registerResource, registerTool } as unknown as McpServer,
      assets,
    );

    expect(registerResource).toHaveBeenCalledWith(
      "pawlens-hello-widget",
      HELLO_WIDGET_RESOURCE_URI,
      {
        _meta: {
          ui: {
            csp: { connectDomains: [], resourceDomains: [] },
            prefersBorder: true,
          },
        },
      },
      expect.any(Function),
    );

    const loadResource = registerResource.mock.calls[0]?.[3] as () => Promise<{
      contents: Array<{ mimeType: string; text: string; uri: string }>;
    }>;
    await expect(loadResource()).resolves.toEqual({
      contents: [
        {
          mimeType: "text/html;profile=mcp-app",
          text: "<html>Hello PawLens</html>",
          uri: HELLO_WIDGET_RESOURCE_URI,
        },
      ],
    });
    expect(assets.fetch).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://widget.pawlens.local/index.html",
      }),
    );
    expect(registerTool).toHaveBeenCalledWith(
      "show_pawlens_hello",
      expect.objectContaining({
        _meta: expect.objectContaining({
          ui: { resourceUri: HELLO_WIDGET_RESOURCE_URI },
        }),
      }),
      expect.any(Function),
    );

    const renderHello = registerTool.mock.calls[0]?.[2] as () => Promise<{
      content: [];
      structuredContent: { greeting: string };
    }>;
    await expect(renderHello()).resolves.toEqual({
      content: [],
      structuredContent: { greeting: "こんにちは、PawLensです" },
    });
  });
});
