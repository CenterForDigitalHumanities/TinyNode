import request from "supertest"
import { jest } from "@jest/globals"
import app from "../../app.js"


beforeEach(() => {

  updateExpiredToken = jest.fn(() => {
    return true
  })

  isTokenExpired = jest.fn((tok) => {
    return false
  })
})

afterEach(() => {
  /**
   * Food for thought: delete data generated by tests?  
   * Make a test.store available that uses the same annotationStoreTesting as RERUM tests?
   */
})

describe("Make sure TinyNode demo interface is present.  __core", () => {
  it("/index.html", async () => {
    const response = await request(app)
      .get("/index.html")
      .then(resp => resp)
      .catch(err => err)
    expect(response.statusCode).toBe(200)
    expect(response.header["content-type"]).toMatch(/html/)
  })
})

/**
 * This test suite uses the built app.js app and checks that the expected create endpoints are registered.
 *  - /create
 *  - /app/create
 */
describe("Check that the expected TinyNode create route patterns are registered.", () => {
  it("'/app/create' and '/create' are registered routes in the app.  __exists __core", () => {
    let exists = false
    let count = 0
    const stack = app._router.stack
    for (const middleware of stack) {
      if (middleware.regexp && middleware.regexp.toString().includes("/app/create")) {
        count++
      } else if (middleware.regexp && middleware.regexp.toString().includes("/create")) {
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
 * This test suite uses the built app.js app and checks that the expected update endpoints are registered.
 *  - /update
 *  - /app/update
 */
describe("Check that the expected TinyNode update route patterns are registered.", () => {
  it("'/app/update' and '/update' are registered routes in the app.  __exists __core", () => {
    let exists = false
    let count = 0
    const stack = app._router.stack
    for (const middleware of stack) {
      if (middleware.regexp && middleware.regexp.toString().includes("/app/update")) {
        count++
      } else if (middleware.regexp && middleware.regexp.toString().includes("/update")) {
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
 * This test suite uses the built app.js app and checks that the expected overwrite endpoints are registered.
 *  - /overwrite
 *  - /app/overwrite
 */
describe("Check that the expected TinyNode overwrite route patterns are registered.", () => {
  it("'/app/overwrite' and '/overwrite' are registered routes in the app.  __exists __core", () => {
    let exists = false
    let count = 0
    const stack = app._router.stack
    for (const middleware of stack) {
      if (middleware.regexp && middleware.regexp.toString().includes("/app/overwrite")) {
        count++
      } else if (middleware.regexp && middleware.regexp.toString().includes("/overwrite")) {
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
 * This test suite uses the built app.js app and checks that the expected delete endpoints are registered.
 *  - /delete
 *  - /app/delete
 */
describe("Combined unit tests for the '/delete' route.", () => {
  it("'/app/delete' and '/delete' are registered routes in the app.  __exists __core", () => {
    let exists = false
    let count = 0
    const stack = app._router.stack
    for (const middleware of stack) {
      if (middleware.regexp && middleware.regexp.toString().includes("/app/delete")) {
        count++
      } else if (middleware.regexp && middleware.regexp.toString().includes("/delete")) {
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
