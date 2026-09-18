import "../helpers/env.js"
import assert from "node:assert/strict"
import { afterEach, describe, it } from "node:test"
import {
    isPassthroughAllowed,
    isPassthroughRequest,
    requirePassthroughAllowed,
    resolveAuthorization,
} from "../../routes/helpers/passthrough.js"
import checkAccessToken from "../../tokens.js"

const originalFetch = global.fetch
const originalAllowPassthrough = process.env.ALLOW_PASSTHROUGH_TOKENS
const originalAccessToken = process.env.ACCESS_TOKEN

afterEach(() => {
    global.fetch = originalFetch
    process.env.ACCESS_TOKEN = originalAccessToken
    if (originalAllowPassthrough === undefined) {
        delete process.env.ALLOW_PASSTHROUGH_TOKENS
    }
    else {
        process.env.ALLOW_PASSTHROUGH_TOKENS = originalAllowPassthrough
    }
})

function jwtWithExp(expSeconds) {
    const payload = Buffer.from(JSON.stringify({ exp: expSeconds })).toString("base64")
    return `header.${payload}.signature`
}

describe("Passthrough helper behavior.  __core __mock_functions", () => {
    it("Allows passthrough by default with no ALLOW_PASSTHROUGH_TOKENS value.", () => {
        delete process.env.ALLOW_PASSTHROUGH_TOKENS
        assert.equal(isPassthroughAllowed(), true)
    })

    it("Disables passthrough only when ALLOW_PASSTHROUGH_TOKENS is exactly 'false'.", () => {
        process.env.ALLOW_PASSTHROUGH_TOKENS = "false"
        assert.equal(isPassthroughAllowed(), false)
        process.env.ALLOW_PASSTHROUGH_TOKENS = "FALSE"
        assert.equal(isPassthroughAllowed(), true)
        process.env.ALLOW_PASSTHROUGH_TOKENS = "0"
        assert.equal(isPassthroughAllowed(), true)
        process.env.ALLOW_PASSTHROUGH_TOKENS = "true"
        assert.equal(isPassthroughAllowed(), true)
    })

    it("resolveAuthorization uses the caller's header verbatim when passthrough is allowed.", () => {
        const req = { headers: { authorization: "Bearer caller-token" } }
        process.env.ACCESS_TOKEN = "instance-token"
        assert.equal(resolveAuthorization(req), "Bearer caller-token")
    })

    it("resolveAuthorization preserves non-Bearer schemes verbatim.", () => {
        const req = { headers: { authorization: "Basic dXNlcjpwYXNz" } }
        assert.equal(resolveAuthorization(req), "Basic dXNlcjpwYXNz")
    })

    it("resolveAuthorization falls back to the instance token when no header is present.", () => {
        process.env.ACCESS_TOKEN = "instance-token"
        assert.equal(resolveAuthorization({ headers: {} }), "Bearer instance-token")
        assert.equal(resolveAuthorization({}), "Bearer instance-token")
    })

    it("resolveAuthorization ignores the caller's token when passthrough is disabled.", () => {
        process.env.ALLOW_PASSTHROUGH_TOKENS = "false"
        process.env.ACCESS_TOKEN = "instance-token"
        const req = { headers: { authorization: "Bearer caller-token" } }
        assert.equal(resolveAuthorization(req), "Bearer instance-token")
    })
})

describe("Passthrough guard middleware behavior.  __core __mock_functions", () => {
    it("Calls next() when no Authorization header is present, passthrough disabled.", () => {
        process.env.ALLOW_PASSTHROUGH_TOKENS = "false"
        let called = 0
        requirePassthroughAllowed({ headers: {} }, {}, err => {
            assert.equal(err, undefined)
            called += 1
        })
        assert.equal(called, 1)
    })

    it("Calls next() when an Authorization header is present and passthrough is allowed.", () => {
        let called = 0
        requirePassthroughAllowed({ headers: { authorization: "Bearer caller-token" } }, {}, err => {
            assert.equal(err, undefined)
            called += 1
        })
        assert.equal(called, 1)
    })

    it("Rejects with 403 when a token is supplied and passthrough is disabled.", () => {
        process.env.ALLOW_PASSTHROUGH_TOKENS = "false"
        let receivedError
        requirePassthroughAllowed({ headers: { authorization: "Bearer caller-token" } }, {}, err => {
            receivedError = err
        })
        assert.ok(receivedError, "guard must hand an error to next()")
        assert.equal(receivedError.status, 403)
        assert.match(receivedError.message, /passthrough is not allowed/i)
    })
})

describe("Passthrough interaction with checkAccessToken.  __core __mock_functions", () => {
    it("Skips the instance token refresh cycle for passthrough requests.", async () => {
        // Expired instance token would normally trigger a refresh fetch.
        process.env.ACCESS_TOKEN = jwtWithExp(Math.floor(Date.now() / 1000) - 60)
        global.fetch = async () => {
            throw new Error("refresh fetch must not happen for passthrough requests")
        }

        let nextError
        await checkAccessToken({ headers: { authorization: "Bearer caller-token" } }, {}, err => {
            nextError = err
        })

        assert.equal(nextError, undefined)
    })

    it("Still refreshes the instance token when the request has no Authorization header.", async () => {
        process.env.ACCESS_TOKEN = jwtWithExp(Math.floor(Date.now() / 1000) - 60)
        process.env.RERUM_ACCESS_TOKEN_URL = "https://auth.example/token"
        process.env.REFRESH_TOKEN = "refresh-token"
        let refreshCalled = 0
        global.fetch = async (url, options) => {
            refreshCalled += 1
            assert.equal(url, "https://auth.example/token")
            assert.equal(options.method, "POST")
            return {
                json: async () => ({ access_token: "new-access-token" })
            }
        }

        let nextError
        await checkAccessToken({ headers: {} }, {}, err => {
            nextError = err
        })

        assert.equal(nextError, undefined)
        assert.equal(refreshCalled, 1)
        assert.equal(process.env.ACCESS_TOKEN, "new-access-token")
    })

    it("Does NOT skip the refresh cycle when passthrough is disabled, even with a header.", async () => {
        process.env.ALLOW_PASSTHROUGH_TOKENS = "false"
        process.env.ACCESS_TOKEN = jwtWithExp(Math.floor(Date.now() / 1000) - 60)
        process.env.RERUM_ACCESS_TOKEN_URL = "https://auth.example/token"
        process.env.REFRESH_TOKEN = "refresh-token"
        let refreshCalled = 0
        global.fetch = async () => {
            refreshCalled += 1
            return {
                json: async () => ({ access_token: "refreshed-anyway" })
            }
        }

        let nextError
        await checkAccessToken({ headers: { authorization: "Bearer caller-token" } }, {}, err => {
            nextError = err
        })

        assert.equal(nextError, undefined)
        assert.equal(refreshCalled, 1)
    })
})
