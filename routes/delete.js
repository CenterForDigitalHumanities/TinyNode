import express from "express"
import checkAccessToken from "../tokens.js"
const router = express.Router()

/* Legacy delete pattern w/body */

/* DELETE a delete to the thing. */
router.delete('/', checkAccessToken, async (req, res, next) => {
  try {
    // check for @id in body.  Any value is valid.  Lack of value is a bad request.
    if (!req?.body || !(req.body['@id'] ?? req.body.id)) {
      res.status(400).send("No record id to delete! (https://store.rerum.io/v1/API.html#delete)")
      return
    }
    const body = JSON.stringify(req.body)
    const deleteOptions = {
      body,
      method: 'DELETE',
      headers: {
        'user-agent': 'Tiny-Things/1.0',
        'Authorization': `Bearer ${process.env.ACCESS_TOKEN}`,
        'Content-Type' : "application/json; charset=utf-8"
      }
    }
    const deleteURL = `${process.env.RERUM_API_ADDR}delete`
    let errored = false
    const result = await fetch(deleteURL, deleteOptions).then(res=>{
      if(!res.ok) errored = true
      return res.text()
    })
    .catch(err => {
      throw err
    })
    if (errored) return next(results)
    res.status(204)
    res.send(result)
  }
  catch (err) {
    next(err)
  }
})

/* DELETE a delete to the thing. */
router.delete('/:id', async (req, res, next) => {
  try {
  
    const deleteURL = `${process.env.RERUM_API_ADDR}delete/${req.params.id}`
    const deleteOptions = {
      method: 'DELETE',
      headers: {
        'user-agent': 'Tiny-Things/1.0',
        'Authorization': `Bearer ${process.env.ACCESS_TOKEN}`,
      }
    }
    let errored = false
    const result = await fetch(deleteURL, deleteOptions).then(res => {
      if(!res.ok) errored = true
      return res
    })
    .catch(err => {
      throw err
    })
    // Send RERUM error responses to to error-messenger.js
    if (errored) return next(results)
    res.status(204)
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
