# Create Route Test Cases

These are planned coverage cases only. They are intentionally harness-agnostic.

## Scope

Target: `POST /create` and `POST /app/create`

## Missing Coverage

1. Upstream JSON error passthrough
- Setup: upstream returns non-2xx with `Content-Type: application/json` body
- Expected: TinyNode returns same status; body forwarded as plain text through shared messenger

2. Missing `Content-Type` header on request
- Setup: client sends valid JSON body but omits `Content-Type`
- Expected: `415 Unsupported Media Type`

3. Multiple `Content-Type` values
- Setup: request header includes multiple comma-separated MIME values
- Expected: `415 Unsupported Media Type`

4. Upstream timeout/network failure classification
- Setup: fetch rejects with timeout/socket error
- Expected: `502 Bad Gateway` with deterministic plain-text error message

5. Legacy route parity
- Setup: run the same failing scenarios against `/app/create`
- Expected: status and body parity with `/create`
