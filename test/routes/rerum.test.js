import "../helpers/env.js"
import assert from "node:assert/strict"
import { afterEach, beforeEach, describe, it } from "node:test"
import { fetchRerum } from "../../rerum.js"

const originalFetch = global.fetch
const originalTimeout = process.env.RERUM_FETCH_TIMEOUT_MS
const originalSetTimeout = global.setTimeout
const originalClearTimeout = global.clearTimeout

beforeEach(() => {
  process.env.RERUM_FETCH_TIMEOUT_MS = "1"
})

afterEach(() => {
  global.fetch = originalFetch
  process.env.RERUM_FETCH_TIMEOUT_MS = originalTimeout
  global.setTimeout = originalSetTimeout
  global.clearTimeout = originalClearTimeout
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

  it("Maps non-timeout fetch failures to a 502 upstream network error.", async () => {
    global.fetch = async () => {
      throw new Error("socket hang up")
    }

    await assert.rejects(
      () => fetchRerum("https://example.org/rerum"),
      err => {
        assert.equal(err.status, 502)
        assert.match(err.message, /A RERUM error occurred/)
        return true
      }
    )
  })

  it("Uses the provided signal path and still resolves successful responses.", async () => {
    const externalController = new AbortController()
    global.fetch = async (url, options = {}) => {
      assert.ok(options.signal, "A signal should be forwarded to fetch")
      return { ok: true, source: url }
    }

    const response = await fetchRerum("https://example.org/rerum", { signal: externalController.signal })
    assert.equal(response.ok, true)
    assert.equal(response.source, "https://example.org/rerum")
  })

  it("Falls back to default timeout when configured timeout is invalid.", async () => {
    process.env.RERUM_FETCH_TIMEOUT_MS = "-10"
    let capturedTimeoutMs = null
    let timeoutFn

    global.setTimeout = (fn, ms) => {
      timeoutFn = fn
      capturedTimeoutMs = ms
      return 1
    }
    global.clearTimeout = () => {}
    global.fetch = async () => ({ ok: true })

    await fetchRerum("https://example.org/rerum")
    assert.equal(capturedTimeoutMs, 30000)
    assert.equal(typeof timeoutFn, "function")
  })
})
