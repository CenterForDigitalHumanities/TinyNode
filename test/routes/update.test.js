import "../helpers/env.js"
import assert from "node:assert/strict"
import { afterEach, beforeEach, describe, it } from "node:test"
import express from "express"
import request from "supertest"
import updateRoute from "../../routes/update.js"
import { messenger } from "../../error-messenger.js"

const routeTester = express()
routeTester.use(express.json({ type: ['application/json', 'application/ld+json'] }))
routeTester.use(express.urlencoded({ extended: false }))
routeTester.use("/update", updateRoute)
routeTester.use("/app/update", updateRoute)
routeTester.use(messenger)

const rerumUriOrig = `${process.env.RERUM_ID_PATTERN}_not_`
const rerumUriUpdated = `${process.env.RERUM_ID_PATTERN}_updated_`
const rerumTinyTestObjId = `${process.env.RERUM_ID_PATTERN}tiny_tester`
const originalFetch = global.fetch
let lastFetchUrl, lastFetchOptions

beforeEach(() => {
  lastFetchUrl = null
  lastFetchOptions = null
  global.fetch = async (url, opts) => {
    lastFetchUrl = url
    lastFetchOptions = opts
    return {
      json: async () => ({ "@id": rerumUriUpdated, testing: "item", __rerum: { stuff: "here" } }),
      ok: true,
      text: async () => "Descriptive Error Here"
    }
  }
})

afterEach(() => {
  global.fetch = originalFetch
})

describe("Check that the request/response behavior of the TinyNode update route functions.  Mock the connection to RERUM.  __mock_functions", () => {
  it("'/update' route request and response behavior is functioning.", async () => {
    const response = await request(routeTester)
      .put("/update")
      .send({ "@id": rerumUriOrig, testing: "item" })
      .set("Content-Type", "application/json")

    assert.equal(response.statusCode, 200)
    assert.equal(response.header.location, rerumUriUpdated)
    assert.equal(response.body.testing, "item")
    
    // Verify upstream contract
    assert.match(lastFetchUrl, /\/update$/, "URL should end with /update")
    assert.equal(lastFetchOptions.method, "PUT", "Method should be PUT")
    assert.match(lastFetchOptions.headers["Authorization"], /^Bearer /, "Authorization header missing or invalid")
    assert.equal(lastFetchOptions.headers["Content-Type"], "application/json;charset=utf-8", "Content-Type header mismatch")
  })

  it("Falls back to rerumResponse.id when @id is absent.", async () => {
    const fallbackUri = `${process.env.RERUM_ID_PATTERN}_fallback_`
    global.fetch = async () => ({
      json: async () => ({ id: fallbackUri, testing: "item" }),
      ok: true
    })

    const response = await request(routeTester)
      .put("/update")
      .send({ "@id": rerumUriOrig, testing: "item" })
      .set("Content-Type", "application/json")

    assert.equal(response.statusCode, 200)
    assert.equal(response.header.location, fallbackUri)
  })
})

describe("Check that incorrect TinyNode update route usage results in expected RESTful responses from RERUM.  __rest __core", () => {
  it("Incorrect '/update' route usage has expected RESTful responses.", async () => {
    let response = await request(routeTester).get("/update")
    assert.equal(response.statusCode, 405)

    response = await request(routeTester).post("/update")
    assert.equal(response.statusCode, 405)

    response = await request(routeTester).patch("/update")
    assert.equal(response.statusCode, 405)

    response = await request(routeTester).delete("/update")
    assert.equal(response.statusCode, 405)

    response = await request(routeTester)
      .put("/update")
      .set("Content-Type", "application/json")
      .send("not json")
    assert.equal(response.statusCode, 400)

    response = await request(routeTester)
      .put("/update")
      .set("Content-Type", "application/json")
      .send({ no: "@id" })
    assert.equal(response.statusCode, 400)

    response = await request(routeTester)
      .put("/update")
      .set("Content-Type", "text/plain")
      .send("plain text")
    assert.equal(response.statusCode, 415)
  })
})

describe("Update network failure behavior.  __rest __core", () => {
  it("Maps rejected fetch to 502.", async () => {
    global.fetch = async () => { throw new Error("socket hang up") }

    const response = await request(routeTester)
      .put("/update")
      .set("Content-Type", "application/json")
      .send({ "@id": rerumUriOrig, testing: "item" })
    assert.equal(response.statusCode, 502)
  })

  it("Preserves upstream text error message when update returns non-ok.", async () => {
    global.fetch = async () => ({
      ok: false,
      status: 503,
      text: async () => "Upstream update failure"
    })

    const response = await request(routeTester)
      .put("/update")
      .set("Content-Type", "application/json")
      .send({ "@id": rerumUriOrig, testing: "item" })

    assert.equal(response.statusCode, 502)
    assert.match(response.text, /Upstream update failure/)
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
      .put("/update")
      .set("Content-Type", "application/json")
      .send({ "@id": rerumUriOrig, testing: "item" })

    assert.equal(response.statusCode, 502)
    assert.match(response.text, /A RERUM error occurred/)
  })

  it("Maps successful upstream payload without id fields to 502.", async () => {
    global.fetch = async () => ({
      ok: true,
      json: async () => ({ testing: "item" })
    })

    const response = await request(routeTester)
      .put("/update")
      .set("Content-Type", "application/json")
      .send({ "@id": rerumUriOrig, testing: "item" })

    assert.equal(response.statusCode, 502)
    assert.match(response.text, /A RERUM error occurred/)
  })
})

describe("Check that the update route passes caller tokens through to RERUM.  __mock_functions __core", () => {
  it("Sends the caller's Authorization header upstream verbatim.", async () => {
    const response = await request(routeTester)
      .put("/update")
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer caller-m2m-token")
      .send({ "@id": rerumUriOrig, testing: "item" })

    assert.equal(response.statusCode, 200)
    assert.equal(lastFetchOptions.headers["Authorization"], "Bearer caller-m2m-token")
  })

  it("Rejects caller tokens with 403 when passthrough is disabled.", async () => {
    process.env.ALLOW_PASSTHROUGH_TOKENS = "false"
    try {
      const response = await request(routeTester)
        .put("/update")
        .set("Content-Type", "application/json")
        .set("Authorization", "Bearer caller-m2m-token")
        .send({ "@id": rerumUriOrig, testing: "item" })

      assert.equal(response.statusCode, 403)
      assert.equal(lastFetchUrl, null, "upstream fetch must not happen when passthrough is rejected")
      assert.match(response.text, /passthrough is not allowed/i)
    }
    finally {
      delete process.env.ALLOW_PASSTHROUGH_TOKENS
    }
  })

  it("Maps upstream 401/403 to 502 while preserving RERUM's message.", async () => {
    global.fetch = async () => ({
      ok: false,
      status: 401,
      text: async () => "Unauthorized: bad or expired access token"
    })

    let response = await request(routeTester)
      .put("/update")
      .set("Content-Type", "application/json")
      .set("Authorization", "******")
      .send({ "@id": rerumUriOrig, testing: "item" })

    assert.equal(response.statusCode, 502)
    assert.match(response.text, /^401:/)
    assert.match(response.text, /Unauthorized/)

    global.fetch = async () => ({
      ok: false,
      status: 403,
      text: async () => "Forbidden"
    })

    response = await request(routeTester)
      .put("/update")
      .set("Content-Type", "application/json")
      .set("Authorization", "******")
      .send({ "@id": rerumUriOrig, testing: "item" })

    assert.equal(response.statusCode, 502)
    assert.match(response.text, /^403:/)
    assert.match(response.text, /Forbidden/)
  })
  it("Keeps 502 for other upstream failures so passthrough errors stay distinguishable.", async () => {
    global.fetch = async () => ({
      ok: false,
      status: 500,
      text: async () => "Upstream blew up"
    })

    const response = await request(routeTester)
      .put("/update")
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer caller-m2m-token")
      .send({ "@id": rerumUriOrig, testing: "item" })

    assert.equal(response.statusCode, 502)
    assert.match(response.text, /Upstream blew up/)
  })
})

describe("Check that the properly used update endpoints function and interact with RERUM.  __e2e", () => {
  it("'/update' route can update an object in RERUM.", async () => {
    const response = await request(routeTester)
      .put("/update")
      .send({ "@id": rerumTinyTestObjId, testing: "item" })
      .set("Content-Type", "application/json")

    assert.equal(response.statusCode, 200)
    assert.ok(response.header.location)
    assert.notEqual(response.header.location, rerumTinyTestObjId)
    assert.equal(response.body.testing, "item")
  })
})
