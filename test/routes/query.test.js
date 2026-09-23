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
  it("Maps upstream 401/403 to 502 while preserving RERUM's message.", async () => {
    global.fetch = async () => ({
      headers: new Headers(),
      ok: false,
      status: 401,
      text: async () => "Unauthorized: bad or expired access token"
    })

    let response = await request(routeTester)
      .post("/query")
      .set("Content-Type", "application/json")
      .set("Authorization", "******")
      .send({ test: "item" })

    assert.equal(response.statusCode, 502)
    assert.match(response.text, /^401:/)
    assert.match(response.text, /Unauthorized/)

    global.fetch = async () => ({
      headers: new Headers(),
      ok: false,
      status: 403,
      text: async () => "Forbidden"
    })

    response = await request(routeTester)
      .post("/query")
      .set("Content-Type", "application/json")
      .set("Authorization", "******")
      .send({ test: "item" })

    assert.equal(response.statusCode, 502)
    assert.match(response.text, /^403:/)
    assert.match(response.text, /Forbidden/)
  })
})
