# Prompt: Create .goat-flow/coding-standards/security.md

> **Purpose:** Cross-cutting security overlay - input validation, auth, secrets, output encoding
> **Generates:** `.goat-flow/coding-standards/security.md`
> **Use when:** Setting up security instructions (overrides other instructions on conflict)
> **Repo inspection:** Yes - reads auth patterns, validation logic, secrets handling, dependency tree
> **Follow-on refs:** `security/web-common.md` for OWASP baseline; `security/framework-specific/` for framework rules; `security/api-auth.md`, `security/file-upload.md`, `security/sql-injection.md` as detected

---

## The Prompt

Write `.goat-flow/coding-standards/security.md`:

````
# Security Instructions

This file overrides all other instruction files when there is a conflict.

## Input Validation

Validate ALL external input at the boundary (HTTP handler, CLI parser, message consumer).
Never trust input from: request bodies, query params, headers, file uploads, webhook payloads.

```go
// Good - validate and constrain before use
pageSize, err := strconv.Atoi(r.URL.Query().Get("limit"))
if err != nil || pageSize < 1 || pageSize > 100 {
    pageSize = 20
}

// Bad - unbounded user input hits the database
limit := r.URL.Query().Get("limit")
db.Query(fmt.Sprintf("SELECT * FROM users LIMIT %s", limit))
```

Reject first, then allow. Default to deny.

## Authentication Boundaries

- Every endpoint must be explicitly marked public or authenticated. No implicit access.
- Enforce authentication before business logic - at the framework's routing/middleware layer, not inside individual handlers. The mechanism varies by stack (middleware, decorators, annotations, route filters, guards), but the principle is the same: a new endpoint that forgets the check must fail closed.
- Validate credentials once per request at the boundary, not per service call.

```go
// Good - auth enforced at the routing layer (Go middleware shown; adapt to your framework)
mux.Handle("/api/v1/users", authMiddleware(userHandler))
mux.Handle("/api/v1/health", publicHandler) // explicitly public

// Bad - auth check buried in handler (easy to forget in new handlers)
func handler(w http.ResponseWriter, r *http.Request) {
    token := r.Header.Get("Authorization")
    if !isValid(token) { ... }
}
```

## Secret Handling

- Secrets MUST come from environment variables or framework-native secret stores (Rails encrypted credentials, Spring Vault, AWS SSM). Never from config files committed to git, CLI args, or hardcoded strings.
- Never log secrets: tokens, passwords, API keys, session IDs.
- Never include secrets in error messages returned to clients.
- `.env` files are gitignored. Use `.env.example` with placeholder values.

```bash
# .env.example - committed, no real values
DATABASE_URL=postgres://user:password@localhost:5432/myapp_dev
STRIPE_API_KEY=sk_test_placeholder
JWT_SECRET=replace-me-with-random-64-chars

# .env - gitignored, real values
DATABASE_URL=postgres://prod_user:real_password@db.internal:5432/myapp
```

```go
// Good
key := os.Getenv("STRIPE_API_KEY")

// Bad - secret in source code
key := "sk_live_abc123def456"

// Bad - secret in log output
log.Printf("authenticating with key: %s", apiKey)
```

## Output Encoding

Encode output based on context. The same value needs different encoding in HTML body, HTML attributes, JavaScript, CSS, and URLs. Use the framework's built-in escaping - do not write your own.

- HTML body: `{{ variable }}` (auto-escaped in most template engines)
- HTML attributes: always quote attribute values; use framework escaping
- JavaScript context: JSON-encode, do not embed raw strings in `<script>` blocks
- URLs: use `encodeURIComponent()` / framework URL builder for query parameters

## Dangerous File Operations

- Never construct file paths from user input without sanitization.
- Always use `filepath.Clean()` and verify the result is within the expected directory.
- Reject paths containing `..`, null bytes, or absolute paths when relative is expected.

```go
// Good - sanitize and verify
cleanPath := filepath.Clean(userInput)
fullPath := filepath.Join(baseDir, cleanPath)
rel, err := filepath.Rel(baseDir, fullPath)
if err != nil || strings.HasPrefix(rel, "..") {
    return fmt.Errorf("path traversal attempt: %s", userInput)
}

// Bad - direct concatenation
path := fmt.Sprintf("uploads/%s", userInput)
```

## SQL Injection Prevention

- Always use parameterized queries. Never concatenate user input into SQL.
- If using an ORM or query builder, verify it parameterizes. If using raw SQL, use `$1` placeholders.

```go
// Good - parameterized
db.QueryRow("SELECT * FROM users WHERE id = $1", userID)

// Bad - concatenated
db.QueryRow("SELECT * FROM users WHERE id = " + userID)

// Bad - fmt.Sprintf into SQL
db.QueryRow(fmt.Sprintf("SELECT * FROM users WHERE email = '%s'", email))
```

## Supply Chain Security

For CI pipeline SHA pinning examples, see `security/infrastructure.md` CI Pipeline Security section.

Verify package integrity in CI. Use lockfile-based installs.
```bash
npm ci                           # uses package-lock.json exactly, fails on mismatch
pip install --require-hashes -r requirements.txt  # verifies checksums
```

Review transitive dependencies. A direct dependency is only as safe as its deepest transitive dep.
```bash
npm ls --all                     # show full dependency tree
pip-audit                        # check Python deps for known vulns
cargo audit                      # check Rust deps
```

## CORS / CSP Headers

For HTTP security header configuration, see `security/web-common.md`.

## Credential Scope

Read-deny patterns. Never read, log, or process these paths unless explicitly required for the operation at hand.
```
~/.ssh/*
~/.aws/*
~/.docker/config.json
~/.gnupg/*
~/.npmrc
~/.pypirc
**/credentials*
**/*.pfx
**/*.pem (except public certs)
**/*.key
**/secrets.*
**/.env (except .env.example)
```

If a tool or script needs access to credentials, it must:
1. Document which credentials it needs and why
2. Use the narrowest scope possible (read-only, single key, time-limited)
3. Never copy credentials to temp files or logs

## Checklist Before Merge

- [ ] No secrets in code, logs, or error responses
- [ ] All user input validated at the boundary
- [ ] Auth applied to every non-public endpoint
- [ ] SQL queries use parameterized placeholders
- [ ] File paths sanitized if derived from user input
````

Adjust examples to match this project's language, framework, and auth approach.
Target 40-60 lines of content (not counting the prompt wrapper).
