# Delete Route Test Cases

These are planned coverage cases only. They are intentionally harness-agnostic.

## Scope

Target: `DELETE /delete`, `DELETE /delete/:id`, and legacy `/app` equivalents

## Missing Coverage

1. Body-delete upstream failure passthrough
- Setup: `/delete` upstream returns non-2xx
- Expected: error goes through shared messenger with preserved status

2. Path-delete upstream failure passthrough
- Setup: `/delete/:id` upstream returns non-2xx
- Expected: error goes through shared messenger with preserved status

3. Network failure mapping for both delete forms
- Setup: fetch rejects for `/delete` and `/delete/:id`
- Expected: `502 Bad Gateway`

4. Missing id/body validation behavior
- Setup: `/delete` without id in body
- Expected: `400` with clear message

5. Legacy route parity
- Setup: mirror failure scenarios for `/app/delete` and `/app/delete/:id`
- Expected: same behavior as non-legacy routes
