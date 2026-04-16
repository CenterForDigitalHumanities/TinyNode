import "../helpers/env.js"
import assert from "node:assert/strict"
import { afterEach, beforeEach, describe, it } from "node:test"
import express from "express"
import request from "supertest"
import overwriteRoute from "../../routes/overwrite.js"
import { messenger } from "../../error-messenger.js"

const routeTester = express()
routeTester.use(express.json({ type: ['application/json', 'application/ld+json'] }))
routeTester.use(express.urlencoded({ extended: false }))
routeTester.use("/overwrite", overwriteRoute)
routeTester.use("/app/overwrite", overwriteRoute)
routeTester.use(messenger)

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
      json: async () => ({ "@id": rerumTinyTestObjId, testing: "item", __rerum: { stuff: "here" } }),
      ok: true,
      text: async () => "Descriptive Error Here"
    }
  }
})

afterEach(() => {
  global.fetch = originalFetch
})

describe("Check that the request/response behavior of the TinyNode overwrite route functions.  Mock the connection to RERUM.  __mock_functions", () => {
  it("'/overwrite' route request and response behavior is functioning.", async () => {
    const response = await request(routeTester)
      .put("/overwrite")
      .send({ "@id": rerumTinyTestObjId, testing: "item" })
      .set("Content-Type", "application/json")

    assert.equal(response.statusCode, 200)
    assert.equal(response.header.location, rerumTinyTestObjId)
    assert.equal(response.body.testing, "item")
    
    // Verify upstream contract
    assert.match(lastFetchUrl, /\/overwrite$/, "URL should end with /overwrite")
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
      .put("/overwrite")
      .send({ "@id": rerumTinyTestObjId, testing: "item" })
      .set("Content-Type", "application/json")

    assert.equal(response.statusCode, 200)
    assert.equal(response.header.location, fallbackUri)
  })
})

describe("Check that incorrect TinyNode overwrite route usage results in expected RESTful responses from RERUM.  __rest __core", () => {
  it("Incorrect '/overwrite' route usage has expected RESTful responses.", async () => {
    let response = await request(routeTester).get("/overwrite")
    assert.equal(response.statusCode, 405)

    response = await request(routeTester).post("/overwrite")
    assert.equal(response.statusCode, 405)

    response = await request(routeTester).patch("/overwrite")
    assert.equal(response.statusCode, 405)

    response = await request(routeTester).delete("/overwrite")
    assert.equal(response.statusCode, 405)

    response = await request(routeTester)
      .put("/overwrite")
      .set("Content-Type", "application/json")
      .send("not json")
    assert.equal(response.statusCode, 400)

    response = await request(routeTester)
      .put("/overwrite")
      .set("Content-Type", "application/json")
      .send({ no: "@id" })
    assert.equal(response.statusCode, 400)

    response = await request(routeTester)
      .put("/overwrite")
      .set("Content-Type", "text/plain")
      .send("plain text")
    assert.equal(response.statusCode, 415)
  })
})

describe("Overwrite conflict and header contract behavior.  __rest __core", () => {
  it("Returns upstream 409 payload as JSON.", async () => {
    global.fetch = async () => ({
      ok: false,
      status: 409,
      json: async () => ({ message: "Version conflict", current: "v2" }),
      text: async () => "Version conflict"
    })

    const response = await request(routeTester)
      .put("/overwrite")
      .send({ "@id": rerumTinyTestObjId, testing: "item" })
      .set("Content-Type", "application/json")

    assert.equal(response.statusCode, 409)
    assert.equal(response.body.message, "Version conflict")
  })
})

describe("Overwrite If-Overwritten-Version header behavior.  __mock_functions", () => {
  it("Passes through If-Overwritten-Version request header to upstream.", async () => {
    const response = await request(routeTester)
      .put("/overwrite")
      .send({ "@id": rerumTinyTestObjId, testing: "item" })
      .set("Content-Type", "application/json")
      .set("If-Overwritten-Version", "abc123")

    assert.equal(response.statusCode, 200)
    // Verify the header was passed through to upstream
    assert.equal(lastFetchOptions.headers["If-Overwritten-Version"], "abc123")
  })

  it("Extracts __rerum.isOverwritten from body as If-Overwritten-Version.", async () => {
    const response = await request(routeTester)
      .put("/overwrite")
      .send({ "@id": rerumTinyTestObjId, testing: "item", __rerum: { isOverwritten: "xyz789" } })
      .set("Content-Type", "application/json")

    assert.equal(response.statusCode, 200)
    // Verify the body value was extracted and sent as header
    assert.equal(lastFetchOptions.headers["If-Overwritten-Version"], "xyz789")
  })

  it("Body __rerum.isOverwritten takes precedence over request header.", async () => {
    const response = await request(routeTester)
      .put("/overwrite")
      .send({ "@id": rerumTinyTestObjId, testing: "item", __rerum: { isOverwritten: "body-version" } })
      .set("Content-Type", "application/json")
      .set("If-Overwritten-Version", "header-version")

    assert.equal(response.statusCode, 200)
    // Body value should override header value
    assert.equal(lastFetchOptions.headers["If-Overwritten-Version"], "body-version")
  })

  it("Header is sent when neither __rerum.isOverwritten nor request header is present.", async () => {
    const response = await request(routeTester)
      .put("/overwrite")
      .send({ "@id": rerumTinyTestObjId, testing: "item" })
      .set("Content-Type", "application/json")

    assert.equal(response.statusCode, 200)
    // Header should not be present or should be undefined
    assert.strictEqual(lastFetchOptions.headers["If-Overwritten-Version"], undefined)
  })
})

describe("Overwrite network failure behavior.  __rest __core", () => {
  it("Maps rejected fetch to 502.", async () => {
    global.fetch = async () => { throw new Error("socket hang up") }

    const response = await request(routeTester)
      .put("/overwrite")
      .set("Content-Type", "application/json")
      .send({ "@id": rerumTinyTestObjId, testing: "item" })
    assert.equal(response.statusCode, 502)
  })
})

describe("Check that the properly used overwrite endpoints function and interact with RERUM.  __e2e", () => {
  it("'/overwrite' route can overwrite an object in RERUM.", async () => {
    const response = await request(routeTester)
      .put("/overwrite")
      .send({ "@id": rerumTinyTestObjId, testing: "item" })
      .set("Content-Type", "application/json")

    assert.equal(response.statusCode, 200)
    assert.ok(response.header.location)
    assert.equal(response.header.location, rerumTinyTestObjId)
    assert.equal(response.body.testing, "item")
  })
})
