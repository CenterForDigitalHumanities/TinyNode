import express from "express"
import request from "supertest"
import { messenger } from "../../error-messenger.js"

const app = express()

app.get("/json-error", (req, res, next) => {
  next({
    status: 422,
    headers: {
      get: () => "application/json"
    },
    json: async () => ({ message: "Invalid payload", field: "name" })
  })
})

app.use(messenger)

describe("Check shared error messenger behavior.  __rest __core", () => {
  it("Returns structured JSON error bodies when upstream responds with JSON.", async () => {
    const response = await request(app)
      .get("/json-error")
      .then(resp => resp)
      .catch(err => err)

    expect(response.statusCode).toBe(422)
    expect(response.body.message).toBe("Invalid payload")
    expect(response.body.field).toBe("name")
  })
})
