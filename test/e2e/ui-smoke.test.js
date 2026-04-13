import "../helpers/env.js"
import assert from "node:assert/strict"
import { after, before, describe, it } from "node:test"
import http from "node:http"
import { chromium } from "playwright"
import app from "../../app.js"

let server
let baseUrl

before(async () => {
  server = http.createServer(app)
  await new Promise(resolve => {
    server.listen(0, "127.0.0.1", resolve)
  })
  const address = server.address()
  baseUrl = `http://127.0.0.1:${address.port}`
})

after(async () => {
  if (!server) return
  await new Promise(resolve => {
    server.close(() => resolve())
  })
})

describe("TinyNode browser smoke checks.  __e2e", () => {
  it("Loads index page and toggles forms from the button panel.  __e2e", async t => {
    let browser
    try {
      browser = await chromium.launch({ headless: true })
    }
    catch (error) {
      t.skip(`Chromium is not installed. Run 'npm run e2e:install'. ${error.message}`)
      return
    }

    try {
      const page = await browser.newPage()
      await page.goto(`${baseUrl}/index.html`, { waitUntil: "domcontentloaded" })
      await page.waitForSelector(".button-panel")

      const title = await page.title()
      assert.match(title, /Tiny Things by Rerum/i)

      const createIsVisibleByDefault = await page.locator("form#create:not([data-hidden])").count()
      assert.equal(createIsVisibleByDefault, 1)

      await page.click('.button-panel > button[data-lang-key="updateBtn"]')
      const updateVisible = await page.locator("form#rerumUpdate:not([data-hidden])").count()
      const createHidden = await page.locator('form#create[data-hidden="true"]').count()

      assert.equal(updateVisible, 1)
      assert.equal(createHidden, 1)
    }
    finally {
      await browser.close()
    }
  })
})
