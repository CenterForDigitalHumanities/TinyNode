import "../helpers/env.js"
import assert from "node:assert/strict"
import { afterEach, beforeEach, describe, it } from "node:test"
import express from "express"
import request from "supertest"
import createRoute from "../../routes/create.js"
import { messenger } from "../../error-messenger.js"

const routeTester = express()
routeTester.use(express.json({ type: ['application/json', 'application/ld+json'] }))
routeTester.use(express.urlencoded({ extended: false }))
routeTester.use("/create", createRoute)
routeTester.use("/app/create", createRoute)
routeTester.use(messenger)

const rerumUri = `${process.env.RERUM_ID_PATTERN}_not_`
const originalFetch = global.fetch
let lastFetchUrl, lastFetchOptions

beforeEach(() => {
  lastFetchUrl = null
  lastFetchOptions = null
  global.fetch = async (url, opts) => {
    lastFetchUrl = url
    lastFetchOptions = opts
    return {
      json: async () => ({ "@id": rerumUri, test: "item", __rerum: { stuff: "here" } }),
      ok: true,
      text: async () => "Descriptive Error Here"
    }
  }
})

afterEach(() => {
  global.fetch = originalFetch
})

describe("Check that the request/response behavior of the TinyNode create route functions.  __mock_functions", () => {
  it("'/create' route request and response behavior is functioning.", async () => {
    const response = await request(routeTester)
      .post("/create")
      .send({ test: "item" })
      .set("Content-Type", "application/json")

    assert.equal(response.statusCode, 201)
    assert.equal(response.header.location, rerumUri)
    assert.equal(response.body.test, "item")
    
    // Verify upstream contract
    assert.match(lastFetchUrl, /\/create$/, "URL should end with /create")
    assert.equal(lastFetchOptions.method, "POST", "Method should be POST")
    assert.match(lastFetchOptions.headers["Authorization"], /^Bearer /, "Authorization header missing or invalid")
    assert.equal(lastFetchOptions.headers["Content-Type"], "application/json;charset=utf-8", "Content-Type header mismatch")
  })

  it("Converts body id to _id before sending upstream.", async () => {
    const response = await request(routeTester)
      .post("/create")
      .send({ id: "https://example.org/id/abc123", test: "item" })
      .set("Content-Type", "application/json")

    assert.equal(response.statusCode, 201)
    const upstreamBody = JSON.parse(lastFetchOptions.body)
    assert.equal(upstreamBody._id, "abc123")
    assert.equal(upstreamBody.id, "https://example.org/id/abc123")
  })

  it("Accepts application/ld+json content type.", async () => {
    const response = await request(routeTester)
      .post("/create")
      .send({ test: "item" })
      .set("Content-Type", "application/ld+json")

    assert.equal(response.statusCode, 201)
    assert.ok(response.header.location)
    assert.equal(response.body.test, "item")
  })

  it("Falls back to rerumResponse.id when @id is absent.", async () => {
    const fallbackUri = `${process.env.RERUM_ID_PATTERN}_fallback_`
    global.fetch = async () => ({
      json: async () => ({ id: fallbackUri, test: "item" }),
      ok: true
    })

    const response = await request(routeTester)
      .post("/create")
      .send({ test: "item" })
      .set("Content-Type", "application/json")

    assert.equal(response.statusCode, 201)
    assert.equal(response.header.location, fallbackUri)
  })
})

describe("Check that incorrect TinyNode create route usage results in expected RESTful responses from RERUM.  __rest __core", () => {
  it("Incorrect '/create' route usage has expected RESTful responses.", async () => {
    let response = await request(routeTester).get("/create")
    assert.equal(response.statusCode, 405)

    response = await request(routeTester).put("/create")
    assert.equal(response.statusCode, 405)

    response = await request(routeTester).patch("/create")
    assert.equal(response.statusCode, 405)

    response = await request(routeTester).delete("/create")
    assert.equal(response.statusCode, 405)

    response = await request(routeTester)
      .post("/create")
      .set("Content-Type", "application/json")
      .send("not json")
    assert.equal(response.statusCode, 400)

    response = await request(routeTester)
      .post("/create")
      .set("Content-Type", "text/plain")
      .send("plain text")
    assert.equal(response.statusCode, 415)

  })
})

describe("Check that TinyNode create route propagates upstream and network errors predictably.  __rest __core", () => {
  it("Preserves upstream text errors and maps network failures to 502.", async () => {
    global.fetch = async () => ({
      ok: false,
      status: 503,
      headers: {
        get: () => "text/plain; charset=utf-8"
      },
      text: async () => "Upstream create failure"
    })

    let response = await request(routeTester)
      .post("/create")
      .set("Content-Type", "application/json")
      .send({ test: "item" })
    assert.equal(response.statusCode, 502)
    assert.match(response.text, /Upstream create failure/)

    global.fetch = async () => {
      throw new Error("socket hang up")
    }

    response = await request(routeTester)
      .post("/create")
      .set("Content-Type", "application/json")
      .send({ test: "item" })
    assert.equal(response.statusCode, 502)
    assert.match(response.text, /A RERUM error occurred/)
  })

  it("Falls back to generic RERUM error text when upstream .text() throws.", async () => {
    global.fetch = async () => ({
      ok: false,
      status: 500,
      text: async () => {
        throw new Error("text stream consumed")
      }
    })

    const response = await request(routeTester)
      .post("/create")
      .set("Content-Type", "application/json")
      .send({ test: "item" })

    assert.equal(response.statusCode, 502)
    assert.match(response.text, /A RERUM error occurred/)
  })

  it("Maps successful upstream payload without id fields to 502.", async () => {
    global.fetch = async () => ({
      ok: true,
      json: async () => ({ test: "item" })
    })

    const response = await request(routeTester)
      .post("/create")
      .set("Content-Type", "application/json")
      .send({ test: "item" })

    assert.equal(response.statusCode, 502)
    assert.match(response.text, /A RERUM error occurred/)
  })
})

describe("Check that the create route passes caller tokens through to RERUM.  __mock_functions __core", () => {
  it("Sends the caller's Authorization header upstream verbatim.", async () => {
    const response = await request(routeTester)
      .post("/create")
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer caller-m2m-token")
      .send({ test: "item" })

    assert.equal(response.statusCode, 201)
    assert.equal(lastFetchOptions.headers["Authorization"], "Bearer caller-m2m-token")
  })

  it("Uses the instance token upstream when no Authorization header is supplied.", async () => {
    const response = await request(routeTester)
      .post("/create")
      .set("Content-Type", "application/json")
      .send({ test: "item" })

    assert.equal(response.statusCode, 201)
    assert.match(lastFetchOptions.headers["Authorization"], /^Bearer /)
    assert.ok(lastFetchOptions.headers["Authorization"] !== "Bearer caller-m2m-token")
  })

  it("Rejects caller tokens with 403 when passthrough is disabled.", async () => {
    process.env.ALLOW_PASSTHROUGH_TOKENS = "false"
    try {
      const response = await request(routeTester)
        .post("/create")
        .set("Content-Type", "application/json")
        .set("Authorization", "Bearer caller-m2m-token")
        .send({ test: "item" })

      assert.equal(response.statusCode, 403)
      assert.equal(lastFetchUrl, null, "upstream fetch must not happen when passthrough is rejected")
      assert.match(response.text, /passthrough is not allowed/i)
    }
    finally {
      delete process.env.ALLOW_PASSTHROUGH_TOKENS
    }
  })

  it("Allows requests without a token when passthrough is disabled.", async () => {
    process.env.ALLOW_PASSTHROUGH_TOKENS = "false"
    try {
      const response = await request(routeTester)
        .post("/create")
        .set("Content-Type", "application/json")
        .send({ test: "item" })

      assert.equal(response.statusCode, 201)
      assert.match(lastFetchOptions.headers["Authorization"], /^Bearer /)
    }
    finally {
      delete process.env.ALLOW_PASSTHROUGH_TOKENS
    }
  })

  it("Passes upstream 401/403 through with real status for passthrough requests.", async () => {
    global.fetch = async () => ({
      ok: false,
      status: 401,
      text: async () => "Unauthorized: bad or expired access token"
    })

    let response = await request(routeTester)
      .post("/create")
      .set("Content-Type", "application/json")
      .set("Authorization", "******")
      .send({ test: "item" })

    assert.equal(response.statusCode, 401)
    assert.match(response.text, /^401:/)
    assert.match(response.text, /Unauthorized/)

    global.fetch = async () => ({
      ok: false,
      status: 403,
      text: async () => "Forbidden"
    })

    response = await request(routeTester)
      .post("/create")
      .set("Content-Type", "application/json")
      .set("Authorization", "******")
      .send({ test: "item" })

    assert.equal(response.statusCode, 403)
    assert.match(response.text, /^403:/)
    assert.match(response.text, /Forbidden/)
  })

  it("Maps upstream 401/403 to 502 for instance-token requests.", async () => {
    global.fetch = async () => ({
      ok: false,
      status: 401,
      text: async () => "Unauthorized: bad or expired access token"
    })

    let response = await request(routeTester)
      .post("/create")
      .set("Content-Type", "application/json")
      .send({ test: "item" })

    assert.equal(response.statusCode, 502)
    assert.match(response.text, /^401:/)
    assert.match(response.text, /Unauthorized/)

    global.fetch = async () => ({
      ok: false,
      status: 403,
      text: async () => "Forbidden"
    })

    response = await request(routeTester)
      .post("/create")
      .set("Content-Type", "application/json")
      .send({ test: "item" })

    assert.equal(response.statusCode, 502)
    assert.match(response.text, /^403:/)
    assert.match(response.text, /Forbidden/)
  })
})

describe('Keeps 502 for other upstream failures so passthrough errors stay distinguishable.', () => {
  it("Keeps 502 for other upstream failures so passthrough errors stay distinguishable.", async () => {
    global.fetch = async () => ({
      ok: false,
      status: 500,
      text: async () => "Upstream blew up"
    })

    const response = await request(routeTester)
      .post("/create")
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer caller-m2m-token")
      .send({ test: "item" })

    assert.equal(response.statusCode, 502)
    assert.match(response.text, /Upstream blew up/)
  })
})

describe("Check that the properly used create endpoints function and interact with RERUM.  __e2e", () => {
  it("'/create' route can save an object to RERUM.", async () => {
    const response = await request(routeTester)
      .post("/create")
      .send({ test: "item" })
      .set("Content-Type", "application/json")

    assert.equal(response.statusCode, 201)
    assert.ok(response.header.location)
    assert.equal(response.body.test, "item")
  })
})
