# Tech Stack

- Actual state: no package manifest, source tree, test config, or deploy config exists yet.
- Planned (PRD only): TypeScript; Cloudflare Workers + Hono + `@hono/mcp` / MCP SDK; React/Vite widget; Zod contracts; Workers KV MVP storage; GPT-5.6 structured assessment.
- Planned integration: Streamable HTTP MCP, widget assets served by Workers; OpenAPI covers supplemental HTTP APIs, not MCP JSON-RPC.
- Do not treat PRD versions or commands as installed/working until manifests and source land.
- Before building the integration, verify current official Apps SDK resource/widget and attachment behavior; PRD marks it as a risk.
- For repository scope and invariants, read `mem:core`; for completion checks appropriate to the current phase, read `mem:task_completion`.