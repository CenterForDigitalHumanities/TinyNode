import "../helpers/env.js"
import assert from "node:assert/strict"
import { describe, it } from "node:test"
import request from "supertest"
import app from "../../app.js"

describe("Make sure TinyNode demo interface is present.  __core", () => {
  it("/index.html", async () => {
    const response = await request(app).get("/index.html")
    assert.equal(response.statusCode, 200)
    assert.match(response.header["content-type"], /html/)
  })
})
