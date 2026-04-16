import "../helpers/env.js"
import assert from "node:assert/strict"
import { describe, it } from "node:test"
import express from "express"
import request from "supertest"
import { messenger } from "../../error-messenger.js"

function appWith(routeHandler) {
  const app = express()
  app.get("/test", routeHandler)
  app.use(messenger)
  return app
}

describe("Check shared error messenger behavior.  __rest __core", () => {
  it("Returns structured JSON error bodies when upstream responds with JSON.", async () => {
    const app = appWith((req, res, next) => {
      next({
        status: 422,
        headers: { get: () => "application/json" },
        json: async () => ({ message: "Invalid payload", field: "name" })
      })
    })

    const response = await request(app).get("/test")
    assert.equal(response.statusCode, 422)
    assert.equal(response.body.message, "Invalid payload")
    assert.equal(response.body.field, "name")
  })

  it("Falls back to 500 for plain Error objects.", async () => {
    const app = appWith((req, res, next) => {
      next(new Error("boom"))
    })

    const response = await request(app).get("/test")
    assert.equal(response.statusCode, 500)
    assert.match(response.text, /boom/)
  })

  it("Uses fallback message if .text() throws.", async () => {
    const app = appWith((req, res, next) => {
      next({
        status: 502,
        message: "Upstream unavailable",
        headers: { get: () => "text/plain" },
        text: async () => {
          throw new Error("consumed")
        }
      })
    })

    const response = await request(app).get("/test")
    assert.equal(response.statusCode, 502)
    assert.match(response.text, /Upstream unavailable/)
  })

  it("Returns structured payload when error carries payload.", async () => {
    const app = appWith((req, res, next) => {
      next({
        status: 400,
        payload: { code: "BAD_INPUT", detail: "Missing @id" }
      })
    })

    const response = await request(app).get("/test")
    assert.equal(response.statusCode, 400)
    assert.equal(response.body.code, "BAD_INPUT")
  })
})
