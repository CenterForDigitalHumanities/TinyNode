import express from "express"
import checkAccessToken from "../tokens.js"
import { httpError, verifyJsonContentType } from "../rest.js"
import { fetchRerum } from "../rerum.js"
import { isPassthroughRequest, requirePassthroughAllowed, resolveAuthorization } from "../passthrough.js"
const router = express.Router()

async function deleteRecord(req, res) {
  try {
    const uri = req.params.id ?? req.body?.['@id'] ?? req.body?.id
    if (!uri) {
      const err = new Error("No record id to delete! (https://store.rerum.io/v1/API.html#delete)")
      err.status = 400
      throw err
    }
    const id = uri.split("/").pop()
    const deleteURL = `${process.env.RERUM_API_ADDR}delete/${id}`
    const deleteOptions = {
      method: 'DELETE',
      headers: {
        'user-agent': 'Tiny-Things/1.0',
        'Origin': process.env.ORIGIN,
        'Authorization': resolveAuthorization(req)
      }
    }
    await fetchRerum(deleteURL, deleteOptions)
    .then(async (resp) => {
      if (resp.ok) return
      if (isPassthroughRequest(req) && (resp.status === 401 || resp.status === 403)) {
        let rerumAuthMessage
        try {
          rerumAuthMessage = `${resp.status}: ${deleteURL} - ${await resp.text()}`
        } catch (e) {
          rerumAuthMessage = `${resp.status}: ${deleteURL} - A RERUM error occurred`
        }
        throw httpError(rerumAuthMessage, resp.status)
      }
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
}

/* Legacy delete pattern w/body. */
router.delete('/', verifyJsonContentType, requirePassthroughAllowed, checkAccessToken, deleteRecord)

/* DELETE an object by ID via the RERUM API. */
router.delete('/:id', requirePassthroughAllowed, checkAccessToken, deleteRecord)

router.all('/', (req, res, next) => {
  res.status(405).send("Method Not Allowed")
})

export default router
