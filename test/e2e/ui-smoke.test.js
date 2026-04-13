import "../helpers/env.js"
import assert from "node:assert/strict"
import { after, before, describe, it } from "node:test"
import http from "node:http"
import { chromium } from "playwright"
import app from "../../app.js"

let server
let baseUrl

async function launchBrowserOrSkip(t) {
  try {
    return await chromium.launch({ headless: true })
  }
  catch (error) {
    t.skip(`Chromium is not installed. Run 'npm run e2e:install'. ${error.message}`)
    return null
  }
}

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
    const browser = await launchBrowserOrSkip(t)
    if (!browser) return

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

  it("Submits create form and renders success message and object payload.  __e2e", async t => {
    const browser = await launchBrowserOrSkip(t)
    if (!browser) return

    try {
      const page = await browser.newPage()
      await page.route("**/create", async route => {
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            "@id": "https://devstore.rerum.io/v1/id/e2e-created",
            test: "created"
          })
        })
      })

      await page.goto(`${baseUrl}/index.html`, { waitUntil: "domcontentloaded" })
      await page.fill("#createJSON", JSON.stringify({ test: "created" }))
      await page.click('form#create button[type="submit"]')

      await page.waitForSelector('#flash-message:not([style*="display: none"])')
      const message = await page.locator("#flash-message").textContent()
      const objectView = await page.locator("#obj-viewer").textContent()

      assert.match(message ?? "", /Created new object at/i)
      assert.match(objectView ?? "", /e2e-created/)
      assert.match(objectView ?? "", /"test":\s*"created"/)
    }
    finally {
      await browser.close()
    }
  })

  it("Blocks invalid create JSON in the client before issuing network calls.  __e2e", async t => {
    const browser = await launchBrowserOrSkip(t)
    if (!browser) return

    try {
      const page = await browser.newPage()
      let createRequests = 0
      await page.route("**/create", async route => {
        createRequests += 1
        await route.fulfill({ status: 500, body: "should not be called" })
      })

      await page.goto(`${baseUrl}/index.html`, { waitUntil: "domcontentloaded" })
      await page.fill("#createJSON", "{not valid json}")
      await page.click('form#create button[type="submit"]')

      await page.waitForSelector('#flash-message:not([style*="display: none"])')
      const message = await page.locator("#flash-message").textContent()
      assert.match(message ?? "", /You did not provide valid JSON/i)
      assert.equal(createRequests, 0)
    }
    finally {
      await browser.close()
    }
  })

  it("Submits query form and renders returned results.  __e2e", async t => {
    const browser = await launchBrowserOrSkip(t)
    if (!browser) return

    try {
      const page = await browser.newPage()
      await page.route("**/query", async route => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([
            { "@id": "https://devstore.rerum.io/v1/id/query-hit", label: "found" }
          ])
        })
      })

      await page.goto(`${baseUrl}/index.html`, { waitUntil: "domcontentloaded" })
      await page.click('.button-panel > button[data-lang-key="queryBtn"]')
      await page.fill("#queryKey", "label")
      await page.fill("#queryValue", "found")
      await page.click('form#query button[type="submit"]')

      await page.waitForSelector('#flash-message:not([style*="display: none"])')
      const message = await page.locator("#flash-message").textContent()
      const objectView = await page.locator("#obj-viewer").textContent()

      assert.match(message ?? "", /matching results/i)
      assert.match(objectView ?? "", /query-hit/)
      assert.match(objectView ?? "", /"label":\s*"found"/)
    }
    finally {
      await browser.close()
    }
  })

  it("Shows a conflict error when overwrite returns 409.  __e2e", async t => {
    const browser = await launchBrowserOrSkip(t)
    if (!browser) return

    try {
      const page = await browser.newPage()
      await page.route("**/overwrite", async route => {
        await route.fulfill({
          status: 409,
          statusText: "Conflict",
          contentType: "application/json",
          body: JSON.stringify({ message: "Version conflict", currentVersion: { "@id": "v2" } })
        })
      })

      await page.goto(`${baseUrl}/index.html`, { waitUntil: "domcontentloaded" })
      await page.click('.button-panel > button[data-lang-key="overwriteBtn"]')
      await page.fill("#overwriteId", "https://devstore.rerum.io/v1/id/overwrite-target")
      await page.fill("#overwriteJSON", JSON.stringify({ testing: "overwrite" }))
      await page.click('form#overwrite button[type="submit"]')

      await page.waitForSelector('#flash-message:not([style*="display: none"])')
      const message = await page.locator("#flash-message").textContent()
      assert.match(message ?? "", /Conflict detected while trying to overwrite object/i)
      assert.match(message ?? "", /409/i)
    }
    finally {
      await browser.close()
    }
  })
})
