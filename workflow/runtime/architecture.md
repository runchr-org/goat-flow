# Prompt: Generate System Architecture Doc

> **When to use:** When setting up context files, especially for multi-service or full-stack projects. Gives AI agents a visual map of how the system is wired before they make changes.
>
> **Output:** `ai-docs/architecture.md` - reference this from your instruction file.

```
Create ai-docs/architecture.md for this repository.

The audience is an agent or engineer who needs a fast, accurate model of
how the current system is wired before making changes.

RULES:
- Document the current implementation, not roadmap ideas
- Read source files, config, and deployment assets before writing
- Skip diagrams that truly do not apply, but say they were omitted
- Keep it concise and scannable; target under 100 lines. Multi-service
  systems may go up to 120.

Include these sections where applicable:

## System Overview
- Mermaid diagram of the major services/components and their boundaries
- 2 to 4 sentences on why they are separated that way

## Request Flow
- Mermaid sequence or flow chart for one representative request path
- Include entrypoint, middleware, app/service layer, data store, and response

## Auth / Trust Boundaries
- Show how authentication and authorization work end-to-end
- Include sessions, tokens, identity providers, and privileged boundaries

## Data Flow
- Show where durable state lives and how data moves between stores/services
- Call out queues, caches, search indexes, or third-party APIs if present

## Deployment / Operations
- Show how code moves from local development to runtime
- Include CI, image build, deploy tool, hosting platform, and key infra

For each section:
- Add the mermaid block first
- Follow with brief prose explaining the important design choice, not a
  box-by-box restatement
- Mention key files or directories that support the diagram when useful

FAIL CONDITIONS:
- diagram includes components that do not exist in the repo
- prose repeats labels without explaining why the design matters
- auth, deployment, or data flow is omitted even though the repo clearly
  contains that system
```
