# GOAT Flow Core Rules & Mandates

These rules are foundational for all AI coding agent workflows in this project. They take absolute precedence over general defaults and apply to every turn.

## 1. Security & Integrity
- **Credential Protection:** NEVER log, print, or commit secrets, API keys, or sensitive credentials. Rigorously protect `.env` files, `.git`, and system configuration folders.
- **Source Control:** Do NOT stage or commit changes unless specifically requested by the user.
- **Deny Mechanism:** Respect the `deny-dangerous.sh` hook and any registered deny patterns in agent settings.

## 2. Evidence Standard (OBSERVED vs INFERRED)
- **Traceability:** Every finding MUST include file evidence (e.g., `file:line`).
- **No Fabrication:** Never fabricate file paths, function names, or artifact content.
- **Verification:** Before presenting findings, re-read each cited `file:line` to confirm accuracy.
- **Evidence Tags:** Tag evidence as **OBSERVED** (directly verified in code) or **INFERRED** (deduced but not confirmed). If a claim cannot be re-verified, mark it **UNVERIFIED**.
- **Symbol Verification:** Before citing a function or symbol, verify it exists with a repo search.

## 3. Engineering Standards
- **Severity Scale:** SECURITY > CORRECTNESS > INTEGRATION > PERFORMANCE > STYLE. Order findings by severity.
- **Architecture Compliance:** All changes must align with `.goat-flow/architecture.md`.
- **Conventions & Style:** Adhere to existing workspace conventions, naming, and formatting. Analyze surrounding files to ensure surgical, idiomatic updates.
- **Technical Integrity:** You are responsible for the entire lifecycle: implementation, testing, and validation. Validation is not just running tests; it is confirming behavioral and structural correctness.
- **Linters & Types:** NEVER suppress warnings or bypass type systems (e.g., casts) unless explicitly instructed. Use explicit language features.

## 4. Execution Loop: READ → SCOPE → ACT → VERIFY
- **READ:** Systematically map the codebase and validate assumptions. Empirical reproduction of issues is mandatory for bug fixes.
- **SCOPE:** Declare intent, complexity, and mode before acting.
- **ACT:** Apply targeted, surgical changes. Include necessary automated tests.
- **VERIFY:** Run tests and workspace standards (linting, type-checking) to confirm success and ensure no regressions. Validation is the ONLY path to finality.

## 5. Learning Loop
After completing a task, update the project's memory if applicable:
- **Behavioural mistake** → `.goat-flow/lessons/` category bucket file.
- **Successful pattern** → `.goat-flow/patterns.md`.
- **Architectural trap** → `.goat-flow/footguns/` category bucket file (must include `file:line` evidence).

## 6. Context Efficiency
- **Hot Path vs Cold Path:** Keep instruction files lean (under 120 lines). Use progressive disclosure to load detailed logic only when needed.
- **Minimal Output:** Aim for concise, direct text output. Avoid conversational filler.
- **Strategic Delegation:** Use sub-agents for repetitive batch tasks, high-volume output, or speculative research.
