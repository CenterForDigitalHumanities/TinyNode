import "../helpers/env.js"
import assert from "node:assert/strict"
import { afterEach, beforeEach, describe, it } from "node:test"
import express from "express"
import request from "supertest"
import deleteRoute from "../../routes/delete.js"
import { messenger } from "../../error-messenger.js"

const routeTester = express()
routeTester.use(express.json({ type: ['application/json', 'application/ld+json'] }))
routeTester.use(express.urlencoded({ extended: false }))
routeTester.use("/delete", deleteRoute)
routeTester.use("/app/delete", deleteRoute)
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
      text: async () => "",
      ok: true
    }
  }
})

afterEach(() => {
  global.fetch = originalFetch
})

describe("Check that the request/response behavior of the TinyNode delete route functions.  Mock the connection to RERUM.  __mock_functions", () => {
  it("'/delete' route request and response behavior is functioning.", async () => {
    let response = await request(routeTester)
      .delete("/delete")
      .send({ "@id": rerumUri, test: "item" })
      .set("Content-Type", "application/json")

    assert.equal(response.statusCode, 204)
    
    // Verify upstream contract for body-based delete
    assert.match(lastFetchUrl, /\/delete$/, "URL should end with /delete")
    assert.equal(lastFetchOptions.method, "DELETE", "Method should be DELETE")
    assert.match(lastFetchOptions.headers["Authorization"], /^Bearer /, "Authorization header missing or invalid")
    assert.equal(lastFetchOptions.headers["Content-Type"], "application/json; charset=utf-8", "Content-Type header mismatch")

    response = await request(routeTester)
      .delete("/delete/00000")

    assert.equal(response.statusCode, 204)
    
    // Verify upstream contract for path-based delete
    assert.match(lastFetchUrl, /\/delete\/00000$/, "URL should end with /delete/00000")
    assert.equal(lastFetchOptions.method, "DELETE", "Method should be DELETE")
  })
})

describe("Check that incorrect TinyNode delete route usage results in expected RESTful responses from RERUM.  __rest __core", () => {
  it("Incorrect '/delete' route usage has expected RESTful responses.", async () => {
    let response = await request(routeTester).get("/delete")
    assert.equal(response.statusCode, 405)

    response = await request(routeTester).put("/delete")
    assert.equal(response.statusCode, 405)

    response = await request(routeTester).patch("/delete")
    assert.equal(response.statusCode, 405)

    response = await request(routeTester).post("/delete")
    assert.equal(response.statusCode, 405)

    response = await request(routeTester)
      .delete("/delete")
      .set("Content-Type", "application/json")
      .send({})
    assert.equal(response.statusCode, 400)

    response = await request(routeTester)
      .delete("/delete")
      .set("Content-Type", "text/plain")
      .send("plain text")
    assert.equal(response.statusCode, 415)
  })
})

describe("Delete network failure and passthrough behavior.  __rest __core", () => {
  it("Maps rejected fetch to 502 for body and path delete forms.", async () => {
    global.fetch = async () => {
      throw new Error("socket hang up")
    }

    let response = await request(routeTester)
      .delete("/delete")
      .set("Content-Type", "application/json")
      .send({ "@id": rerumUri })
    assert.equal(response.statusCode, 502)

    response = await request(routeTester)
      .delete("/delete/00000")
    assert.equal(response.statusCode, 502)
  })

  it("Preserves upstream text error message for body delete when response is non-ok.", async () => {
    global.fetch = async () => ({
      ok: false,
      status: 503,
      text: async () => "Upstream body delete failure"
    })

    const response = await request(routeTester)
      .delete("/delete")
      .set("Content-Type", "application/json")
      .send({ "@id": rerumUri })

    assert.equal(response.statusCode, 502)
    assert.match(response.text, /Upstream body delete failure/)
  })

  it("Falls back to generic RERUM error text for body delete when upstream .text() throws.", async () => {
    global.fetch = async () => ({
      ok: false,
      status: 500,
      text: async () => {
        throw new Error("text stream consumed")
      }
    })

    const response = await request(routeTester)
      .delete("/delete")
      .set("Content-Type", "application/json")
      .send({ "@id": rerumUri })

    assert.equal(response.statusCode, 502)
    assert.match(response.text, /A RERUM error occurred/)
  })

  it("Preserves upstream text error message for path delete when response is non-ok.", async () => {
    global.fetch = async () => ({
      ok: false,
      status: 503,
      text: async () => "Upstream path delete failure"
    })

    const response = await request(routeTester)
      .delete("/delete/00000")

    assert.equal(response.statusCode, 502)
    assert.match(response.text, /Upstream path delete failure/)
  })

  it("Falls back to generic RERUM error text for path delete when upstream .text() throws.", async () => {
    global.fetch = async () => ({
      ok: false,
      status: 500,
      text: async () => {
        throw new Error("text stream consumed")
      }
    })

    const response = await request(routeTester)
      .delete("/delete/00000")

    assert.equal(response.statusCode, 502)
    assert.match(response.text, /A RERUM error occurred/)
  })
})
