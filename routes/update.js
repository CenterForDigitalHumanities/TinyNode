import express from "express"
import checkAccessToken from "../tokens.js"
import { verifyJsonContentType } from "../rest.js"
import { createRerumNetworkError, fetchRerum } from "../rerum.js"
const router = express.Router()

/* PUT an update to the thing. */
router.put('/', verifyJsonContentType, checkAccessToken, async (req, res, next) => {

  try {
    // check for @id; any value is valid
    if (!(req.body['@id'] ?? req.body.id)) {
      const err = new Error("No record id to update! (https://store.rerum.io/API.html#update)")
      err.status = 400
      throw err
    }

    const updateBody = JSON.stringify(req.body)
    const updateOptions = {
      method: 'PUT',
      body: updateBody,
      headers: {
        'user-agent': 'Tiny-Things/1.0',
        'Origin': process.env.ORIGIN,
        'Authorization': `Bearer ${process.env.ACCESS_TOKEN}`,
        'Content-Type' : "application/json;charset=utf-8"
      }
    }
    const updateURL = `${process.env.RERUM_API_ADDR}update`
    const rerumResponse = await fetchRerum(updateURL, updateOptions)
    .then(async (resp) => {
      if (resp.ok) return resp.json()
      // The response from RERUM indicates a failure, likely with a specific code and textual body
      let rerumErrorMessage
      try {
        rerumErrorMessage = `${resp.status ?? 500}: ${updateURL} - ${await resp.text()}`
      } catch (e) {
        rerumErrorMessage = `500: ${updateURL} - A RERUM error occurred`
      }
      const err = new Error(rerumErrorMessage)
      err.status = 502
      throw err
    })
    if (!(rerumResponse.id || rerumResponse["@id"])) {
      // A 200 with garbled data, call it a fail
      throw createRerumNetworkError(updateURL)
    }

    res.setHeader("Location", rerumResponse["@id"] ?? rerumResponse.id)
    res.status(200).json(rerumResponse)
  }
  catch (err) {
    console.error(err)
    res.status(err.status ?? 500).type('text/plain').send(err.message ?? 'An error occurred')
  }
})

router.all('/', (req, res, next) => {
  res.status(405).send("Method Not Allowed")
})

export default router
