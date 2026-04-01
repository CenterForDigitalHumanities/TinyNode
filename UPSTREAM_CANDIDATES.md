# TinyPen to TinyNode Upstream Candidates

This document tracks candidate updates identified from TinyPen that may be upstreamed into TinyNode.

## Summary

- Inclusion policy: high-confidence candidates plus uncertainty items.
- Evidence policy: each candidate must include TinyPen evidence references.
- Delivery policy: multiple focused PRs by theme.

## Candidate Matrix

| ID | Candidate | Status | TinyPen Evidence | TinyNode Targets | Notes |
| --- | --- | --- | --- | --- | --- |
| C-001 | Content-Type validation middleware for JSON endpoints | upstream-now | PR #39 | `routes/query.js`, `routes/create.js`, `routes/update.js`, `routes/delete.js`, `routes/overwrite.js` | Detect malformed or unsupported media types and return 415. |
| C-002 | Query body validation for empty object/array | upstream-now | PR #33 | `routes/query.js`, `routes/__tests__/query.test.js` | Reject empty query payloads with 400. |
| C-003 | Query pagination validation for `limit` and `skip` | upstream-now | PR #33 | `routes/query.js`, `routes/__tests__/query.test.js` | Require non-negative integers when provided. |
| C-004 | Route-level error semantic consistency | investigate-first | PR #39 and related | `routes/*.js`, `error-messenger.js` | Normalize error objects/status handling before broad refactor. |
| C-005 | Dependency cleanup after Node upgrade | investigate-first | TinyPen dependency diffs | `package.json` | Verify runtime paths before removing deps (`morgan`, `dotenv-expand`, `jsonld`). |
| C-006 | Optimistic locking parity improvements | investigate-first | PR #20 | `routes/overwrite.js`, `routes/__tests__/overwrite.test.js` | Keep current behavior, evaluate if more parity is needed. |
| C-007 | Temporary test alignment imports from TinyPen | upstream-now | PR #35 context | `routes/__tests__/*` | Include useful generated coverage temporarily while test strategy evolves. |

## Excluded or Deferred

| ID | Item | Reason |
| --- | --- | --- |
| X-001 | `.claude` and Claude-specific workflow changes | TPEN-internal tooling. |
| X-002 | TinyPen naming substitutions in API messages | TinyNode and TinyPen naming is intentionally distinct for disambiguation. |
| X-003 | Test framework architecture migration | Out of current scope. |

## PR Grouping Proposal

1. PR-A: request/content validation guards (`C-001`, `C-002`, `C-003`)
2. PR-B: error semantic consistency (`C-004`)
3. PR-C: cleanup and dependency simplification (`C-005`)
4. PR-D: temporary test alignment updates (`C-007`)

## Verification Gates

1. Each merged candidate row includes evidence reference and touched file list.
2. Targeted route tests pass for touched modules.
3. Full test suite passes before merge.
4. Dependency changes include runtime verification notes.
5. Uncertain candidates remain blocked until evidence is upgraded from investigate-first to upstream-now.
