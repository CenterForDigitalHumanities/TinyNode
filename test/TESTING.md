# TinyNode Testing Guide

## Test Structure

TinyNode includes comprehensive unit and integration tests for local route behavior and request/response handling. Tests are organized by route and concern:

- **routes/**: Tests for each CRUD operation (create, read, update, delete, query)
- **e2e/**: End-to-end tests including UI smoke tests
- **helpers/**: Test utilities and environment setup

## RERUM Connection Testing

**Important:** Actual Tiny > RERUM connections are **not currently tested** with live API calls.

### Why RERUM Connections Aren't Tested

Currently, RERUM does not provide a reliable testing harness that TinyNode can depend on. Therefore:

1. All fetch calls to RERUM endpoints are **mocked** in tests
2. Tests validate TinyNode's local request/response behavior, route handling, and error messaging
3. Tests do **NOT** verify that actual RERUM API calls succeed or fail correctly

### What This Means

Tests will pass even if:
- RERUM API endpoints become unavailable
- RERUM API paths are broken (e.g., `/create` → `/createx`)
- RERUM response schemas change
- Network connectivity issues occur

### Future Improvements

Once RERUM provides a reliable test harness, TinyNode will:
1. Replace generic mocks with schema-based mocks that validate against RERUM's actual API schema
2. Add integration tests that verify real requests to a test RERUM instance
3. Improve test coverage for error handling scenarios when RERUM is unreachable or responds unexpectedly

### Testing Mocked Behavior

Current tests focus on:
- Request validation and marshaling
- Route response formatting
- Error message generation
- REST compliance (correct status codes, headers)
- TinyNode-specific business logic

These are all validated using mocked fetch responses. See individual test files for mock setup details.
