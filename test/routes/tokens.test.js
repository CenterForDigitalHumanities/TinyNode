import "../helpers/env.js"
import assert from "node:assert/strict"
import { afterEach, describe, it } from "node:test"
import checkAccessToken from "../../tokens.js"

const originalAccessToken = process.env.ACCESS_TOKEN
const originalFetch = global.fetch

afterEach(() => {
  process.env.ACCESS_TOKEN = originalAccessToken
  global.fetch = originalFetch
})

function jwtWithExp(expSeconds) {
  const payload = Buffer.from(JSON.stringify({ exp: expSeconds })).toString("base64")
  return `header.${payload}.signature`
}

describe("checkAccessToken middleware behavior.  __core", () => {
  it("Calls next when ACCESS_TOKEN is missing.", async () => {
    delete process.env.ACCESS_TOKEN
    let called = 0

    await checkAccessToken({}, {}, err => {
      assert.equal(err, undefined)
      called += 1
    })

    assert.equal(called, 1)
  })

  it("Treats malformed token as non-expired and calls next.", async () => {
    process.env.ACCESS_TOKEN = "not-a-jwt"
    let called = 0

    await checkAccessToken({}, {}, err => {
      assert.equal(err, undefined)
      called += 1
    })

    assert.equal(called, 1)
  })

  it("Propagates refresh errors to next(err) when token is expired.", async () => {
    process.env.ACCESS_TOKEN = jwtWithExp(Math.floor(Date.now() / 1000) - 60)
    global.fetch = async () => {
      throw new Error("refresh failed")
    }

    let receivedError
    await checkAccessToken({}, {}, err => {
      receivedError = err
    })

    assert.ok(receivedError)
    assert.match(receivedError.message, /refresh failed/)
  })
})
