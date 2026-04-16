import "../helpers/env.js"
import assert from "node:assert/strict"
import { afterEach, beforeEach, describe, it } from "node:test"
import { fetchRerum } from "../../rerum.js"

const originalFetch = global.fetch
const originalTimeout = process.env.RERUM_FETCH_TIMEOUT_MS

beforeEach(() => {
  process.env.RERUM_FETCH_TIMEOUT_MS = "1"
})

afterEach(() => {
  global.fetch = originalFetch
  process.env.RERUM_FETCH_TIMEOUT_MS = originalTimeout
})

describe("fetchRerum timeout behavior.  __core", () => {
  it("Maps timeout aborts to a 504 upstream timeout error.", async () => {
    global.fetch = async (url, options = {}) => {
      const { signal } = options
      return await new Promise((resolve, reject) => {
        signal?.addEventListener("abort", () => {
          const err = new Error("request aborted")
          err.name = "AbortError"
          reject(err)
        })
      })
    }

    await assert.rejects(
      () => fetchRerum("https://example.org/rerum"),
      err => {
        assert.equal(err.status, 504)
        assert.match(err.message, /did not respond within/i)
        return true
      }
    )
  })
})
