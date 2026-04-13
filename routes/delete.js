import express from "express"
import checkAccessToken from "../tokens.js"
import { verifyJsonContentType } from "../rest.js"
import { fetchRerum } from "../rerum.js"
const router = express.Router()

/* Legacy delete pattern w/body. */
router.delete('/', verifyJsonContentType, checkAccessToken, async (req, res, next) => {
  try {
    if (!req?.body || !(req.body['@id'] ?? req.body.id)) {
      const err = new Error("No record id to delete! (https://store.rerum.io/v1/API.html#delete)")
      err.status = 400
      throw err
    }

    const deleteBody = JSON.stringify(req.body)
    const deleteOptions = {
      body: deleteBody,
      method: 'DELETE',
      headers: {
        'user-agent': 'Tiny-Things/1.0',
        'Origin': process.env.ORIGIN,
        'Authorization': `Bearer ${process.env.ACCESS_TOKEN}`,
        'Content-Type' : "application/json; charset=utf-8"
      }
    }
    const deleteURL = `${process.env.RERUM_API_ADDR}delete`
    await fetchRerum(deleteURL, deleteOptions)
    .then(async (resp) => {
      if (resp.ok) return
      let rerumErrorMessage
      try {
        rerumErrorMessage = `${resp.status ?? 500}: ${deleteURL} - ${await resp.text()}`
      } catch (e) {
        rerumErrorMessage = `500: ${deleteURL} - A RERUM error occurred`
      }
      const err = new Error(rerumErrorMessage)
      err.status = 502
      throw err
    })
    res.status(204).end()
  }
  catch (err) {
    console.error(err)
    res.status(err.status ?? 500).type('text/plain').send(err.message ?? 'An error occurred')
  }
})

/* DELETE an object by ID via the RERUM API. */
router.delete('/:id', checkAccessToken, async (req, res, next) => {
  try {
  
    const deleteURL = `${process.env.RERUM_API_ADDR}delete/${req.params.id}`
    const deleteOptions = {
      method: "DELETE",
      headers: {
        'user-agent': 'Tiny-Things/1.0',
        'Origin': process.env.ORIGIN,
        'Authorization': `Bearer ${process.env.ACCESS_TOKEN}`,
      }
    }
    await fetchRerum(deleteURL, deleteOptions)
    .then(async (resp) => {
      if (resp.ok) return
      // The response from RERUM indicates a failure, likely with a specific code and textual body
      let rerumErrorMessage
      try {
        rerumErrorMessage = `${resp.status ?? 500}: ${deleteURL} - ${await resp.text()}`
      } catch (e) {
        rerumErrorMessage = `500: ${deleteURL} - A RERUM error occurred`
      }
      const err = new Error(rerumErrorMessage)
      err.status = 502
      throw err
    })
    res.status(204).end()
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
