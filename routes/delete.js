const express = require('express')
const router = express.Router()

/* Legacy delete pattern w/body */

/* DELETE a delete to the thing. */
router.delete('/', async (req, res, next) => {
  try {
    const body = JSON.stringify(req.body)
    const deleteOptions = {
      body,
      method: 'DELETE',
      headers: {
        'user-agent': 'Tiny-Node',
        'Authorization': `Bearer ${process.env.ACCESS_TOKEN}`,
        'Content-Type' : "application/json; charset=utf-8"
      }
    }
    console.log(body)
    const deleteURL = `${process.env.RERUM_API_ADDR}delete`
    const result = await fetch(deleteURL, deleteOptions).text()
    res.status(204)
    res.send(result)
  }
  catch (err) {
    console.log(err)
    res.status(500).send("Caught Error:" + err)
  }
})

/* DELETE a delete to the thing. */
router.delete('/:id', async (req, res, next) => {
  try {
  
    const deleteURL = `${process.env.RERUM_API_ADDR}delete/${req.params.id}`
    const deleteOptions = {
      method: 'DELETE',
      headers: {
        'user-agent': 'Tiny-Node',
        'Authorization': `Bearer ${process.env.ACCESS_TOKEN}`,
      }
    }
    const result = await fetch(deleteURL, deleteOptions).text()
    res.status(204)
    res.send(result)
  }
  catch (err) {
    console.log(err)
    res.status(500).send("Caught Error:" + err)
  }
})

module.exports = router
