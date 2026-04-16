import "../helpers/env.js"
import assert from "node:assert/strict"
import { describe, it } from "node:test"
import express from "express"
import request from "supertest"
import app from "../../app.js"
import indexRoute from "../../routes/index.js"

const routeTester = express()
routeTester.use("/", indexRoute)

describe("Make sure TinyNode demo interface is present.  __core", () => {
  it("/index.html", async () => {
    const response = await request(app).get("/index.html")
    assert.equal(response.statusCode, 200)
    assert.match(response.header["content-type"], /html/)
  })

  it("Index router returns 405 for unsupported root methods.", async () => {
    let response = await request(routeTester).get("/")
    assert.equal(response.statusCode, 405)

    response = await request(routeTester).post("/")
    assert.equal(response.statusCode, 405)
  })
})
