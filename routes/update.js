import express from "express"
import checkAccessToken from "../tokens.js"
const router = express.Router()

/* PUT an update to the thing. */
router.put('/', checkAccessToken, async (req, res, next) => {

  try {
    // check for @id in body.  Any value is valid.  Lack of value is a bad request.
    if (!req?.body || !(req.body['@id'] ?? req.body.id)) {
      res.status(400).send("No record id to update! (https://store.rerum.io/v1/API.html#update)")
      return
    }
    // check body for JSON
    const body = JSON.stringify(req.body)
    const updateOptions = {
      method: 'PUT',
      body,
      headers: {
        'user-agent': 'Tiny-Things/1.0',
        'Authorization': `Bearer ${process.env.ACCESS_TOKEN}`,
        'Content-Type' : "application/json;charset=utf-8"
      }
    }
    const updateURL = `${process.env.RERUM_API_ADDR}update`
    let errorState = false
    const result = await fetch(updateURL, updateOptions).then(res=>{
      if(res.ok) return res.json()
      errorState = true
      return res
    })
    .catch(err => {
      throw err
    })
    if (errorState) return next(result)
    res.setHeader("Location", result["@id"] ?? result.id)
    res.status(200)
    res.send(result)
  }
  catch (err) {
    next(err)
  }
})

router.all('/', (req, res, next) => {
  res.status(405).send("Method Not Allowed")
})

export default router
