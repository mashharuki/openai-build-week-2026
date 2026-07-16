# Project Structure

## Organization Philosophy

The repository is organized by durable product artifacts while PawLens is in its discovery and design phase. Product requirements are kept separate from research, interface design, reviews, and presentation materials. Future application code should establish its own source-oriented organization rather than treating the documentation layout as a code architecture.

## Directory Patterns

### Product Requirements
**Location**: `/docs/requirements.md`  
**Purpose**: Canonical product scope, interaction flow, proposed architecture, and safety boundaries.  
**Example**: The MVP visitor-barking flow defines the assessment card and the distinction between hypotheses and confirmed observations.

### Research and Planning
**Location**: `/docs/pm/`  
**Purpose**: Evidence, market research, and planning inputs that support product decisions.  
**Example**: `research-pawlens.md` records research evidence and its limitations.

### Interface Design
**Location**: `/docs/ui_design/`  
**Purpose**: Widget specifications and self-contained prototypes used to explore the experience before implementation.  
**Example**: The standalone HTML prototype keeps its markup, styles, and interaction logic together deliberately.

### Formal Specifications
**Location**: `.kiro/specs/<feature-name>/`  
**Purpose**: Approved requirements, technical design, and implementation tasks per feature; the spec supersedes older exploratory documents where they conflict.  
**Example**: `pawlens-observation-assistant/` holds `requirements.md`, `design.md`, and `spec.json` for the MVP.

### Review and Presentation
**Location**: `/docs/review/` and `/docs/slides/`  
**Purpose**: Evaluation artifacts and narrative materials for build-week delivery.  
**Example**: Review documents use the `review-pawlens-` prefix to make their purpose clear.

## Naming Conventions

- **Documentation files**: Lowercase kebab-case names, usually scoped with the product name when needed.
- **Review files**: `review-` prefix followed by the product and review focus.
- **Standalone prototypes**: A descriptive human-readable filename is acceptable when the file is intended for direct review rather than import.
- **Prototype JavaScript**: camelCase for methods and state; SCREAMING_SNAKE_CASE for visual constants.

## Import Organization

There is no module-based application source yet. The current prototype is intentionally self-contained and does not establish import conventions. Define module boundaries and aliases only when the TypeScript application is scaffolded.

## Code Organization Principles

- Treat the architecture in requirements as proposed until implementation supplies executable evidence.
- Keep model assessment, persisted owner-confirmed observations, and widget rendering as separate responsibilities.
- Do not add a steering update for new artifacts that follow these existing documentation and naming patterns.

---
_Document patterns, not file trees. New files following patterns shouldn't require updates._
