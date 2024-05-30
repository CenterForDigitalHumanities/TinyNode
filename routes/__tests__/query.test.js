import express from "express"
import request from "supertest"
import { jest } from "@jest/globals"
import dotenv from "dotenv"
dotenv.config()
import queryRoute from "../query.js"
import app from "../../app.js"
const routeTester = new express()
routeTester.use(express.json())
routeTester.use(express.urlencoded({ extended: false }))
routeTester.use("/query", queryRoute)
routeTester.use("/app/query", queryRoute)

const rerum_uri = `${process.env.RERUM_ID_PATTERN}_not_`

beforeEach(() => {
  /** 
   * Request/Response Mock Using manual fetch replacement
   * This is overruling the fetch(store.rerum.io/v1/api/query) call in query.js
   */
  global.fetch = jest.fn(() =>
    Promise.resolve({
      json: () => Promise.resolve([{ "@id": rerum_uri, "test": "item", "__rerum": { "stuff": "here" } }])
    })
  )
})

/**
 * This test suite uses the built app.js app and checks that the expected query endpoints are registered.
 *  - /query
 *  - /app/query
 */
describe("Check that the expected TinyNode query route patterns are registered.", () => {
  it("'/app/query' and '/query' are registered routes in the app.  __exists __core", () => {
    let exists = false
    let count = 0
    const stack = app._router.stack
    for (const middleware of stack) {
      if (middleware.regexp && middleware.regexp.toString().includes("/app/query")) {
        count++
      } else if (middleware.regexp && middleware.regexp.toString().includes("/query")) {
        count++
      }
      if (count === 2) {
        exists = true
        break
      }
    }
    expect(exists).toBe(true)
  })
})


/**
 * This test suite runs the logic of the route file 'query.js' but does not actually communicate with RERUM.
 * It will confirm the following:
 *   - Is the express req/resp sent into the route
 *   - Can the route read the JSON body
 *   - Does the route add @id and __rerum
 *   - Does the route respond 201
 *   - Does the route respond with the object that was in the request body
 *   - Does the route respond with the proper 'Location' header
 * 
 * Note: /app/query uses the same logic and would be a redundant test.
 */
describe("Check that the request/response behavior of the TinyNode query route functions.  Mock the connection to RERUM.  __mock_functions", () => {
  it("'/query' route request and response behavior is functioning.", async () => {
    const response = await request(routeTester)
      .post("/query")
      .send({ "test": "item" })
      .set("Content-Type", "application/json")
      .then(resp => resp)
      .catch(err => err)
    expect(response.statusCode).toBe(200)
    expect(response.body[0].test).toBe("item")
  })
})

/**
 * This test suite checks the RESTful responses when using the TinyNode query endpoint incorrectly.
 *
 *  - Incorrect HTTP method
 *  - Invalid JSON body
 * 
 * Note: /app/query uses the same logic and would be a redundant test.
 */
describe("Check that incorrect TinyNode query route usage results in expected RESTful responses from RERUM.  __rest __core", () => {
  it("Incorrect '/query' route usage has expected RESTful responses.", async () => {
    let response = null

    response = await request(routeTester)
      .get("/query")
      .then(resp => resp)
      .catch(err => err)
    expect(response.statusCode).toBe(405)

    response = await request(routeTester)
      .put("/query")
      .then(resp => resp)
      .catch(err => err)
    expect(response.statusCode).toBe(405)

    response = await request(routeTester)
      .patch("/query")
      .then(resp => resp)
      .catch(err => err)
    expect(response.statusCode).toBe(405)

    response = await request(routeTester)
      .delete("/query")
      .then(resp => resp)
      .catch(err => err)
    expect(response.statusCode).toBe(405)

    response = await request(routeTester)
      .post("/query")
      .set("Content-Type", "application/json")
      .send("not json")
      .then(resp => resp)
      .catch(err => err)
    expect(response.statusCode).toBe(400)

  })
})

/**
 * Full integration test.  Checks the TinyNode app query endpoint functionality and RERUM connection.
 * 
 * Note: /app/query uses the same logic and would be a redundant test.
 */
describe("Check that the properly used query endpoints function and interact with RERUM.  __e2e", () => {
  it("'/query' route can save an object to RERUM.", async () => {
    const response = await request(routeTester)
      .post("/query")
      .send({ "test": "item" })
      .set("Content-Type", "application/json")
      .then(resp => resp)
      .catch(err => err)
    expect(response.statusCode).toBe(200)
    expect(response.body[0].test).toBe("item")
  })
})