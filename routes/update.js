const express = require('express')
const router = express.Router()

/* PUT an update to the thing. */
router.put('/', async (req, res, next) => {

  try {
    // check body for JSON
    const body = JSON.stringify(req.body)

    // check for @id; any value is valid
    if (!(req.body['@id'] ?? req.body.id)) {
      throw Error("No record id to update! (https://centerfordigitalhumanities.github.io/rerum_server/API.html#update)")
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
    res.status(200)
    res.send(result)
  }
  catch (err) {
    console.log(err)
    res.status(500).send("Caught Error:" + err)
  }
})

module.exports = router
