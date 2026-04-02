import express from "express"
import { verifyJsonContentType } from "../rest.js"
import { fetchRerum } from "../rerum.js"
const router = express.Router()

/* POST a query to the thing. */
router.post('/', verifyJsonContentType, async (req, res, next) => {
  const lim = req.query.limit ?? 10
  const skip = req.query.skip ?? 0

  try {
    // check body for JSON
    const queryBody = JSON.stringify(req.body)
    // If there is an empty query with [] or {}, we consider that a query for all data,
    // which we don't want to allow. We will throw a 400 error.
    if (queryBody === '{}' || queryBody === '[]') {
      const err = new Error("Empty query is not allowed. Please provide a valid query in the request body.")
      err.status = 400
      throw err
    }
    // check limit and skip for INT
    if (Number.isNaN(Number.parseInt(lim, 10) + Number.parseInt(skip, 10))
      || (lim < 0)
      || (skip < 0)) {
      const err = new Error("`limit` and `skip` values must be positive integers or omitted.")
      err.status = 400
      throw err
    }

    const queryOptions = {
      method: 'POST',
      body: queryBody,
      headers: {
        'user-agent': 'Tiny-Things/1.0',
        'Origin': process.env.ORIGIN,
        'Authorization': `Bearer ${process.env.ACCESS_TOKEN}`, // not required for query
        'Content-Type' : "application/json;charset=utf-8"
      }
    }
    const queryURL = `${process.env.RERUM_API_ADDR}query?limit=${lim}&skip=${skip}`
    const rerumResponse = await fetchRerum(queryURL, queryOptions)
    .then(async (resp) => {
      if (resp.ok) return resp.json()
      // The response from RERUM indicates a failure, likely with a specific code and textual body
      let rerumErrorMessage
      try {
        rerumErrorMessage = `${resp.status ?? 500}: ${queryURL} - ${await resp.text()}`
      } catch (e) {
        rerumErrorMessage = `500: ${queryURL} - A RERUM error occurred`
      }
      const err = new Error(rerumErrorMessage)
      err.status = 502
      throw err
    })
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
