import "../helpers/env.js"
import assert from "node:assert/strict"
import { afterEach, beforeEach, describe, it } from "node:test"
import express from "express"
import request from "supertest"
import createRoute from "../../routes/create.js"
import { messenger } from "../../error-messenger.js"

const routeTester = express()
routeTester.use(express.json())
routeTester.use(express.urlencoded({ extended: false }))
routeTester.use("/create", createRoute)
routeTester.use("/app/create", createRoute)
routeTester.use(messenger)

const rerumUri = `${process.env.RERUM_ID_PATTERN}_not_`
const originalFetch = global.fetch

beforeEach(() => {
  global.fetch = async () => ({
    json: async () => ({ "@id": rerumUri, test: "item", __rerum: { stuff: "here" } }),
    ok: true,
    text: async () => "Descriptive Error Here"
  })
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
