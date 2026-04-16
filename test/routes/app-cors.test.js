import assert from "node:assert/strict"
import { afterEach, beforeEach, describe, it } from "node:test"
import request from "supertest"

const originalOpenApiCors = process.env.OPEN_API_CORS

beforeEach(() => {
  process.env.OPEN_API_CORS = "true"
})

afterEach(() => {
  process.env.OPEN_API_CORS = originalOpenApiCors
})

describe("App CORS middleware behavior.  __core", () => {
  it("Adds CORS headers when OPEN_API_CORS is enabled.", async () => {
    const { default: app } = await import("../../app.js?test-cors-enabled")

    const response = await request(app)
      .get("/index.html")
      .set("Origin", "http://example.test")

    assert.equal(response.statusCode, 200)
    assert.equal(response.header["access-control-allow-origin"], "*")
    assert.equal(response.header["access-control-expose-headers"], "*")
  })
})
