
import { jest } from "@jest/globals"
process.env.RERUM_ID_PATTERN = "https://devstore.rerum.io/v1/id/"
import express from "express"
import request from "supertest"
import overwriteRoute from "../overwrite.js"
//import app from "../../app.js"

const routeTester = new express()
routeTester.use(express.json())
routeTester.use(express.urlencoded({ extended: false }))
routeTester.use("/overwrite", overwriteRoute)
routeTester.use("/app/overwrite", overwriteRoute)

const rerum_tiny_test_obj_id = `${process.env.RERUM_ID_PATTERN}tiny_tester`

beforeEach(() => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      status: 200,
      ok: true,
      json: () => Promise.resolve({ "@id": rerum_tiny_test_obj_id, "testing": "item", "__rerum": { "stuff": "here" } })
    })
  )
})

afterEach(() => {

})

/**
 * This test suite runs the logic of the route file 'overwrite.js' but does not actually communicate with RERUM.
 * It will confirm the following:
 *   - Is the express req/resp sent into the route
 *   - Can the route read the JSON body
 *   - Does the route add @id and __rerum
 *   - Does the route respond 200
 *   - Does the route respond with the object that was in the request body
 *   - Does the route respond with the proper 'Location' header
 * 
 * Note: /app/overwrite uses the same logic and would be a redundant test.
 */
describe("Check that the request/response behavior of the TinyNode overwrite route functions.  Mock the connection to RERUM.  __mock_functions", () => {
  it("'/overwrite' route request and response behavior is functioning.", async () => {
    const response = await request(routeTester)
      .put("/overwrite")
      .send({ "@id": rerum_tiny_test_obj_id, "testing": "item" })
      .set("Content-Type", "application/json")
      .then(resp => resp)
      .catch(err => err)
    if (response.header.location !== rerum_tiny_test_obj_id) {
      throw new Error(`Expected Location header to be '${rerum_tiny_test_obj_id}', but got '${response.header.location}'.\nAll headers: ${JSON.stringify(response.header)}\nResponse body: ${JSON.stringify(response.body)}`)
    }
    expect(response.statusCode).toBe(200)
    expect(response.body.testing).toBe("item")
  })
})

/**
 * This test suite checks the RESTful responses when using the TinyNode overwrite endpoint incorrectly.
 *
 *  - Incorrect HTTP method
 *  - Invalid JSON body
 * 
 * Note: /app/overwrite uses the same logic and would be a redundant test.
 */
describe("Check that incorrect TinyNode overwrite route usage results in expected RESTful responses from RERUM.  __rest __core", () => {
  it("Incorrect '/overwrite' route usage has expected RESTful responses.", async () => {
    let response = null

    response = await request(routeTester)
      .get("/overwrite")
      .then(resp => resp)
      .catch(err => err)
    expect(response.statusCode).toBe(405)

    response = await request(routeTester)
      .post("/overwrite")
      .then(resp => resp)
      .catch(err => err)
    expect(response.statusCode).toBe(405)

    response = await request(routeTester)
      .patch("/overwrite")
      .then(resp => resp)
      .catch(err => err)
    expect(response.statusCode).toBe(405)

    response = await request(routeTester)
      .delete("/overwrite")
      .then(resp => resp)
      .catch(err => err)
    expect(response.statusCode).toBe(405)

    //Bad request body
    response = await request(routeTester)
      .put("/overwrite")
      .set("Content-Type", "application/json")
      .send("not json")
      .then(resp => resp)
      .catch(err => err)
    expect(response.statusCode).toBe(400)

    response = await request(routeTester)
      .put("/overwrite")
      .set("Content-Type", "application/json")
      .send({ "no": "@id" })
      .then(resp => resp)
      .catch(err => err)
    expect(response.statusCode).toBe(400)

  })
})

/**
 * Full integration test.  Checks the TinyNode app overwrite endpoint functionality and RERUM connection.
 * 
 * Note: /app/update uses the same logic.
 */
describe("Check that the properly used overwrite endpoints function and interact with RERUM.  __e2e", () => {
  it("'/overwrite' route can overwrite an object in RERUM.", async () => {
    const response = await request(routeTester)
      .put("/overwrite")
      .send({ "@id": rerum_tiny_test_obj_id, "testing": "item" })
      .set("Content-Type", "application/json")
      .then(resp => resp)
      .catch(err => err)
    expect(response.header).toHaveProperty("location")
    expect(response.header.location).toBe(rerum_tiny_test_obj_id)
    expect(response.statusCode).toBe(200)
    expect(response.body.testing).toBe("item")
  })
})
