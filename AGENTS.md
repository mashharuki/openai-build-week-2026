# Repository Guidelines

## Repository Purpose and Layout

This repository maintains reusable Codex agents and skills for OpenAI Build Week 2026. Keep work in the narrowest relevant location:

- `.agents/skills/<name>/` — reusable workflows. A skill needs `SKILL.md`; add `references/` for optional source material and `evals/evals.json` for representative prompts.
- `.agents/agents/` — role-specific agent instructions.
- `.agents/rules/` — shared, always-applicable operating rules.
- `.codex/agents/` — Codex agent definitions, such as `spec-reviewer.toml`.
- `.kiro/` — created only when a project uses spec-driven delivery: `steering/` holds durable project guidance and `specs/<feature>/` holds feature artifacts.

Do not document or invoke a directory, command, skill, or runtime that is absent from the repository or current environment.

## Working Behavior

Start with the user-visible outcome, relevant evidence, hard constraints, and completion bar. Inspect existing files before proposing changes; preserve user work and state assumptions when evidence is incomplete. Prefer the smallest useful set of files and tools, then validate the requested result before reporting completion.

- **Answer, review, diagnose, or plan:** inspect and report; do not edit unless requested.
- **Build, change, or fix:** make in-scope local edits and run safe, relevant validation.
- **External writes, destructive actions, purchases, or material scope expansion:** ask for confirmation first.

Use an available skill when its description matches the task, read its `SKILL.md` before acting, and say briefly which skill is being used and why. Delegate only independent, bounded work that benefits from a separate context; otherwise work directly.

## GPT-5.6 Guidance

Follow the current official [GPT-5.6 prompt guidance](https://developers.openai.com/api/docs/guides/prompt-guidance-gpt-5p6) and [model guidance](https://developers.openai.com/api/docs/guides/latest-model?model=gpt-5.6). Before changing a model, reasoning setting, developer prompt, tool contract, or agent configuration, use the `openai-docs` skill to verify the live official guidance.

Keep instructions lean and non-contradictory. State outcomes, invariants, available evidence, required output, and stopping conditions once; let GPT-5.6 choose the efficient path. Use `high` reasoning for complex design/review only when it has a measured benefit; compare with one lower setting on representative tasks. Do not claim tests, source facts, or integration results without evidence.

## Spec-Driven Development (cc-sdd / Kiro)

Use the Kiro skills only when the user requests spec-driven work or when a non-trivial feature needs requirements, design, task boundaries, and implementation traceability. They are skills—not shell commands—and are available under `.agents/skills/kiro-*`.

For a new feature, use this progression as appropriate:

1. `$kiro-discovery` for ambiguous or multi-feature work; maintain `.kiro/steering/roadmap.md` when it exists.
2. `$kiro-spec-init`, `$kiro-spec-requirements`, `$kiro-spec-design`, then `$kiro-spec-tasks` for a reviewable feature specification.
3. Use `$kiro-validate-gap` or `$kiro-validate-design` when existing-code fit or design quality is uncertain.
4. Use `$kiro-impl` only after requirements, design, and tasks are approved; finish with `$kiro-validate-impl` and fresh evidence.

Use `.kiro/steering/` for stable project decisions and a feature’s spec directory for feature-specific decisions. Read only the steering/spec files needed for the current task. Follow `spec.json.language` for generated specification artifacts; otherwise respond in the user’s language.

## Validation, Style, and Git

Write clear Markdown with ATX headings and language-tagged fenced code blocks. Use lowercase kebab-case skill directories, such as `openai-build-week-2026`, and valid YAML front matter with `name` and a trigger-focused `description`.

Before committing documentation or skill changes, run:

```sh
git diff --check
git status --short
# From .agents/skills/skill-creator/:
python3 -m scripts.package_skill ../<skill-name> /tmp
```

Add 2–3 realistic eval prompts for new or materially changed skills. Use concise imperative commit subjects, such as `add spec reviewer` or `fix build-week checklist`. Never commit credentials, API keys, private session IDs, or participant data.
