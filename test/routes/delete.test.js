import "../helpers/env.js"
import assert from "node:assert/strict"
import { afterEach, beforeEach, describe, it } from "node:test"
import express from "express"
import request from "supertest"
import deleteRoute from "../../routes/delete.js"

const routeTester = express()
routeTester.use(express.json())
routeTester.use(express.urlencoded({ extended: false }))
routeTester.use("/delete", deleteRoute)
routeTester.use("/app/delete", deleteRoute)

const rerumUri = `${process.env.RERUM_ID_PATTERN}_not_`
const originalFetch = global.fetch

beforeEach(() => {
  global.fetch = async () => ({
    text: async () => "",
    ok: true
  })
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

    response = await request(routeTester)
      .delete("/delete/00000")

    assert.equal(response.statusCode, 204)
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
})
