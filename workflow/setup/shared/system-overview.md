# System Overview

Read this first. This is what you're installing and why.

## What goat-flow is

A framework that gives AI coding agents extended memory across sessions. Not documentation, not ceremony, not a quality gate — memory infrastructure.

## The 3 layers

### 1. Instruction file (CLAUDE.md / AGENTS.md / GEMINI.md)

- The execution loop. Loaded every turn. Governs agent behavior.
- Hard budget: 150 lines (target 120). Frontier models degrade **uniformly** when over-instructed — not sequentially, uniformly. Every instruction gets weaker, not just the last ones.
- Tools mentioned in the instruction file get used 160x more often than unmentioned (GitHub 2,500-repo analysis).
- Router table at the end exploits end-of-context attention.

### 2. Skills (5 functional + 1 dispatcher)

- Plan (goat-plan), test (goat-test), review (goat-review), secure (goat-security), debug (goat-debug).
- Loaded on demand via slash commands. Implementation is what the agent does natively — skills govern everything around it.
- No implementation skill (ADR-019): it would duplicate native behavior or add ceremony to every edit.
- The dispatcher (/goat) is a separate file: its 35-trigger routing table + 11 disambiguation rules would consume half the instruction file budget if inlined.

### 3. ai-docs/ (footguns, lessons, decisions, coding-standards, evals)

- AI extended memory. Persists across sessions.
- Empty directories = correctly set up. Empty means "no incidents yet", not "incomplete".

## Why every project gets the full system

- The components are lightweight infrastructure, not ceremony proportional to codebase size.
- A 30-file project still needs security checks, debug workflows, and benefits from footguns carrying forward between sessions.
- Full system: 5 skills + dispatcher, ai-docs/, hooks, config. Nothing is optional based on project size.
- Only size-sensitive guidance: projects with >500 source files should consider local instruction files per major component.

## Development Driven Testing (DDT)

- goat-flow follows DDT, not TDD.
- Loop: code -> manually verify -> preflight checks -> decide if automated test is needed.
- Static analysis and type checking already catch half of what unit tests used to cover. Don't write tests for code that tooling already validates.
- Tests focus on: complex business logic, integration boundaries, regression prevention.

## The one rule that matters most

Minimise duplication, reference existing, never delete user code.

- Read what the project already has. Build on it.
- Reference existing instruction files instead of recreating them.
- If the project has `.github/instructions/`, use them as canonical.
- If the project has `docs/footguns.md`, migrate the entries — don't create a parallel surface.
- CLAUDE.md / AGENTS.md / GEMINI.md can be created or rewritten (goat-flow owns those). Everything else: preserve and reference, not replace.

## What "done" looks like

- Every goat-flow directory exists. Config references real paths. Skills installed. Hooks wired.
- The CLAUDE.md reads like it was written by someone who understands the project — not a template with blanks filled in.
- Footguns are real. Ask First boundaries match actual risk surfaces. Commands actually run.
