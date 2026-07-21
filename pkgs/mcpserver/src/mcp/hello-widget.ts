import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ProfileDraftSchema, WidgetGreetingSchema } from "@pawlens/shared";

/**
 * The URI is a ChatGPT cache key. Bump it whenever the template contract or
 * its security metadata changes.
 */
export const HELLO_WIDGET_RESOURCE_URI = "ui://pawlens/hello-widget-v9.html";

const WIDGET_ASSET_ORIGIN =
  "https://pawlens-mcpserver.avp-104-106-107-a78.workers.dev";

const WIDGET_RESOURCE_META = {
  "openai/widgetDescription":
    "A read-only PawLens summary panel. The owner speaks or types in ChatGPT; do not ask them to operate controls inside the widget. Keep chat narration brief when the panel already shows the result.",
  "openai/widgetCSP": {
    redirect_domains: ["https://avsab.org", "https://www.jvma.or.jp"],
  },
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

const ShowPawLensInputSchema = ProfileDraftSchema.partial().strict();

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
        "Use this when the user asks to open PawLens or start a conversation about their dog. This opens a read-only live summary; the owner continues by typing or speaking in ChatGPT, never by operating widget controls. When the owner supplied a name or temperament note, pass them as name and temperamentNote so the panel can display them. This tool only opens the interface and never saves or changes data.",
      inputSchema: ShowPawLensInputSchema,
      outputSchema: WidgetGreetingSchema,
      title: "PawLensを表示",
    },
    async (input) => {
      const draft = ShowPawLensInputSchema.parse(input ?? {});

      return {
        content: [],
        structuredContent: {
          greeting: "こんにちは、PawLensです",
          ...(draft.name
            ? {
                profileDraft: {
                  name: draft.name,
                  temperamentNote: draft.temperamentNote ?? null,
                },
              }
            : {}),
        },
      };
    },
  );
}
