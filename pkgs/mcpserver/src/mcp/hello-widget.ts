import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export const HELLO_WIDGET_RESOURCE_URI = "ui://pawlens/hello-widget-v1.html";

export function registerHelloWidget(server: McpServer, assets: Fetcher): void {
  server.registerResource(
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
    async () => {
      const response = await assets.fetch(
        new Request("https://widget.pawlens.local/index.html"),
      );

      return {
        contents: [
          {
            mimeType: "text/html;profile=mcp-app",
            text: await response.text(),
            uri: HELLO_WIDGET_RESOURCE_URI,
          },
        ],
      };
    },
  );

  server.registerTool(
    "show_pawlens_hello",
    {
      _meta: {
        ui: { resourceUri: HELLO_WIDGET_RESOURCE_URI },
        "openai/outputTemplate": HELLO_WIDGET_RESOURCE_URI,
      },
      description:
        "Use this when a PawLens widget should be rendered in ChatGPT.",
      inputSchema: {},
      title: "PawLensを表示",
    },
    async () => ({
      content: [],
      structuredContent: { greeting: "こんにちは、PawLensです" },
    }),
  );
}
