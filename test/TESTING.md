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

### Upstream Contract Validation

To improve coverage, each route's `__mock_functions` test now **validates the upstream contract** by asserting on:

- **URL**: Verifies the correct RERUM endpoint is called (e.g., `/create`, `/query?limit=10&skip=0`)
- **HTTP Method**: Confirms POST for create/query, PUT for update/overwrite, DELETE for delete
- **Authorization Header**: Ensures Bearer token is present and properly formatted
- **Content-Type Header**: Validates correct JSON encoding

Example from create.test.js:
```javascript
// Verify upstream contract
assert.match(lastFetchUrl, /\/create$/, "URL should end with /create")
assert.equal(lastFetchOptions.method, "POST", "Method should be POST")
assert.match(lastFetchOptions.headers["Authorization"], /^Bearer /, "Authorization header missing or invalid")
assert.equal(lastFetchOptions.headers["Content-Type"], "application/json;charset=utf-8", "Content-Type header mismatch")
```

This catches breaking changes like:
- ✅ Typos in endpoint URLs (`/createx` instead of `/create`)
- ✅ Missing or incorrect Authorization headers
- ✅ Wrong HTTP methods
- ✅ Incorrect Content-Type headers

### If-Overwritten-Version Header Behavior

The overwrite route includes special handling for version conflict resolution via the `If-Overwritten-Version` header. Tests validate:

1. **Request header passthrough** — `If-Overwritten-Version` from the request is forwarded upstream
2. **Body extraction** — `__rerum.isOverwritten` in the request body becomes the upstream header
3. **Precedence** — Body value takes priority over request header value
4. **Absence handling** — Headers are only added when values are present

Example from overwrite.test.js:
```javascript
// Passes request header through
await request(routeTester)
  .put("/overwrite")
  .send({ "@id": rerumTinyTestObjId, testing: "item" })
  .set("If-Overwritten-Version", "abc123")

assert.equal(lastFetchOptions.headers["If-Overwritten-Version"], "abc123")

// Or extracts from body __rerum.isOverwritten
await request(routeTester)
  .put("/overwrite")
  .send({ "@id": rerumTinyTestObjId, __rerum: { isOverwritten: "xyz789" } })

assert.equal(lastFetchOptions.headers["If-Overwritten-Version"], "xyz789")
```

This prevents accidental changes to:
- ✅ Header passthrough logic
- ✅ Body field name (`isOverwritten` vs other names)
- ✅ Precedence between header and body sources

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
- Upstream contract validation (URL, method, headers)

These are all validated using mocked fetch responses. See individual test files for mock setup details.
