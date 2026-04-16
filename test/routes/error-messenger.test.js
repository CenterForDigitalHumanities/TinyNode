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
  it("Returns early when headers are already sent.", async () => {
    const app = express()
    app.get("/test", (req, res, next) => {
      res.end("partial")
      next(new Error("late error"))
    })
    app.use(messenger)

    const response = await request(app).get("/test")
    assert.equal(response.statusCode, 200)
    assert.match(response.text, /partial/)
  })

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

  it("Uses statusCode and statusMessage fallback fields when present.", async () => {
    const app = appWith((req, res, next) => {
      next({
        statusCode: 499,
        statusMessage: "Client closed request",
        headers: { get: () => "text/plain" },
        text: async () => ""
      })
    })

    const response = await request(app).get("/test")
    assert.equal(response.statusCode, 499)
    assert.match(response.text, /Client closed request/)
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

  it("Sends plain text body from upstream text() when provided.", async () => {
    const app = appWith((req, res, next) => {
      next({
        status: 418,
        headers: { get: () => "text/plain" },
        text: async () => "Teapot exploded"
      })
    })

    const response = await request(app).get("/test")
    assert.equal(response.statusCode, 418)
    assert.match(response.text, /Teapot exploded/)
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

function createMockRes(headersSent = false) {
  const res = {
    headersSent,
    statusCode: null,
    sentText: null,
    sentJson: null,
    setHeaders: {},
    status(code) {
      this.statusCode = code
      return this
    },
    json(payload) {
      this.sentJson = payload
      return this
    },
    send(text) {
      this.sentText = text
      return this
    },
    set(name, value) {
      this.setHeaders[name] = value
      return this
    }
  }
  return res
}

describe("Check shared error messenger unit branches.  __core", () => {
  it("Returns immediately when headersSent is true.", async () => {
    const res = createMockRes(true)
    await messenger(new Error("ignored"), {}, res, () => {})
    assert.equal(res.statusCode, null)
    assert.equal(res.sentText, null)
    assert.equal(res.sentJson, null)
  })

  it("Sends payload JSON when payload is present.", async () => {
    const res = createMockRes(false)
    await messenger({ status: 409, payload: { code: "CONFLICT" } }, {}, res, () => {})
    assert.equal(res.statusCode, 409)
    assert.equal(res.sentJson.code, "CONFLICT")
  })

  it("Uses upstream JSON response when content-type is JSON.", async () => {
    const res = createMockRes(false)
    await messenger(
      {
        status: 422,
        headers: { get: () => "application/json; charset=utf-8" },
        json: async () => ({ detail: "bad request" })
      },
      {},
      res,
      () => {}
    )
    assert.equal(res.statusCode, 422)
    assert.equal(res.sentJson.detail, "bad request")
  })

  it("Sends plain text and sets content-type for non-JSON upstream errors.", async () => {
    const res = createMockRes(false)
    await messenger(
      {
        status: 503,
        message: "fallback",
        headers: { get: () => "text/plain" },
        text: async () => "upstream text"
      },
      {},
      res,
      () => {}
    )
    assert.equal(res.statusCode, 503)
    assert.equal(res.sentText, "upstream text")
    assert.equal(res.setHeaders["Content-Type"], "text/plain; charset=utf-8")
  })
})
