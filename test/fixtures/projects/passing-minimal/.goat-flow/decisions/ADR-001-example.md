# ADR-001 Example

## Context
The project needs one canonical execution-loop reference so setup, scanner, and installed instructions agree on the same model instead of drifting between copied summaries.

## Decision
Keep the canonical definition in `.goat-flow/architecture.md` and make every secondary surface either point to it or carry only a compressed hot-path summary.
