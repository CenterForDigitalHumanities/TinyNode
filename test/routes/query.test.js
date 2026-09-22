import "../helpers/env.js"
import assert from "node:assert/strict"
import { afterEach, beforeEach, describe, it } from "node:test"
import express from "express"
import request from "supertest"
import queryRoute from "../../routes/query.js"
import { messenger } from "../../error-messenger.js"

const routeTester = express()
routeTester.use(express.json({ type: ['application/json', 'application/ld+json'] }))
routeTester.use(express.urlencoded({ extended: false }))
routeTester.use("/query", queryRoute)
routeTester.use("/app/query", queryRoute)
routeTester.use(messenger)

const rerumUri = `${process.env.RERUM_ID_PATTERN}_not_`
const originalFetch = global.fetch
const paginationHeaders = ["pagination-limit", "pagination-skip", "pagination-limit-max", "pagination-skip-max"]
let lastFetchUrl, lastFetchOptions

beforeEach(() => {
  lastFetchUrl = null
  lastFetchOptions = null
  global.fetch = async (url, opts) => {
    lastFetchUrl = url
    lastFetchOptions = opts
    return {
      headers: new Headers(),
      json: async () => ([{ "@id": rerumUri, test: "item", __rerum: { stuff: "here" } }]),
      ok: true,
      text: async () => "Descriptive Error Here"
    }
  }
})

afterEach(() => {
  global.fetch = originalFetch
})

describe("Check that the request/response behavior of the TinyNode query route functions.  Mock the connection to RERUM.  __mock_functions", () => {
  it("'/query' route request and response behavior is functioning.", async () => {
    const response = await request(routeTester)
      .post("/query")
      .send({ test: "item" })
      .set("Content-Type", "application/json")

    assert.equal(response.statusCode, 200)
    assert.equal(response.body[0].test, "item")
    
    // Verify upstream contract
    assert.match(lastFetchUrl, /\/query\?limit=10&skip=0$/, "URL should be /query with default limit and skip")
    assert.equal(lastFetchOptions.method, "POST", "Method should be POST")
    assert.match(lastFetchOptions.headers["Authorization"], /^Bearer /, "Authorization header missing or invalid")
    assert.equal(lastFetchOptions.headers["Content-Type"], "application/json;charset=utf-8", "Content-Type header mismatch")
  })

  it("Accepts application/ld+json content type.", async () => {
    const response = await request(routeTester)
      .post("/query")
      .send({ test: "item" })
      .set("Content-Type", "application/ld+json")

    assert.equal(response.statusCode, 200)
    assert.equal(response.body[0].test, "item")
  })

  it("Sends the caller's Authorization header upstream verbatim.", async () => {
    const response = await request(routeTester)
      .post("/query")
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer caller-m2m-token")
      .send({ test: "item" })

    assert.equal(response.statusCode, 200)
    assert.equal(lastFetchOptions.headers["Authorization"], "Bearer caller-m2m-token")
  })

  it("Passes an upstream 401 through with the real status code.", async () => {
    global.fetch = async () => ({
      headers: new Headers(),
      ok: false,
      status: 401,
      text: async () => "Unauthorized: bad or expired access token"
    })

    const response = await request(routeTester)
      .post("/query")
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer caller-m2m-token")
      .send({ test: "item" })

    assert.equal(response.statusCode, 401)
    assert.match(response.text, /Unauthorized/)
  })
})

describe("Check that incorrect TinyNode query route usage results in expected RESTful responses from RERUM.  __rest __core", () => {
  it("Incorrect '/query' route usage has expected RESTful responses.", async () => {
    let response = await request(routeTester).get("/query")
    assert.equal(response.statusCode, 405)

    response = await request(routeTester).put("/query")
    assert.equal(response.statusCode, 405)

    response = await request(routeTester).patch("/query")
    assert.equal(response.statusCode, 405)

    response = await request(routeTester).delete("/query")
    assert.equal(response.statusCode, 405)

    response = await request(routeTester)
      .post("/query")
      .set("Content-Type", "application/json")
      .send("not json")
    assert.equal(response.statusCode, 400)

    response = await request(routeTester)
      .post("/query")
      .set("Content-Type", "application/json")
      .send({})
    assert.equal(response.statusCode, 400)

    response = await request(routeTester)
      .post("/query")
      .set("Content-Type", "application/json")
      .send([])
    assert.equal(response.statusCode, 400)

    response = await request(routeTester)
      .post("/query?limit=-1")
      .set("Content-Type", "application/json")
      .send({ test: "item" })
    assert.equal(response.statusCode, 400)

    response = await request(routeTester)
      .post("/query?skip=abc")
      .set("Content-Type", "application/json")
      .send({ test: "item" })
    assert.equal(response.statusCode, 400)

    response = await request(routeTester)
      .post("/query")
      .set("Content-Type", "text/plain")
      .send("plain text")
    assert.equal(response.statusCode, 415)
  })
})

describe("Query upstream and network failure behavior.  __rest __core", () => {
  it("Preserves upstream text error message when query returns non-ok.", async () => {
    global.fetch = async () => ({
      headers: new Headers(),
      ok: false,
      status: 503,
      text: async () => "Upstream query failure"
    })

    const response = await request(routeTester)
      .post("/query")
      .set("Content-Type", "application/json")
      .send({ test: "item" })

    assert.equal(response.statusCode, 502)
    assert.match(response.text, /Upstream query failure/)
  })

  it("Falls back to generic RERUM error text when upstream .text() throws.", async () => {
    global.fetch = async () => ({
      headers: new Headers(),
      ok: false,
      status: 500,
      text: async () => {
        throw new Error("text stream consumed")
      }
    })

    const response = await request(routeTester)
      .post("/query")
      .set("Content-Type", "application/json")
      .send({ test: "item" })

    assert.equal(response.statusCode, 502)
    assert.match(response.text, /A RERUM error occurred/)
  })

  it("Maps rejected fetch to 502.", async () => {
    global.fetch = async () => {
      throw new Error("socket hang up")
    }

    const response = await request(routeTester)
      .post("/query")
      .set("Content-Type", "application/json")
      .send({ test: "item" })

    assert.equal(response.statusCode, 502)
    assert.match(response.text, /A RERUM error occurred/)
    for (const header of paginationHeaders) {
      assert.equal(response.headers[header], undefined, `${header} should not be set when RERUM was not reached`)
    }
  })
})

describe("Query pagination header forwarding.  __rest __core", () => {
  it("Forwards every Pagination-* header RERUM returns on a successful query.", async () => {
    global.fetch = async () => ({
      headers: new Headers({
        "Pagination-Limit": "500",
        "Pagination-Skip": "0",
        "Pagination-Limit-Max": "500",
        "Pagination-Skip-Max": "100000"
      }),
      json: async () => ([{ "@id": rerumUri, test: "item" }]),
      ok: true
    })

    const response = await request(routeTester)
      .post("/query?limit=1000")
      .set("Content-Type", "application/json")
      .send({ test: "item" })

    assert.equal(response.statusCode, 200)
    assert.equal(response.body[0].test, "item")
    assert.equal(response.headers["pagination-limit"], "500")
    assert.equal(response.headers["pagination-skip"], "0")
    assert.equal(response.headers["pagination-limit-max"], "500")
    assert.equal(response.headers["pagination-skip-max"], "100000")
  })

  it("Forwards the Pagination-* headers RERUM returns on an error response.", async () => {
    global.fetch = async () => ({
      headers: new Headers({
        "Pagination-Limit-Max": "500",
        "Pagination-Skip-Max": "100000"
      }),
      ok: false,
      status: 400,
      text: async () => "The 'skip' URL parameter of 100001 is beyond the maximum of 100000."
    })

    const response = await request(routeTester)
      .post("/query?skip=100001")
      .set("Content-Type", "application/json")
      .send({ test: "item" })

    assert.equal(response.statusCode, 502)
    assert.match(response.text, /beyond the maximum of 100000/)
    assert.equal(response.headers["pagination-limit-max"], "500")
    assert.equal(response.headers["pagination-skip-max"], "100000")
    assert.equal(response.headers["pagination-limit"], undefined)
    assert.equal(response.headers["pagination-skip"], undefined)
  })
})

describe("Check that the properly used query endpoints function and interact with RERUM.  __e2e", () => {
  it("'/query' route can save an object to RERUM.", async () => {
    const response = await request(routeTester)
      .post("/query")
      .send({ test: "item" })
      .set("Content-Type", "application/json")

    assert.equal(response.statusCode, 200)
    assert.equal(response.body[0].test, "item")
  })
})
