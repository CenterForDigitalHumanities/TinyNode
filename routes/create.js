import express from "express"
import checkAccessToken from "../tokens.js"
const router = express.Router()

/* POST a create to the thing. */
router.post('/', checkAccessToken, async (req, res, next) => {

  try {
    // check body for JSON
    const body = JSON.stringify(req.body)
    const createOptions = {
      method: 'POST',
      body,
      headers: {
        'user-agent': 'Tiny-Things/1.0',
        'Authorization': `Bearer ${process.env.ACCESS_TOKEN}`,
        'Content-Type' : "application/json;charset=utf-8"
      }
    }
    const createURL = `${process.env.RERUM_API_ADDR}create`
    let errored = false
    const result = await fetch(createURL, createOptions).then(res=>{
      if (res.ok) return res.json()
      errored = true
      return res
    })
    .catch(err => {
      throw err
    })
    // Send RERUM error responses to to error-messenger.js
    if (errored) return next(result)
    res.setHeader("Location", result["@id"] ?? result.id)
    res.status(201)
    res.json(result)
  }
  catch (err) {
    next(err)
  }
})

router.all('/', (req, res, next) => {
  res.status(405).send("Method Not Allowed")
})

export default router