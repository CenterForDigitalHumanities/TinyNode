import express from "express"
import checkAccessToken from "../tokens.js"
const router = express.Router()

/* PUT an overwrite to the thing. */
router.put('/', checkAccessToken, async (req, res, next) => {

  try {
    
    const overwriteBody = req.body
    // check for @id; any value is valid
    if (!(overwriteBody['@id'] ?? overwriteBody.id)) {
      res.status(400).send("No record id to overwrite! (https://store.rerum.io/API.html#overwrite)")
      return
    }

    const overwriteOptions = {
      method: 'PUT',
      body: JSON.stringify(overwriteBody),
      headers: {
        'user-agent': 'Tiny-Things/1.0',
        'Authorization': `Bearer ${process.env.ACCESS_TOKEN}`,
        'Content-Type' : "application/json;charset=utf-8"
      }
    }

    // Pass through If-Overwritten-Version header if present
    const ifOverwrittenVersion = req.headers.hasOwnProperty('if-overwritten-version') ? req.headers['if-overwritten-version'] : null
    if (ifOverwrittenVersion !== null) {
      overwriteOptions.headers['If-Overwritten-Version'] = ifOverwrittenVersion
    }

    // Check for __rerum.isOverwritten in body and use as If-Overwritten-Version header
    const isOverwrittenValue = req.body?.__rerum?.hasOwnProperty("isOverwritten") ? req.body.__rerum.isOverwritten : null
    if (isOverwrittenValue !== null) {
      overwriteOptions.headers['If-Overwritten-Version'] = isOverwrittenValue
    }

    const overwriteURL = `${process.env.RERUM_API_ADDR}overwrite`
    let errored = false
    const response = await fetch(overwriteURL, overwriteOptions)
    .then(async rerum_res=>{
      if (rerum_res.ok) return rerum_res.json()
      errored = true
      if (rerum_res.headers.get("Content-Type").includes("json")) {
        // Special handling.  This does not go through to error-messenger.js
        if (rerum_res.status === 409) {
          const currentVersion = await rerum_res.json()
          return res.status(409).json(currentVersion)
        }
      }
      return rerum_res
    })
    .catch(err => {
      throw err
    })
    // Send RERUM error responses to to error-messenger.js
    if (errored) return next(response)
    const result = response
    const location = result?.["@id"] ?? result?.id
    if (location) {
      res.setHeader("Location", location)
    }
    res.status(200)
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
