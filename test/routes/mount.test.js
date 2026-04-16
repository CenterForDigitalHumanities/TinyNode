import "../helpers/env.js"
import assert from "node:assert/strict"
import { afterEach, beforeEach, describe, it } from "node:test"
import fs from "node:fs"
import request from "supertest"
import app from "../../app.js"

const originalFetch = global.fetch

beforeEach(() => {
  global.fetch = async () => ({
    ok: false,
    status: 401,
    text: async () => "Unauthorized",
    headers: { get: () => "text/plain" }
  })
})

afterEach(() => {
  global.fetch = originalFetch
})

async function routeExists(routes, method = "post") {
  const responses = await Promise.all(
    routes.map(route => request(app)[method](route).set("Content-Type", "application/json").send({}))
  )
  return responses.every(response => response.statusCode !== 404)
}

describe("Check that the expected TinyNode create route patterns are registered.", () => {
  it("'/app/create' and '/create' are registered routes in the app.  __exists __core", async () => {
    assert.equal(await routeExists(["/create", "/app/create"]), true)
  })
})

describe("Check that the expected TinyNode query route patterns are registered.", () => {
  it("'/app/query' and '/query' are registered routes in the app.  __exists __core", async () => {
    assert.equal(await routeExists(["/query", "/app/query"]), true)
  })
})

describe("Check that the expected TinyNode update route patterns are registered.", () => {
  it("'/app/update' and '/update' are registered routes in the app.  __exists __core", async () => {
    assert.equal(await routeExists(["/update", "/app/update"], "put"), true)
  })
})

describe("Check that the expected TinyNode overwrite route patterns are registered.", () => {
  it("'/app/overwrite' and '/overwrite' are registered routes in the app.  __exists __core", async () => {
    assert.equal(await routeExists(["/overwrite", "/app/overwrite"], "put"), true)
  })
})

describe("Combined unit tests for the '/delete' route.", () => {
  it("'/app/delete' and '/delete' are registered routes in the app.  __exists __core", async () => {
    assert.equal(await routeExists(["/delete", "/app/delete"], "delete"), true)
  })
})

describe("Check to see that critical repo files are present", () => {
  it("root folder files", () => {
    const filePath = "./"
    assert.equal(fs.existsSync(`${filePath}CODEOWNERS`), true)
    assert.equal(fs.existsSync(`${filePath}CONTRIBUTING.md`), true)
    assert.equal(fs.existsSync(`${filePath}README.md`), true)
    assert.equal(fs.existsSync(`${filePath}.gitignore`), true)
    assert.equal(fs.existsSync(`${filePath}package.json`), true)
  })
})
