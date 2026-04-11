# Template: Testing Flow Diagram Guide

> This is a reference template. Not installed to projects by default.

## Inputs

Use this when the user asks for a visual flow, or when a CRITICAL user-visible
flow needs clearer representation before testing.

Build a Mermaid flowchart:

- **Actors:** USER actions vs SYSTEM responses (use subgraphs)
- **Happy path first:** main success flow as the backbone
- **Branch points:** error states, edge cases, validation failures
- **Gap annotation:** highlight undertested branches with clear gap status markers

## Layout Rules

- Use 8–15 nodes per diagram; split into sub-flows if larger
- Keep nodes action-oriented, not implementation-only
- Use action language (`User clicks Submit`) instead of endpoint language

## Required Annotation Table

| Node | Test Action | What "pass" looks like | Edge cases | Gap status |
|------|------------|----------------------|------------|-----------|

## Delivery Rule

After the diagram, include the annotation table so every node maps to a concrete
test action and clearly indicates gap severity.

