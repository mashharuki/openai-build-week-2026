# PawLens MCP Server

[日本語版はこちら](README.ja.md)

![PawLens](./docs/img/pawlens-background.png)

PawLens helps dog guardians turn “something feels different” into calm, observable next steps—inside ChatGPT.

It is an MCP-powered ChatGPT app that turns a short description of a dog's behavior into a structured assessment, gentle follow-up questions, and practical, safety-aware actions. It does not diagnose medical conditions or replace a veterinarian.

## Elevator pitch

Turn “something feels different” into calm, observable next steps for your dog.

## OpenAI Build Week submission

**Track:** Apps for Your Life

**Public MCP endpoint:** <https://pawlens-mcpserver.avp-104-106-107-a78.workers.dev/mcp>

**Health endpoint:** <https://pawlens-mcpserver.avp-104-106-107-a78.workers.dev/health>

**License:** [MIT](LICENSE)

### About the project

#### Inspiration

Dogs communicate subtle changes long before people have enough context to describe them clearly. PawLens was inspired by the gap between a guardian's uneasy intuition and the concrete observations a veterinarian or trainer can act on.

#### What it does

PawLens makes behavior logging conversational. A user describes what they see; the assistant can assess urgency, ask for the smallest missing detail, suggest low-risk next steps, and save observations to a dog profile when the user requests it.

#### How we built it

The project uses a React widget and an MCP server deployed to Cloudflare Workers. The server uses the OpenAI Responses API for structured behavioral reasoning, Durable Objects for session state, and Cloudflare KV for profiles and observation history. JSON Schema and Zod keep tool inputs and model outputs constrained and testable.

#### Challenges and lessons

The hard part was not producing an answer—it was making every answer safe, useful, and inspectable. We designed the model contract around three outcomes (`success`, `partial`, and `urgent`), avoided diagnoses, and added a Durable Object recovery path so an existing MCP session continues working after hibernation. The project also reinforced that an AI product needs real end-to-end checks: tool contracts, session behavior, widget integration, and documented live evaluation.

### Built with

`ChatGPT Apps` · `Model Context Protocol` · `OpenAI Responses API` · `GPT-5.6` · `Codex` · `Cloudflare Workers` · `Durable Objects` · `Cloudflare KV` · `React` · `TypeScript` · `Hono` · `Vite` · `Vitest` · `JSON Schema` · `Zod`

### Built with Codex / GPT-5.6

PawLens was built and iterated with Codex / GPT-5.6: implementation, lint remediation, contract and regression tests, and release documentation. Codex feedback session ID: `019f8484-36e2-7b50-9ab2-901e6138d67a`.

## Features

- `analyze_dog_signal`: assess a behavior description and return a safe next step.
- `get_dog_history`: retrieve recent saved observations.
- `manage_dog_profile`: create or update a dog's profile.
- `save_observation`: persist a user-confirmed observation.
- `show_pawlens_hello`: render the PawLens ChatGPT widget.

For the bilingual, step-by-step recording script and copy-ready demo prompts, see [the demo operation guide](docs/operation.md).

The assessment contract returns one of:

- `success`: enough context for a cautious assessment.
- `partial`: more context is needed; the response asks the most useful next question.
- `urgent`: the reported signals warrant prompt professional guidance.

## Supported platforms

| Surface | Status | Notes |
| --- | --- | --- |
| ChatGPT web, Developer Mode | Action required | Add the public MCP URL and record a widget-rendering check in the target account. |
| MCP Inspector / compatible clients | Supported | Uses Streamable HTTP at `/mcp`. |
| Local development | Supported | Worker and widget run through the workspace scripts. |

## Quick start

### Prerequisites

- Node.js 22+
- pnpm 10+
- A Cloudflare account for deployment
- An `OPENAI_API_KEY` configured as a Worker secret for live assessments

### Install and validate

```sh
pnpm install
pnpm run lint
pnpm run typecheck
pnpm test
pnpm run build
```

### Run locally

```sh
pnpm --filter @pawlens/mcpserver dev
```

In another terminal, open the MCP Inspector:

```sh
pnpm --filter @pawlens/mcpserver inspector
```

The local Worker exposes `/health` and `/mcp`.

### Deploy

Configure the Worker secrets, then deploy:

```sh
pnpm --filter @pawlens/mcpserver exec wrangler secret put OPENAI_API_KEY
pnpm --filter @pawlens/mcpserver exec wrangler deploy
```

Use the resulting HTTPS `/mcp` URL in your MCP client. Do not commit API keys or Cloudflare credentials.

## ChatGPT Developer Mode setup

1. In ChatGPT, enable **Developer mode** in Settings.
2. Add a connector with the public MCP URL above.
3. Start a new chat and try the prompt below.
4. Confirm that the `show_pawlens_hello` widget renders and that `analyze_dog_signal` returns a structured answer.
5. Capture the completed connection and widget check for submission evidence.

Suggested prompt:

> My dog barked quietly at the doorbell, stepped back about a meter, and became stiff. What should I do right now?

**Current evidence status:** the public Worker health endpoint, MCP initialization, tool discovery, session-recovery behavior, and real-model assessments have been verified. A completed ChatGPT Developer Mode widget-rendering check has not yet been recorded, so it is intentionally marked Action required rather than passed.

## Public verification record

The public Worker deployment was verified at version `995bc305-3dde-4881-ac4c-e8b9c584ffaa`.

| Check | Result | Evidence |
| --- | --- | --- |
| `GET /health` | Passed | Returns `service: pawlens-mcpserver` and `status: ok`. |
| MCP initialize | Passed | Streamable HTTP initialization completed with protocol `2025-03-26`. |
| Tool discovery | Passed | All five public tools are returned by `tools/list`. |
| Durable Object recovery | Passed | An existing MCP session can list tools after a new Durable Object instance is created. |
| ChatGPT Developer Mode widget | Action required | Needs a recorded in-product connection and render check. |

### Real-model evaluation

These requests ran against the deployed Worker using the live model path. They called only `analyze_dog_signal`; no dog profile or observation was saved.

| Scenario | Expected safety behavior | Result |
| --- | --- | --- |
| Doorbell, quiet bark, one-metre retreat, stiff posture | Cautious interpretation and low-risk next action | `success` / `medium` confidence |
| Leaving-home concern with missing context | Ask for the most useful missing detail | `partial` / `low` confidence |
| Persistent intense shaking, hiding, no response | Calm immediate safety guidance and professional escalation | `urgent` / `medium` confidence |

## Safety and scope

PawLens is an observation and communication aid. It does not provide a diagnosis, prescribe treatment, or replace veterinary, behavioral, or emergency services. If a dog has severe symptoms, is unresponsive, may be in pain, has breathing trouble, has ingested something harmful, or presents an immediate safety risk, contact an appropriate professional promptly.

## Repository layout

```text
pkgs/mcpserver/  Cloudflare Worker, MCP tools, and assessment service
pkgs/widget/     React ChatGPT widget
pkgs/shared/     Shared contracts and schemas
```

## Troubleshooting

| Symptom | Check |
| --- | --- |
| `401` or model request failure | Confirm `OPENAI_API_KEY` is set as a Worker secret. |
| MCP tools do not appear | Confirm the connector URL ends in `/mcp` and is reachable over HTTPS. |
| Existing session reports an error | Retry the request with its `mcp-session-id`; the deployed recovery path rehydrates the runtime after Durable Object hibernation. |
| Widget does not render in ChatGPT | Re-add the Developer Mode connector, start a fresh conversation, and verify the widget resource metadata. |

## References

- [ChatGPT apps launch readiness](https://learn.chatgpt.com/use-cases/chatgpt-apps#launch-readiness)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
