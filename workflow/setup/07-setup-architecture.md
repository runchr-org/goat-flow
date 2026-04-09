# Step 07 — Setup Architecture

Create or enhance `.goat-flow/architecture.md`. If step 03 already seeded it with domain content from an existing instruction file, enhance it. Otherwise create from scratch.

## What to include

Read the codebase before writing. The audience is an agent or engineer who needs a fast, accurate model of how the system is wired before making changes.

Include these sections where applicable:

- **System Overview** — Major services/components and their boundaries. 2-4 sentences on why they are separated that way. Mermaid diagram if helpful.
- **Request Flow** — One representative request path: entrypoint, middleware, app/service layer, data store, response.
- **Auth / Trust Boundaries** — How authentication and authorization work end-to-end.
- **Data Flow** — Where durable state lives, how data moves between stores/services. Queues, caches, third-party APIs.
- **Deployment / Operations** — How code moves from local dev to runtime. CI, hosting, key infra.

## Rules

- Document the current implementation, not roadmap ideas
- Read source files, config, and deployment assets before writing
- Skip sections that truly do not apply, but note the omission
- Keep it concise and scannable
- For each section: explain the important design choice, not a box-by-box restatement

## Fail conditions

- Diagram includes components that do not exist in the repo
- Prose repeats labels without explaining why the design matters
- Auth, deployment, or data flow omitted even though the repo clearly contains that system

---

**Verification gate:**
- [ ] `.goat-flow/architecture.md` exists with real content (not template fill)
- [ ] Mentions at least 2 real components by name
- [ ] Every referenced file/service exists in the repo
- [ ] Instruction file router table includes architecture.md

**Session log:** Append to `.goat-flow/logs/sessions/YYYY-MM-DD-setup.md`:
- **Step:** 07-setup-architecture
- **What was done:** (sections created, components documented)
- **Self-critique:** (honest assessment)

NEXT: proceed to `08-setup-code-map.md`
