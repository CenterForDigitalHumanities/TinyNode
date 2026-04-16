import "../helpers/env.js"
import assert from "node:assert/strict"
import { describe, it } from "node:test"
import express from "express"
import request from "supertest"
import { verifyJsonContentType } from "../../rest.js"

const routeTester = express()
routeTester.post("/verify", verifyJsonContentType, (req, res) => {
  res.status(204).end()
})

describe("verifyJsonContentType edge behavior.  __core", () => {
  it("Returns 415 when Content-Type header is missing.", async () => {
    const response = await request(routeTester)
      .post("/verify")

    assert.equal(response.statusCode, 415)
    assert.match(response.text, /Use application\/json or application\/ld\+json/)
  })

  it("Returns 415 when multiple Content-Type values are provided.", async () => {
    const response = await request(routeTester)
      .post("/verify")
      .set("Content-Type", "application/json,text/plain")
      .send("{}")

    assert.equal(response.statusCode, 415)
    assert.match(response.text, /Multiple Content-Type values are not allowed/)
  })
})
