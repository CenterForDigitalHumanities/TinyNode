import "../helpers/env.js"
import assert from "node:assert/strict"
import { afterEach, beforeEach, describe, it } from "node:test"
import express from "express"
import request from "supertest"
import overwriteRoute from "../../routes/overwrite.js"

const routeTester = express()
routeTester.use(express.json())
routeTester.use(express.urlencoded({ extended: false }))
routeTester.use("/overwrite", overwriteRoute)
routeTester.use("/app/overwrite", overwriteRoute)

const rerumTinyTestObjId = `${process.env.RERUM_ID_PATTERN}tiny_tester`
const originalFetch = global.fetch

beforeEach(() => {
  global.fetch = async () => ({
    json: async () => ({ "@id": rerumTinyTestObjId, testing: "item", __rerum: { stuff: "here" } }),
    ok: true,
    text: async () => "Descriptive Error Here"
  })
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
