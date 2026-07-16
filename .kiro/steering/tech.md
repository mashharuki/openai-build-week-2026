# Technology Stack

## Architecture Status

This repository is currently documentation- and prototype-first. It has no application source tree, package manifest, test suite, or deployment configuration. The technical architecture below is the intended MVP design documented in `docs/requirements.md` and refined in the approved spec design under `.kiro/specs/pawlens-observation-assistant/`; treat it as a decision to validate during implementation, not as an implemented system.

## Intended Architecture

The intended product is a ChatGPT App with a remote MCP server and an inline widget UI. The design separates data tools from rendering so the widget consumes structured results instead of duplicating model logic.

## Intended Core Technologies

- **Language**: TypeScript
- **Server runtime**: Cloudflare Workers
- **Server framework**: Hono with `@hono/mcp` and the MCP SDK over Streamable HTTP
- **Widget UI**: React with Vite-built static assets
- **Validation**: Zod as the single source of truth for tool input and structured assessment output
- **Storage**: Workers KV for the MVP (eventually consistent; same-conversation comparison uses a read-your-writes design), with D1 considered when history queries require it
- **Model**: OpenAI GPT-5.6 for structured, multimodal assessment
- **Testing**: Vitest for unit, integration, and contract tests

## Technical Standards

### Trust and Safety

- Require structured output that includes hypotheses, evidence, confidence, limitations, observation cues, and safe next actions.
- Keep AI hypotheses separate from persisted owner-confirmed observations.
- Avoid diagnostic claims and provide escalation guidance for concerning signs.
- Store only minimal anonymous profile and observation data; support user deletion.

### Interface Contracts

- Give each MCP tool one clear job and annotate it accurately as read-only or mutating.
- Use schemas to validate both tool inputs and the assessment card output.
- Confirm the current Apps SDK widget/resource contract with official documentation before implementation, because the requirements note identifies it as an integration risk.

## Development Environment

The intended workflow uses pnpm workspaces for dependency management and scripts (adopted from the designated ChatGPT App template, superseding the earlier Bun assumption), Wrangler for Workers development and deployment, and Biome for formatting and linting. Commands and version requirements should be added once a package manifest and implementation are created.

---
_Document standards and patterns, not every dependency._
