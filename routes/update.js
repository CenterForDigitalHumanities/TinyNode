import express from "express"
const router = express.Router()
import rerumPropertiesWasher from "../preprocessor.js"

/* PUT an update to the thing. */
router.put('/', rerumPropertiesWasher, async (req, res, next) => {

  try {
    // check body for JSON
    const body = JSON.stringify(req.body)

    // check for @id in body.  Any value is valid.  Lack of value is a bad request.
    if (!req?.body || !(req.body['@id'] ?? req.body.id)) {
      res.status(400).send("No record id to update! (https://centerfordigitalhumanities.github.io/rerum_server/API.html#update)")
    }

    const updateOptions = {
      method: 'PUT',
      body,
      headers: {
        'user-agent': 'Tiny-Things/1.0',
        'Authorization': `Bearer ${process.env.ACCESS_TOKEN}`, // not required for query
        'Content-Type' : "application/json;charset=utf-8"
      }
    }
    const updateURL = `${process.env.RERUM_API_ADDR}update`
    const result = await fetch(updateURL, updateOptions).then(res=>res.json())
    .catch(err=>next(err))
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
