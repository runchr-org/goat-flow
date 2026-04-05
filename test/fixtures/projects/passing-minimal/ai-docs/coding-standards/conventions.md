# Conventions

## Commands
```bash
npm test
npx eslint .
bash scripts/preflight-checks.sh
bash scripts/context-validate.sh
```

## Conventions
Do: use early returns when a branch can end immediately.
Do: keep cross-file terminology aligned after renames.
Do: cite real file paths in reviews and incidents.
Don't: hardcode secrets or tokens.
Don't: invent missing codebase facts.
Don't: leave stale router paths behind.

## Dangerous Operations
- Never bypass validation with placeholder commands.
- Never mutate protected files without checking scope first.
