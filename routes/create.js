import express from "express"
import checkAccessToken from "../tokens.js"
import { verifyJsonContentType } from "../rest.js"
import { createRerumNetworkError, fetchRerum } from "../rerum.js"
const router = express.Router()

/* POST a create to the thing. */
router.post('/', verifyJsonContentType, checkAccessToken, async (req, res, next) => {

  try {
    // if an id is passed in, pop off the end to make it an _id
    if (req.body.id) {
      req.body._id = req.body.id.split('/').pop()
    }

    // check body for JSON
    const createBody = JSON.stringify(req.body)
    const createOptions = {
      method: 'POST',
      body: createBody,
      headers: {
        'user-agent': 'Tiny-Things/1.0',
        'Origin': process.env.ORIGIN,
        'Authorization': `Bearer ${process.env.ACCESS_TOKEN}`,
        'Content-Type' : "application/json;charset=utf-8"
      }
    }
    const createURL = `${process.env.RERUM_API_ADDR}create`
    const rerumResponse = await fetchRerum(createURL, createOptions)
    .then(async (resp) => {
      if (resp.ok) return resp.json()
      // The response from RERUM indicates a failure, likely with a specific code and textual body
      let rerumErrorMessage
      try {
        rerumErrorMessage = `${resp.status ?? 500}: ${createURL} - ${await resp.text()}`
      } catch (e) {
        rerumErrorMessage = `500: ${createURL} - A RERUM error occurred`
      }
      const err = new Error(rerumErrorMessage)
      err.status = 502
      throw err
    })
    if (!(rerumResponse.id || rerumResponse["@id"])) {
      // A 200 with garbled data, call it a fail
      throw createRerumNetworkError(createURL)
    }
    res.setHeader("Location", rerumResponse["@id"] ?? rerumResponse.id)
    res.status(201).json(rerumResponse)
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
