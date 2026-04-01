# Cypress Security Standards

Reference for generating `ai/coding-standards/security.md` in projects using Cypress for E2E testing. Cypress tests interact with real authentication, session state, and environment-specific data - securing the test suite prevents credential leaks and environment contamination.

## Credential Management

- NEVER hardcode usernames, passwords, API keys, or tokens in spec files or fixtures.
- Use `Cypress.env()` for all credentials. Source from `cypress.env.json` (gitignored) or CI environment variables.
- `cypress.env.json` MUST be in `.gitignore`. Verify with `git check-ignore cypress.env.json`.

```javascript
// DO - credentials from environment
cy.login(Cypress.env('PRACTITIONER_EMAIL'), Cypress.env('PRACTITIONER_PASSWORD'));

// DON'T - hardcoded credentials
cy.login('admin@example.com', 'password123');
```

## Fixture Data Security

- Fixtures containing PII (patient names, practitioner IDs, Medicare numbers) MUST use synthetic data, not production copies.
- Environment-specific IDs (user IDs, org IDs) MUST come from `Cypress.env()`, not hardcoded in fixtures.
- Never commit fixture files that contain real patient data, even for staging environments.

```javascript
// DO - environment-specific IDs from config
const practitionerId = Cypress.env('PRACTITIONER_ID');

// DON'T - hardcoded environment-specific ID
const practitionerId = '12345';
```

## Session and Cookie Handling

- Use `cy.session()` for login caching instead of repeating login flows. This reduces credential exposure in test logs.
- Clear sensitive cookies between test groups when switching users or permission levels.
- Never log session tokens or auth cookies with `cy.log()` - these appear in Cypress Cloud and CI artifacts.

```javascript
// DO - session caching with cleanup
cy.session('practitioner', () => {
  cy.login(Cypress.env('EMAIL'), Cypress.env('PASSWORD'));
}, {
  validate() {
    cy.getCookie('session_id').should('exist');
  }
});
```

## Network Interception

- `cy.intercept()` stubs should not contain real API keys or auth tokens. Use placeholder values.
- When intercepting auth endpoints, verify the response shape matches production without exposing real tokens.
- Be cautious with `cy.intercept()` on login endpoints - intercepted responses bypass actual auth, which can mask auth bugs.

## Environment Isolation

- Test suites MUST declare which environment they target. Use `Cypress.env('ENV_NAME')` or `baseUrl` in config.
- Never run destructive tests (delete, bulk update) against production or shared staging without explicit guards.
- Database seeding or cleanup scripts MUST check the environment before executing.

## CI/CD Security

- Cypress Cloud project IDs and record keys are sensitive. Use CI secrets, not config files.
- Test recordings and screenshots may contain PII rendered in the UI. Configure retention policies.
- Parallel test runs share the same environment - ensure tests don't compete for the same user accounts.

## Common Footguns

- **`cypress.env.json` committed to git:** Contains all test credentials. Verify it's gitignored before every PR.
- **Screenshots/videos in CI artifacts:** UI screenshots capture whatever's on screen, including patient data in healthcare apps. Configure `screenshotOnRunFailure` and video retention carefully.
- **`cy.request()` with hardcoded auth:** Direct API calls often bypass the UI login flow and tempt hardcoding tokens. Always source from `Cypress.env()`.
- **Shared test users across parallel runs:** Two parallel specs logging in as the same user can cause session conflicts. Use distinct users per parallel worker or `cy.session()` isolation.

## Primary Sources

- [Cypress Environment Variables](https://docs.cypress.io/guides/guides/environment-variables)
- [Cypress Session API](https://docs.cypress.io/api/commands/session)
- [Cypress Cloud Security](https://docs.cypress.io/guides/cloud/account-management/projects)
