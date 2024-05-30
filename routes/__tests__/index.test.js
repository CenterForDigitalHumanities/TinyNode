import request from "supertest"
import app from "../../app.js"

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