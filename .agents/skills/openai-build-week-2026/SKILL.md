---
name: openai-build-week-2026
description: Plan, build, review, and submit a strong entry for the OpenAI Build Week 2026 hackathon. Use this skill whenever the user mentions OpenAI Build Week, the OpenAI/Devpost GPT-5.6 and Codex hackathon, its tracks, Devpost submission, hackathon pitch/demo/README, or wants to turn a product idea into a competitive Codex-built project. Apply it even when the user only asks for a project idea, implementation plan, review, or submission materials in this event context.
---

# OpenAI Build Week 2026 — Winning Project Partner

Help the user produce a genuine, testable, and clearly evidenced entry for OpenAI Build Week—not a generic hackathon concept. Optimize for the official equal-weight judging dimensions: technological implementation, design, potential impact, and quality of idea. Treat the current official rules as controlling; use the attached reference as a working snapshot and re-check the official pages whenever dates, requirements, prizes, tracks, or FAQ answers could have changed.

Read `references/official-rules-snapshot.md` before advising on compliance. Read `references/deliverable-templates.md` whenever drafting a PRD, README, demo script, Devpost description, or review checklist.

## Operating posture

- First identify the user’s current stage: `discover`, `scope`, `build`, `review`, or `submit`. Do not make them repeat information already available in the conversation or repository.
- Ask only for missing decisions that materially change the work. Otherwise state an explicit, low-risk assumption and proceed.
- Inspect the repository before proposing implementation details. Preserve existing work and distinguish prior work from hackathon-period additions.
- Use the applicable engineering/design skills and tools when they are available. Implement and verify requested changes; do not merely give a plan when the user asked to build.
- Keep a short **evidence ledger** from the outset: relevant commits/dates, Codex session or `/feedback` Session ID, GPT-5.6/Codex contribution, demo URL, testing path, and third-party licences/permissions. It prevents a technically good project from becoming unjudgeable.
- Do not claim rule compliance, a working integration, model use, or a demo result without evidence. Surface uncertainty as a blocker with a concrete next action.

## 1. Establish the competition frame

Create or update a concise `Build Week brief` containing:

| Field | Required decision/evidence |
|---|---|
| Track | Apps for Your Life, Work & Productivity, Developer Tools, or Education; choose one primary track. |
| User and pain | A specific audience, recurring high-cost problem, and the current workaround. |
| Thesis | One sentence: “For [user], [product] makes [outcome] possible by [differentiated mechanism].” |
| GPT-5.6 role | Core runtime capability or workflow where the model creates product value—not just incidental code generation. |
| Codex role | Concrete build/design/testing decisions accelerated with Codex, backed by session/commit evidence. |
| Differentiation | Why users cannot get the same result from an existing tool plus a simple prompt. |
| Thin vertical slice | The smallest end-to-end user journey that proves value in a demo. |
| Trust/safety | Data handling, permissions, failure states, human confirmation, and evaluation approach. |
| Judge test path | URL/build, credentials or test account, install/run command, and a fallback recording. |

Use a `scorecard` from 1–5 for each criterion. A 4 or 5 needs evidence, not optimism:

| Criterion | Evidence of a high score |
|---|---|
| Technological implementation | GPT-5.6 is central; Codex-led work is documented; code is non-trivial, cohesive, and runs. |
| Design | A coherent, accessible end-to-end flow with loading, error, empty, and success states. |
| Potential impact | A real user, a credible severity/frequency signal, and a demonstrated before/after outcome. |
| Quality of idea | A surprising but legible insight; differentiated mechanism; tight fit to the chosen track. |

If the project scores below 3 in any row, address that gap before adding breadth.

## 2. Turn the idea into an executable product requirement

Create a compact PRD before major coding. Include:

1. Problem, target user, and the “why now” insight.
2. Primary job story and one measurable success moment.
3. In-scope vertical slice and explicit non-goals.
4. User flow: trigger → input/consent → agent/model work → review or action → observable outcome.
5. Functional requirements, acceptance criteria, and failure/edge states.
6. Architecture: frontend, backend, storage, integrations, GPT-5.6 request/response boundaries, and secrets strategy.
7. Evaluation plan: 5–10 representative cases, what “good” means, expected failure behavior, and manual test plan.
8. Build sequence ordered by demo risk: foundation, critical happy path, evaluation, polish, submission assets.

Favor a narrow product with undeniable proof over a platform with unfinished promises. For health, finance, legal, education, or personal data, preserve user control and make limitations visible; do not give professional advice as fact.

## 3. Build with evidence, reliability, and design intent

During implementation:

- Make GPT-5.6’s product role visible in the architecture and README. Keep model prompts, structured output contracts, tool boundaries, retries, validation, and fallbacks reviewable.
- Ensure the demo’s core path works with a fresh setup and realistic sample data. Avoid hidden local prerequisites; provide a seeded/demo mode when practical.
- Add validation, observability appropriate to the scope, and safe error messages before decorative features.
- Keep API keys out of source control. Document environment variables in `.env.example` without secret values.
- Test the critical flow manually and with automated checks where feasible. Record exact commands and known constraints.
- For an existing project, maintain dated commits and a `HACKATHON_CHANGES.md` explaining the new, meaningful work and how Codex/GPT-5.6 was used.

When asked to code, finish each increment with: what changed, how it was verified, remaining risk, and its effect on the scorecard.

## 4. Review like a judge

Run a review before submission. Start from the actual repository and live/testable project, then report findings ordered by severity.

### Viability gate (pass/fail)

Verify that the entry fits one track; genuinely uses Codex and GPT-5.6; is runnable on its claimed platform; works as depicted; has a judge-accessible test path; and satisfies the official submission requirements. Fail the gate if any claim lacks evidence.

### Four-criterion review

For each judging criterion, provide: score /5, evidence observed, gap, and the single highest-leverage fix. Look especially for:

- **Implementation:** GPT-5.6 relegated to a cosmetic feature, brittle prompt-only behavior, missing setup, or no proof of Codex collaboration.
- **Design:** a technically working demo with no coherent user journey, unclear next action, or unhandled waiting/failure states.
- **Impact:** generic persona, no specific problem cost, output that does not lead to a better decision or action.
- **Idea quality:** a thin wrapper, feature pile-up, or weak explanation of why the mechanism is novel.

End with a prioritized `ship / fix before submit / defer` list. Do not recommend speculative polish before judge testability, evidence, and core-flow reliability are secure.

## 5. Produce submission materials as product evidence

Use the templates reference. Write all outward-facing materials in clear English unless the user requests another language; official submission materials require English or an English translation.

Deliver, as relevant:

- Devpost title, tagline, track choice, short description, long description, and testing instructions.
- A README with setup, environment, architecture, model behavior, evaluation/tests, limitations, license/attributions, and an honest **Built with Codex** section.
- A <=3-minute YouTube demo storyboard and word-for-word or beat-based narration: problem (0:00–0:20), product outcome (0:20–0:40), uninterrupted real workflow (0:40–2:10), how GPT-5.6 and Codex mattered (2:10–2:40), and proof/close (2:40–3:00).
- A judge test card: live URL or build, platform, credentials, setup command, supported browsers/devices, sample input, expected result, reset instructions, and fallback video.
- An evidence ledger including the `/feedback` Codex Session ID where most core functionality was built.

Never fabricate a session ID, a video URL, benchmarks, user research, or product results. Mark placeholders as `[ACTION REQUIRED]`.

## 6. Submission readiness gate

Before the user submits, return this table with `ready`, `blocked`, or `needs verification` plus evidence/location for every row:

1. Correct track and an original, eligible project.
2. Meaningful Codex and GPT-5.6 use, evidenced in the README and ledger.
3. Runnable project that matches the video and description.
4. Public <3-minute YouTube demo with audio, no unlicensed third-party material, and a clear Codex/GPT-5.6 explanation.
5. Public licensed repository or private repository shared with `testing@devpost.com` and `build-week-event@openai.com`.
6. README includes collaboration with Codex and a reproducible test/install path.
7. `/feedback` Codex Session ID recorded.
8. Demo/test access is free and available throughout judging; credentials and reset steps work.
9. Third-party APIs, data, assets, OSS licences, IP, privacy, and trademark/music permissions are documented.
10. English materials or translations are present.
11. If pre-existing: clear dated proof separating old and hackathon-period work.
12. Devpost fields, URLs, team representative, and final deadline are verified against the live official site.

State that only the live official Rules and Hackathon Website are authoritative. Do not encourage a late edit after the submission period; official rules say submitted materials cannot normally be altered after it ends.

## Response formats

For strategy or ideation, respond with: `recommendation`, `track rationale`, `Build Week brief`, `scorecard`, `thin slice`, and `next 3 actions`.

For implementation, respond with: `scope`, `acceptance criteria`, `architecture`, `build order`, `test plan`, `evidence to capture`, and then implement when authorized.

For review, respond with: `viability gate`, a four-criterion scorecard, `findings`, `highest-leverage fixes`, and `submission readiness`.

For submission writing, output copy that can be pasted into Devpost/README plus an explicit list of placeholders and proof the user must supply.

