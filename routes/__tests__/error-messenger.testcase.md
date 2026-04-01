# Shared Error Messenger Test Cases

These are planned coverage cases only. They are intentionally harness-agnostic.

## Scope

Target: shared middleware in `error-messenger.js`

## Missing Coverage

1. Generic Error fallback
- Setup: plain `Error` object without response-like fields
- Expected: `500` fallback with safe plain-text message

2. Headers already sent guard
- Setup: middleware invoked after headers were sent
- Expected: middleware exits without secondary write attempts

3. `.text()` failure fallback
- Setup: upstream response `.text()` rejects (e.g., body stream already consumed)
- Expected: middleware uses generic fallback message with status preserved

4. Empty upstream body behavior
- Setup: upstream error response has status but empty body
- Expected: status preserved and default message used

5. Status source precedence
- Setup: error object has multiple status fields (`statusCode`, `status`)
- Expected: precedence is deterministic and documented
