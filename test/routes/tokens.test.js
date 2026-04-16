import "../helpers/env.js"
import assert from "node:assert/strict"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, it } from "node:test"
import checkAccessToken from "../../tokens.js"

const originalAccessToken = process.env.ACCESS_TOKEN
const originalAccessTokenUrl = process.env.RERUM_ACCESS_TOKEN_URL
const originalRefreshToken = process.env.REFRESH_TOKEN
const originalFetch = global.fetch
const originalCwd = process.cwd()
const tempDirs = []

async function inTempCwd(run, envContent) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "tinynode-token-test-"))
  tempDirs.push(tempDir)
  if (envContent !== undefined) {
    await fs.writeFile(path.join(tempDir, ".env"), envContent)
  }
  process.chdir(tempDir)
  await run(tempDir)
}

afterEach(async () => {
  process.env.ACCESS_TOKEN = originalAccessToken
  process.env.RERUM_ACCESS_TOKEN_URL = originalAccessTokenUrl
  process.env.REFRESH_TOKEN = originalRefreshToken
  global.fetch = originalFetch
  process.chdir(originalCwd)

  while (tempDirs.length > 0) {
    const tempDir = tempDirs.pop()
    await fs.rm(tempDir, { recursive: true, force: true })
  }
})

function jwtWithExp(expSeconds) {
  const payload = Buffer.from(JSON.stringify({ exp: expSeconds })).toString("base64")
  return `header.${payload}.signature`
}

describe("checkAccessToken middleware behavior.  __core", () => {
  it("Calls next when ACCESS_TOKEN is missing.", async () => {
    delete process.env.ACCESS_TOKEN
    let called = 0

    await checkAccessToken({}, {}, err => {
      assert.equal(err, undefined)
      called += 1
    })

    assert.equal(called, 1)
  })

  it("Treats malformed token as non-expired and calls next.", async () => {
    process.env.ACCESS_TOKEN = "not-a-jwt"
    let called = 0

    await checkAccessToken({}, {}, err => {
      assert.equal(err, undefined)
      called += 1
    })

    assert.equal(called, 1)
  })

  it("Propagates refresh errors to next(err) when token is expired.", async () => {
    process.env.ACCESS_TOKEN = jwtWithExp(Math.floor(Date.now() / 1000) - 60)
    global.fetch = async () => {
      throw new Error("refresh failed")
    }

    let receivedError
    await checkAccessToken({}, {}, err => {
      receivedError = err
    })

    assert.ok(receivedError)
    assert.match(receivedError.message, /refresh failed/)
  })

  it("Refreshes an expired token and persists it to .env.", async () => {
    await inTempCwd(async tempDir => {
      process.env.ACCESS_TOKEN = jwtWithExp(Math.floor(Date.now() / 1000) - 60)
      process.env.RERUM_ACCESS_TOKEN_URL = "https://auth.example/token"
      process.env.REFRESH_TOKEN = "refresh-token"

      global.fetch = async (url, options) => {
        assert.equal(url, "https://auth.example/token")
        assert.equal(options.method, "POST")
        return {
          json: async () => ({ access_token: "new-access-token" })
        }
      }

      let nextError
      await checkAccessToken({}, {}, err => {
        nextError = err
      })

      assert.equal(nextError, undefined)
      assert.equal(process.env.ACCESS_TOKEN, "new-access-token")
      const envText = await fs.readFile(path.join(tempDir, ".env"), "utf8")
      assert.match(envText, /ACCESS_TOKEN=new-access-token/)
    }, "ACCESS_TOKEN=old-token\n")
  })

  it("Continues when refresh succeeds but .env read fails.", async () => {
    await inTempCwd(async () => {
      process.env.ACCESS_TOKEN = jwtWithExp(Math.floor(Date.now() / 1000) - 60)
      process.env.RERUM_ACCESS_TOKEN_URL = "https://auth.example/token"
      process.env.REFRESH_TOKEN = "refresh-token"

      global.fetch = async () => ({
        json: async () => ({ access_token: "new-access-token-2" })
      })

      let nextError
      await checkAccessToken({}, {}, err => {
        nextError = err
      })

      assert.equal(nextError, undefined)
      assert.equal(process.env.ACCESS_TOKEN, "new-access-token-2")
    })
  })
})
