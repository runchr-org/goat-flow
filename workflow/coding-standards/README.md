# Coding Standards Templates (Layer 2)

Prompt templates for generating project-specific coding guidelines. These templates tell agents how to create the `.goat-flow/coding-standards/` files that live in your project.

## How It Works

This is a **cold-path router** system. Agents read `.goat-flow/README.md` (the router) to decide which instruction files to load for the current task. Instruction files live in `.goat-flow/coding-standards/` and load on demand - agents only pull in what they need, keeping token budgets low.

The templates in this directory are not loaded directly by agents. They are prompts you paste into your coding agent during setup. The agent reads your codebase and generates project-specific `.goat-flow/coding-standards/` files from these templates.

See `domain-instructions.md` for the full generator contract: file layout, router structure, domain discovery, and generation steps.

## Directory Layout

```
coding-standards/
├── README.md                  # This file
├── conventions.md             # Template for .goat-flow/coding-standards/conventions.md (always-loaded project contract)
├── code-review.md             # Template for .goat-flow/coding-standards/code-review.md
├── security.md                # Universal security template for .goat-flow/coding-standards/security.md
├── testing.md                 # Template for .goat-flow/coding-standards/testing.md
├── git-commit.md              # Template for BOTH .goat-flow/coding-standards/git-commit.md AND .github/git-commit-instructions.md
├── copilot-bridge.md          # Template for .github/instructions/ bridge files (Copilot)
├── domain-instructions.md     # Guide for creating domain-specific instruction files
├── frontend/                  # Stack-specific frontend templates (React, Vue, etc.)
├── backend/                   # Stack-specific backend templates (Go, Node, Python, etc.)
├── devops/                    # IaC references (Terraform)
└── security/                  # Stack-specific security overlays
    └── framework-specific/    # Framework-level security templates (Rails, Django, etc.)
```

### Core Templates

| File | Generates | Loaded When |
|------|-----------|-------------|
| `conventions.md` | `.goat-flow/coding-standards/conventions.md` | Every task (always loaded) |
| `code-review.md` | `.goat-flow/coding-standards/code-review.md` | Reviewing code |
| `security.md` | `.goat-flow/coding-standards/security.md` | Touching auth, secrets, validation |
| `testing.md` | `.goat-flow/coding-standards/testing.md` | Writing or modifying tests |
| `git-commit.md` | `.goat-flow/coding-standards/git-commit.md` + `.github/git-commit-instructions.md` | Committing code, creating PRs |

### Stack-Specific Directories

| Directory | Purpose |
|-----------|---------|
| `frontend/` | Stack-specific frontend conventions (React/TS, Vue, Angular, TypeScript) |
| `backend/` | Stack-specific backend conventions (Go, Node, Python, Rust, etc.) |
| `security/` | Universal security template + `framework-specific/` overlays |
| `devops/` | Infrastructure-as-code references (Terraform) |

### Support Status

| Area | Supported | Fallback | Not yet supported |
|------|-----------|----------|-------------------|
| **Backend** | Go, Django, FastAPI, Laravel, Symfony | Flask (use `python.md`), generic PHP | Rails |
| **Backend (partial)** | - | TypeScript Node, .NET, Rust, Bash | - |
| **Frontend** | React, Vue, Angular, TypeScript | - | Svelte (use `typescript.md` as base) |
| **Frontend (template)** | Blade, Twig, ERB, Jinja | - | - |
| **Security** | Laravel, Symfony, Django, Express, Go | - | Rails, Spring, .NET. Fastify, NestJS (use `express-node.md` as base) |
| **DevOps** | Terraform | - | Packer, Kubernetes, Ansible |

## How Agents Use It

1. During setup, the agent reads the project's codebase to detect the stack
2. The agent loads the relevant template from this directory
3. The agent generates `.goat-flow/coding-standards/` files tailored to the project
4. At runtime, `.goat-flow/README.md` routes agents to the right instruction files per task

## Usage

This directory contains two kinds of files:

**Prompt templates** (top-level: `conventions.md`, `code-review.md`, `security.md`, `testing.md`, `git-commit.md`, `domain-instructions.md`): paste the prompt block into your coding agent and it generates the corresponding `.goat-flow/coding-standards/` file from your actual codebase.

**Reference packs** (`backend/`, `frontend/`, `security/`): stack-specific content that the setup agent reads as source material to inform what it writes. These are not pasted as prompts - the agent loads the relevant reference file based on the detected stack and uses it to fill in the stack-specific sections of the generated `.goat-flow/coding-standards/` file.
