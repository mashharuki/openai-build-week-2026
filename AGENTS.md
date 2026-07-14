# Repository Guidelines

## Project Structure & Module Organization

This repository is an agent-skill collection for OpenAI Build Week 2026. The root `README.md` provides the project entry point. Agent configuration lives under `.agents/`:

- `.agents/skills/<skill-name>/` contains reusable skills. Each skill requires `SKILL.md`; use `references/` for on-demand background material and `evals/evals.json` for realistic evaluation prompts.
- `.agents/agents/` contains role-specific agent instructions.
- `.agents/commands/kiro/` contains Kiro workflow commands.
- `.agents/rules/` contains shared operating rules.

Keep new content in the narrowest applicable directory. For example, add Build Week guidance to `.agents/skills/openai-build-week-2026/`, not to the root README.

## Build, Test, and Development Commands

There is no application runtime, package manifest, or CI workflow currently committed. Validate documentation and skill changes with lightweight repository checks:

```sh
git diff --check                 # Detect whitespace errors
git status --short               # Review changed files
python3 -m scripts.package_skill ../openai-build-week-2026 /tmp
```

Run the packaging command from `.agents/skills/skill-creator/`; it validates the skill before creating a distributable `.skill` archive. Do not invent `npm`, `pnpm`, or test commands until the repository adds them.

## Coding Style & Naming Conventions

Write Markdown in clear, concise English unless a target document requires another language. Use ATX headings (`##`), fenced code blocks with a language tag, and relative paths. Name skill directories in lowercase kebab-case, such as `openai-build-week-2026`. Keep `SKILL.md` front matter valid YAML with `name` and an explicit trigger-focused `description`. Put volatile external facts in dated reference files and point readers to the authoritative source.

## Testing Guidelines

For every new or materially changed skill, add 2–3 realistic prompts to `evals/evals.json`. Cover the main workflow, a compliance/review case, and an edge case. Package validation and `git diff --check` are the minimum pre-commit checks; manually inspect that the archive contains `SKILL.md` and needed references but excludes evaluation fixtures.

## Commit & Pull Request Guidelines

Existing history uses short imperative subjects (for example, `add skill`). Follow that pattern: `add build-week review checklist` or `fix skill packaging instructions`. Keep commits scoped to one skill or documentation concern. Pull requests should state the user-facing change, list validation performed, link relevant issues, and include screenshots only when visual assets or rendered documentation change. Never commit API keys, session IDs, credentials, or private participant data.


# Agentic SDLC and Spec-Driven Development

Kiro-style Spec-Driven Development on an agentic SDLC

## Project Memory
Project memory keeps persistent guidance (steering, specs notes, component docs) so Codex honors your standards each run. Treat it as the long-lived source of truth for patterns, conventions, and decisions.

- Use `.kiro/steering/` for project-wide policies: architecture principles, naming schemes, security constraints, tech stack decisions, api standards, etc.
- Use local `AGENTS.md` files for feature or library context (e.g. `src/lib/payments/AGENTS.md`): describe domain assumptions, API contracts, or testing conventions specific to that folder. Codex auto-loads these when working in the matching path.
- Specs notes stay with each spec (under `.kiro/specs/`) to guide specification-level workflows.

## Project Context

### Paths
- Steering: `.kiro/steering/`
- Specs: `.kiro/specs/`

### Steering vs Specification

**Steering** (`.kiro/steering/`) - Guide AI with project-wide rules and context
**Specs** (`.kiro/specs/`) - Formalize development process for individual features

### Active Specifications
- Check `.kiro/specs/` for active specifications
- Use `$kiro-spec-status [feature-name]` to check progress

## Development Guidelines
- Think in English, generate responses in Japanese. All Markdown content written to project files (e.g., requirements.md, design.md, tasks.md, research.md, validation reports) MUST be written in the target language configured for this specification (see spec.json.language).

## Minimal Workflow
- Phase 0 (optional): `$kiro-steering`, `$kiro-steering-custom`
- Discovery: `$kiro-discovery "idea"` — determines action path, writes brief.md + roadmap.md for multi-spec projects
- Phase 1 (Specification):
  - Single spec: `$kiro-spec-quick {feature} [--auto]` or step by step:
    - `$kiro-spec-init "description"`
    - `$kiro-spec-requirements {feature}`
    - `$kiro-validate-gap {feature}` (optional: for existing codebase)
    - `$kiro-spec-design {feature} [-y]`
    - `$kiro-validate-design {feature}` (optional: design review)
    - `$kiro-spec-tasks {feature} [-y]`
  - Multi-spec: `$kiro-spec-batch` — creates all specs from roadmap.md in parallel by dependency wave
- Phase 2 (Implementation): `$kiro-impl {feature} [tasks]`
  - Without task numbers: autonomous mode (subagent per task + independent review + final validation)
  - With task numbers: manual mode (selected tasks in main context, still reviewer-gated before completion)
  - `$kiro-validate-impl {feature}` (standalone re-validation)
- Progress check: `$kiro-spec-status {feature}` (use anytime)

## Skills Structure
Skills are located in `.agents/skills/kiro-*/SKILL.md`
- Each skill is a directory with a `SKILL.md` file
- Use `/skills` to inspect currently available skills
- Invoke a skill directly with `$kiro-<skill-name>`
- `kiro-review` — task-local adversarial review protocol used by reviewer subagents
- `kiro-debug` — root-cause-first debug protocol used by debugger subagents
- `kiro-verify-completion` — fresh-evidence gate before success or completion claims
- **If there is even a 1% chance a skill applies to the current task, invoke it.** Do not skip skills because the task seems simple.

## Collaboration Modes (Optional)
Enable collaboration modes in `~/.codex/config.toml` to let Codex choose focused execution modes for longer tasks:

```toml
[features]
collaboration_modes = true
```

## Multi-Agent (Experimental)
If multi-agent is available, use it to parallelize independent research and validation within skills. Enable in `~/.codex/config.toml`:

```toml
[features]
multi_agent = true
```

Skills with "Parallel Research" sections list independent work items that benefit from sub-agent spawning when this feature is active.

## Development Rules
- 3-phase approval workflow: Requirements → Design → Tasks → Implementation
- Human review required each phase; use `-y` only for intentional fast-track
- Keep steering current and verify alignment with `$kiro-spec-status`
- Follow the user's instructions precisely, and within that scope act autonomously: gather the necessary context and complete the requested work end-to-end in this run, asking questions only when essential information is missing or the instructions are critically ambiguous.

## Steering Configuration
- Load entire `.kiro/steering/` as project memory
- Default files: `product.md`, `tech.md`, `structure.md`
- Custom files are supported (managed via `$kiro-steering-custom`)
