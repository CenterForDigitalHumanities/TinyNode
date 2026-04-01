# Overwrite Route Test Cases

These are planned coverage cases only. They are intentionally harness-agnostic.

## Scope

Target: `PUT /overwrite` and `PUT /app/overwrite`

## Missing Coverage

1. Conflict (`409`) passthrough
- Setup: upstream returns `409` with JSON current version payload
- Expected: TinyNode returns `409` and same JSON payload

2. Header precedence contract
- Setup: both `If-Overwritten-Version` header and `__rerum.isOverwritten` body value are supplied
- Expected: documented precedence is consistently enforced

3. Non-JSON upstream error response
- Setup: upstream returns non-2xx with missing or non-JSON content type
- Expected: shared messenger handles without local exception

4. Network failure mapping
- Setup: fetch rejects before upstream response
- Expected: `502 Bad Gateway`

5. Legacy route parity
- Setup: same conflict/error scenarios against `/app/overwrite`
- Expected: parity with `/overwrite`
