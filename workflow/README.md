# Workflow Templates

Templates and prompts for the GOAT Flow workflow layers. See
`docs/five-layers.md` for the full architecture.

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `evaluation/` | Learning loop templates: footguns, lessons, evals, CI validation, handoff |
| `setup/` | Agent-specific setup guides and shared setup phases |
| `coding-standards/` | Coding standards templates (conventions, code review, security, testing, git commit) |
| `playbooks/planning/` | Feature brief, mob elaboration, SBAO ranking, milestone planning |
| `playbooks/testing/` | Testing workflow methodology |
| `runtime/` | Enforcement hooks, RFC 2119, code map, architecture, guidelines split |
| `skills/` | 6 goat-flow skill templates: goat (dispatcher), goat-debug, goat-plan, goat-review, goat-security, goat-test |
| `templates/` | Reusable artifact templates (requirements tracking, context-validation.yml) |

## Usage

These are **prompt templates**, not executable code. Copy the prompt
block from any file and paste it into your coding agent. The setup
guides in `workflow/setup/` reference these templates during Phase 1b (skills)
and Phase 2 (evaluation).
