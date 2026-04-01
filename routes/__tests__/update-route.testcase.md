# Update Route Test Cases

These are planned coverage cases only. They are intentionally harness-agnostic.

## Scope

Target: `PUT /update` and `PUT /app/update`

## Missing Coverage

1. Upstream non-2xx text error passthrough
- Setup: upstream update returns text/plain error and non-2xx status
- Expected: TinyNode returns same status and text

2. Upstream JSON error passthrough
- Setup: upstream update returns JSON error payload and non-2xx status
- Expected: TinyNode returns same status and JSON body

3. Network failure mapping
- Setup: fetch rejects before upstream response
- Expected: `502 Bad Gateway`

4. Identifier edge cases
- Setup: body contains malformed `@id` value (type mismatch, blank string)
- Expected: explicit `400` validation response

5. Response shape consistency
- Setup: successful update returns object
- Expected: `200`, `Location` header populated, JSON response body
