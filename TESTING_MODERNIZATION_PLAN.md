# TinyNode Testing Modernization Plan

## Goals

1. Move from Jest to Node's built-in test runner (`node:test`) without experimental VM flags.
2. Keep ESM native across app and tests.
3. Preserve existing test intent (`__core`, `__e2e`, `__exists`, `__mock_functions`) with a cleaner selection model.
4. Separate API availability checks from API functionality checks.
5. Convert `.testcase.md` descriptions into executable tests, then remove the markdown artifacts.
6. Provide a reusable model for other repositories.

## Recommended Stack

- Test runner: `node:test`
- Assertions/mocks: `node:assert/strict`, `node:test` mocks, plus explicit fakes
- HTTP endpoint testing (in-memory app): `supertest`
- Upstream HTTP mocking for `fetch`: `undici` `MockAgent` (preferred) or manual fetch stubs
- Browser/UI tests: `playwright` (preferred over Puppeteer)
- Coverage: `c8` (stable and CI-friendly)
- Optional snapshots/matchers (only if needed): keep minimal, avoid framework lock-in

## Why Playwright Over Puppeteer

1. Better multi-browser support (Chromium, Firefox, WebKit).
2. Strong test reliability features (auto-waiting, robust locators).
3. Excellent CI support and diagnostics (trace viewer, screenshots, videos).
4. Works cleanly with custom runners (including `node:test`) if desired.

## Target Test Architecture

Create a top-level `test/` folder and phase out `routes/__tests__/` over time:

- `test/unit/`:
  - Pure logic tests (`rest.js`, `tokens.js`, helper functions)
- `test/integration/`:
  - Route behavior tests using `supertest` with app/router instances in memory
  - Strong mocking for upstream RERUM/network behavior
- `test/contract/`:
  - API response shape and header contracts
  - Includes route registration/availability checks
- `test/e2e/`:
  - Browser and user-flow checks (Playwright)
  - Minimal critical-path scenarios
- `test/smoke/`:
  - Availability tests (is app up? are endpoints mounted?)
- `test/fixtures/`:
  - Reusable payloads and canned upstream responses
- `test/helpers/`:
  - App factories, env setup, temporary server lifecycle, mock helpers

## Important Architecture Adjustments

### 1) Dependency injection at router/app boundary

To avoid brittle module-level mocking, export route builders that accept dependencies.

Current pattern (hard import):
- route imports `fetchRerum`, `checkAccessToken` directly.

Preferred pattern:
- `buildCreateRouter({ fetchRerum, checkAccessToken, verifyJsonContentType })`
- default export still uses production dependencies.
- tests inject fake dependencies without test-runner-specific magic.

This is the highest-value structural change for reliable, portable tests.

### 2) Distinguish availability vs functionality

- Availability tests:
  - verify endpoint exists and returns expected method guards (e.g., 405 on wrong method)
  - should not depend on upstream services
- Functionality tests:
  - verify request transformation, upstream call behavior, response body/headers/status
  - use mocked upstream behavior exhaustively

### 3) Keep environment control explicit

- Add dedicated test env setup (`test/helpers/env.js`) to set deterministic env vars.
- Never rely on local `.env` for test behavior.
- Ensure tests do not modify user `.env` files.

### 4) Reduce side effects in token handling tests

- Keep token-refresh behavior injectable or guarded so route tests do not fail due to malformed token state.

## Mapping Existing Tags to New Commands

Use path-based scripts and optional name filtering.

Suggested categories:

- `test:all` -> all suites
- `test:core` -> `test/unit` + core integration contract tests
- `test:exists` -> route registration + smoke availability tests
- `test:functional` -> mocked integration tests
- `test:e2e` -> browser tests and true end-to-end flows

For quick local runs, rely on folder-level script filters, not test framework internals.

## Migration Strategy (Incremental)

### Phase 1: Foundation

1. Add `test/` directory with helpers and one migrated sample suite.
2. Add `node:test` scripts alongside existing Jest scripts.
3. Add `c8` coverage command for new suites.

### Phase 2: Route Suite Migration

1. Migrate existing route tests from Jest to `node:test` one file at a time.
2. Keep test names preserving current semantic tags during migration.
3. Validate parity by running old/new suites together temporarily.

### Phase 3: Convert `.testcase.md` to Executable Specs

1. For each testcase markdown file, create corresponding test suite in `test/contract` or `test/integration`.
2. Keep markdown as source-of-truth only during conversion.
3. Remove `.testcase.md` once executable equivalent is merged.

### Phase 4: UI Coverage

1. Add Playwright and minimal smoke UI checks (page load, critical controls visible).
2. Add one interaction test per major user action.
3. Expand only for high-value user journeys.

### Phase 5: Decommission Jest

1. Remove Jest scripts/config/deps after parity is complete.
2. Update docs and contributor workflow.

## CI/GitHub Actions Model

### Pull requests

Run fast and deterministic checks:

1. `test:core`
2. `test:exists`
3. `test:functional` (mocked only)

### Main branch / nightly

Run full quality gates:

1. `test:all`
2. `test:e2e`
3. coverage publish/report

### Suggested safeguards

- Fail fast on lint/type issues if enabled.
- Upload Playwright traces on failure.
- Keep browser tests isolated from unit/integration timing budgets.

## Proposed NPM Script Direction

(illustrative, final command syntax can be adjusted during implementation)

- `test:all` -> `node --test test/**/*.test.js`
- `test:core` -> `node --test test/unit/**/*.test.js test/integration/**/*core*.test.js`
- `test:exists` -> `node --test test/smoke/**/*.test.js test/contract/**/*exists*.test.js`
- `test:functional` -> `node --test test/integration/**/*.test.js`
- `test:e2e` -> `node --test test/e2e/**/*.test.js`
- `coverage` -> `c8 node --test test/**/*.test.js`

## Risks and Mitigations

1. Risk: Migration churn while preserving behavior.
   - Mitigation: side-by-side execution and parity checks per suite.
2. Risk: Mocking complexity around upstream fetch and token middleware.
   - Mitigation: dependency injection and helper factories.
3. Risk: Browser test flakiness.
   - Mitigation: Playwright locators, fixed test data, no arbitrary sleeps.

## Immediate Next Steps

1. Implement Phase 1 scaffolding and scripts.
2. Migrate one representative route suite (`create`) to validate architecture.
3. Add CI job that runs both old and new tests until parity is complete.
4. Begin converting `.testcase.md` files into executable suites.
