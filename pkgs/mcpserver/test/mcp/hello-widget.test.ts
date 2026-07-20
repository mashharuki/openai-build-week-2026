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
      fetch: vi.fn(
        async () =>
          new Response(
            '<html><link href="/assets/widget.css"><script src="/assets/widget.js"></script></html>',
          ),
      ),
    } as unknown as Fetcher;

    registerHelloWidget(
      { registerResource, registerTool } as unknown as McpServer,
      assets,
    );

    expect(registerResource).toHaveBeenCalledWith(
      "pawlens-hello-widget",
      HELLO_WIDGET_RESOURCE_URI,
      {},
      expect.any(Function),
    );

    const loadResource = registerResource.mock.calls[0]?.[3] as () => Promise<{
      contents: Array<{
        _meta: {
          "openai/widgetCSP": { redirect_domains: string[] };
          "openai/widgetDescription": string;
          ui: {
            csp: { connectDomains: string[]; resourceDomains: string[] };
            domain: string;
            prefersBorder: boolean;
          };
        };
        mimeType: string;
        text: string;
        uri: string;
      }>;
    }>;
    await expect(loadResource()).resolves.toEqual({
      contents: [
        {
          mimeType: "text/html;profile=mcp-app",
          _meta: {
            "openai/widgetCSP": {
              redirect_domains: ["https://avsab.org", "https://www.jvma.or.jp"],
            },
            "openai/widgetDescription":
              "A read-only PawLens summary panel. The owner speaks or types in ChatGPT; do not ask them to operate controls inside the widget. Keep chat narration brief when the panel already shows the result.",
            ui: {
              csp: {
                connectDomains: [],
                resourceDomains: [
                  "https://pawlens-mcpserver.avp-104-106-107-a78.workers.dev",
                ],
              },
              domain:
                "https://pawlens-mcpserver.avp-104-106-107-a78.workers.dev",
              prefersBorder: true,
            },
          },
          text: '<html><link href="https://pawlens-mcpserver.avp-104-106-107-a78.workers.dev/assets/widget.css"><script src="https://pawlens-mcpserver.avp-104-106-107-a78.workers.dev/assets/widget.js"></script></html>',
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

    const renderHello = registerTool.mock.calls[0]?.[2] as (
      input?: unknown,
    ) => Promise<{
      content: [];
      structuredContent: { greeting: string; profileDraft?: unknown };
    }>;
    await expect(renderHello()).resolves.toEqual({
      content: [],
      structuredContent: { greeting: "こんにちは、PawLensです" },
    });
    await expect(
      renderHello({ name: "ノア", temperamentNote: "人見知り" }),
    ).resolves.toEqual({
      content: [],
      structuredContent: {
        greeting: "こんにちは、PawLensです",
        profileDraft: { name: "ノア", temperamentNote: "人見知り" },
      },
    });
  });
});
