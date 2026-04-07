# Domain Instruction Files (Layer 2)

> **Purpose:** Guide + prompt for creating domain-specific instruction files and the `.goat-flow/README.md` router
> **Generates:** Multiple `.goat-flow/coding-standards/{domain}.md` files + `.goat-flow/README.md` router
> **Use when:** After `conventions.md` - creating domain-specific instructions for each codebase boundary
> **Repo inspection:** Yes - discovers domain boundaries from code structure, languages, and patterns
> **Follow-on refs:** `copilot-bridge.md` for Copilot bridges; other templates in this directory as source material

Domain instruction files keep deep domain knowledge out of the always-loaded Layer 1 budget. They live in `.goat-flow/coding-standards/` and load on demand when the agent works on a matching domain. The router at `.goat-flow/README.md` tells agents which files to load for each task type.

`.github/instructions/` serves a dual role: **Copilot bridge files** (see `copilot-bridge.md`) and **Codex local instructions** (Codex discovers these as its local context mechanism). If both Copilot and Codex are active, the same files serve both agents. `.goat-flow/coding-standards/` remains the canonical source; `.github/instructions/` files either bridge from it (Copilot) or are read directly (Codex).

---

## When to Use

After the root instruction file (CLAUDE.md / AGENTS.md) is set up. Create domain files when:
- A domain has conventions that differ from the project default
- A domain has 2+ footgun entries in .goat-flow/footguns/
- A domain is an Ask First boundary
- The domain is complex enough that an agent needs dedicated context

## Where They Live

Source of truth is `.goat-flow/coding-standards/`. One file per domain or cross-cutting concern.

```
.goat-flow/
├── README.md                    # Router - tells agents which files to load
└── coding-standards/
    ├── conventions.md            # Always loaded - project-wide conventions
    ├── frontend.md               # React/TypeScript domain conventions
    ├── backend.md                # Go/PostgreSQL domain conventions
    ├── code-review.md            # Code review checklist and priorities
    ├── git-commit.md             # Commit messages, branches, PR workflow
    ├── security.md               # Cross-cutting security rules (highest precedence)
    └── testing.md                # Test naming, structure, mocking rules
```

The router (`.goat-flow/README.md`) maps task types to files:

| Task | Load |
|------|------|
| All tasks | `coding-standards/conventions.md` |
| Frontend work | `coding-standards/frontend.md` |
| Backend work | `coding-standards/backend.md` |
| Code review | `coding-standards/code-review.md` |
| Committing code | `coding-standards/git-commit.md` |
| Security-sensitive work | `coding-standards/security.md` |
| Writing tests | `coding-standards/testing.md` |

Agents read `.goat-flow/README.md`, then load the relevant files based on the current task. This keeps token budgets low - agents only load what they need.

---

## The Prompt

````
Create domain-specific instruction files for this project. These are
Layer 2 (Local Context) - they load on demand via the router at
.goat-flow/README.md, keeping deep domain knowledge out of the root
instruction file's line budget.

All instruction files go in .goat-flow/coding-standards/. The router goes in .goat-flow/README.md.
Copilot bridges (if needed) go in .github/instructions/.

STEP 1 - DISCOVER DOMAINS

Read the entire codebase first. Do NOT invent conventions - extract
rules from what the code already does.

Look for these natural boundaries:
- Languages/frameworks (PHP/Laravel, TypeScript/React, Go, Rust, Python)
- Database/SQL layer (if distinct patterns from general backend)
- API layer (if distinct conventions)
- Test infrastructure (shared utilities, fixtures, patterns)
- Infrastructure/DevOps (Docker, CI, deployment)
- Shared libraries or utilities (common helpers, shared modules)
- Domain areas with unique patterns (auth, payments, notifications)

Only create files for domains that genuinely exist. A small project
may need 2-3 files. A large multi-language app may need 6-8.

STEP 2 - CREATE INSTRUCTION FILES

Start with .goat-flow/coding-standards/conventions.md (always loaded).

Then for each domain, create .goat-flow/coding-standards/{domain}.md

Examples: frontend.md, backend.md, testing.md, security.md

Each domain file MUST have:
- **Overview** - what this area does (2-3 sentences)
- **Key files** - which files own what responsibility
- **Conventions** - patterns extracted from existing code (do/don't with examples)
- **Gotchas** - "never do this" warnings with file:line evidence
- **Cross-boundary dependencies** - what breaks if you change here

Rules:
- Each file MUST be self-contained - an agent reading only this file
  should be able to work correctly in that area
- Target 40-60 lines per file (concise, forceful)
- Every gotcha must reference real code (file:line where possible)
- Extract patterns from what the code already does

STEP 3 - CREATE ROUTER

Write .goat-flow/README.md mapping task types to instruction files.
Remove rows for files that don't apply to this project.

STEP 4 - CREATE COPILOT BRIDGES (if needed)

If the team uses GitHub Copilot, create bridge files in .github/instructions/
that copy content from .goat-flow/coding-standards/ inline with applyTo frontmatter.
See copilot-bridge.md template for format.

VERIFICATION:
- Verify .goat-flow/README.md lists all created instruction files
- Verify each file is self-contained (conventions, gotchas, examples)
- Verify no invented conventions - all extracted from existing code
- Report: number of files created and which domains they cover
````
