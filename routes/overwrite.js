import express from "express"
import checkAccessToken from "../tokens.js"
import { verifyJsonContentType } from "../rest.js"
import { createRerumNetworkError, fetchRerum } from "../rerum.js"
const router = express.Router()

/* PUT an overwrite to the thing. */
router.put('/', verifyJsonContentType, checkAccessToken, async (req, res, next) => {

  try {
    
    const overwriteBody = req.body
    // check for @id; any value is valid
    if (!(overwriteBody['@id'] ?? overwriteBody.id)) {
      res.status(400).send("No record id to overwrite! (https://store.rerum.io/API.html#overwrite)")
      return
    }

    const overwriteOptions = {
      method: 'PUT',
      body: JSON.stringify(overwriteBody),
      headers: {
        'user-agent': 'Tiny-Things/1.0',
        'Origin': process.env.ORIGIN,
        'Authorization': `Bearer ${process.env.ACCESS_TOKEN}`,
        'Content-Type' : "application/json;charset=utf-8"
      }
    }

    // Pass through If-Overwritten-Version header if present
    const ifOverwrittenVersion = req.headers['if-overwritten-version']
    if (ifOverwrittenVersion) {
      overwriteOptions.headers['If-Overwritten-Version'] = ifOverwrittenVersion
    }

    // Check for __rerum.isOverwritten in body and use as If-Overwritten-Version header
    const isOverwrittenValue = req.body?.__rerum?.isOverwritten
    if (isOverwrittenValue) {
      overwriteOptions.headers['If-Overwritten-Version'] = isOverwrittenValue
    }

    const overwriteURL = `${process.env.RERUM_API_ADDR}overwrite`
    const rerumResponse = await fetchRerum(overwriteURL, overwriteOptions)
    .then(async (resp) => {
      if (resp.ok) return resp.json()
      // Handle 409 conflict error for version mismatch (optimistic locking)
      if (resp.status === 409) {
        const conflictBody = await resp.json()
        const err = new Error("Version conflict")
        err.status = 409
        err.body = conflictBody
        throw err
      }
      // The response from RERUM indicates a failure, likely with a specific code and textual body
      let rerumErrorMessage
      try {
        rerumErrorMessage = `${resp.status ?? 500}: ${overwriteURL} - ${await resp.text()}`
      } catch (e) {
        rerumErrorMessage = `500: ${overwriteURL} - A RERUM error occurred`
      }
      const err = new Error(rerumErrorMessage)
      err.status = 502
      throw err
    })
    if (!(rerumResponse.id || rerumResponse["@id"])) {
      // A 200 with garbled data, call it a fail
      throw createRerumNetworkError(overwriteURL)
    }
    res.setHeader("Location", rerumResponse["@id"] ?? rerumResponse.id)
    res.status(200).json(rerumResponse)
  }
  catch (err) {
    console.error(err)
    if (err.status === 409) {
      return res.status(409).json(err.body)
    }
    res.status(err.status ?? 500).type('text/plain').send(err.message ?? 'An error occurred')
  }
})

router.all('/', (req, res, next) => {
  res.status(405).send("Method Not Allowed")
})

export default router
