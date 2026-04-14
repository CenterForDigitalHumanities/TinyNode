import "../helpers/env.js"
import assert from "node:assert/strict"
import { afterEach, beforeEach, describe, it } from "node:test"
import express from "express"
import request from "supertest"
import queryRoute from "../../routes/query.js"
import { messenger } from "../../error-messenger.js"

const routeTester = express()
routeTester.use(express.json())
routeTester.use(express.urlencoded({ extended: false }))
routeTester.use("/query", queryRoute)
routeTester.use("/app/query", queryRoute)
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
