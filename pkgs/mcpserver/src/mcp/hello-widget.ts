import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WidgetGreetingSchema } from "@pawlens/shared";

/**
 * The URI is a ChatGPT cache key. Bump it whenever the template contract or
 * its security metadata changes.
 */
export const HELLO_WIDGET_RESOURCE_URI = "ui://pawlens/hello-widget-v3.html";

const WIDGET_ASSET_ORIGIN =
  "https://pawlens-mcpserver.avp-104-106-107-a78.workers.dev";

const WIDGET_RESOURCE_META = {
  ui: {
    // This bundle has no browser fetches or CDN assets. Keep CSP allowlists
    // explicit and empty rather than granting a broad default.
    csp: {
      connectDomains: [],
      // Vite emits the widget JS and CSS under /assets. The template is
      // rendered on ChatGPT's sandbox origin, so make those URLs absolute and
      // allow only this Worker origin as a static-resource source.
      resourceDomains: [WIDGET_ASSET_ORIGIN],
    },
    domain: WIDGET_ASSET_ORIGIN,
    prefersBorder: true,
  },
} as const;

export function registerHelloWidget(server: McpServer, assets: Fetcher): void {
  server.registerResource(
    "pawlens-hello-widget",
    HELLO_WIDGET_RESOURCE_URI,
    {},
    async () => {
      const response = await assets.fetch(
        new Request("https://widget.pawlens.local/index.html"),
      );

      const html = await response.text();

      return {
        contents: [
          {
            mimeType: "text/html;profile=mcp-app",
            _meta: WIDGET_RESOURCE_META,
            // Vite uses root-relative asset paths. They would otherwise be
            // resolved against the ChatGPT sandbox instead of this Worker.
            text: html.replace(
              /(["'])\/(assets\/[^"']+)\1/g,
              `$1${WIDGET_ASSET_ORIGIN}/$2$1`,
            ),
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
      annotations: {
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
        readOnlyHint: true,
      },
      description:
        "Use this when the user asks to open PawLens or begin observing their dog. Renders the interactive PawLens widget for registering a dog profile, recording owner-confirmed observations, and viewing observation guidance. This tool only opens the interface and does not save or change data.",
      inputSchema: {},
      outputSchema: WidgetGreetingSchema,
      title: "PawLensを表示",
    },
    async () => ({
      content: [],
      structuredContent: { greeting: "こんにちは、PawLensです" },
    }),
  );
}
