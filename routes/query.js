import express from "express"
import { verifyJsonContentType } from "../rest.js"
const router = express.Router()

/* POST a query to the thing. */
router.post('/', verifyJsonContentType, async (req, res, next) => {
  const lim = req.query.limit ?? 10
  const skip = req.query.skip ?? 0
  const limit = Number.parseInt(lim, 10)
  const offset = Number.parseInt(skip, 10)

  try {
    if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
      res.status(400).send("Query payload must be a non-empty JSON object.")
      return
    }
    if (Object.keys(req.body).length === 0) {
      res.status(400).send("Query payload must not be an empty object.")
      return
    }
    if (!Number.isInteger(limit) || !Number.isInteger(offset) || limit < 0 || offset < 0) {
      res.status(400).send("`limit` and `skip` values must be non-negative integers or omitted.")
      return
    }
    const body = JSON.stringify(req.body)
    const queryOptions = {
      method: 'POST',
      body,
      headers: {
        'user-agent': 'Tiny-Things/1.0',
        'Authorization': `Bearer ${process.env.RERUM_TOKEN}`, // not required for query
        'Content-Type' : "application/json;charset=utf-8"
      }
    }
    const queryURL = `${process.env.RERUM_API_ADDR}query?limit=${limit}&skip=${offset}`
    let errored = false
    const results = await fetch(queryURL, queryOptions).then(res=>{
      if (res.ok) return res.json()
      errored = true
      return res
    })
    .catch(err => {
      throw err
    })
    // Send RERUM error responses to error-messenger.js
    if (errored) return next(results)
    res.status(200)
    res.send(results)
  }
  catch (err) { // a dumb catch-all for Tiny Stuff
    next(err)
  }
})

router.all('/', (req, res, next) => {
  res.status(405).send("Method Not Allowed")
})

export default router
