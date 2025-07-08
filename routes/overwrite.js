import express from "express"
import checkAccessToken from "../tokens.js"
const router = express.Router()
import rerumPropertiesWasher from "../preprocessor.js"

/* PUT an overwrite to the thing. */
router.put('/', checkAccessToken, rerumPropertiesWasher, async (req, res, next) => {

  try {
    
    const overwriteBody = req.body
    // check for @id; any value is valid
    if (!(overwriteBody['@id'] ?? overwriteBody.id)) {
      throw Error("No record id to overwrite! (https://store.rerum.io/API.html#overwrite)")
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
    const response = await fetch(overwriteURL, overwriteOptions)
    .then(resp=>{
      if (!resp.ok) throw resp
      return resp
    })
    .catch(async err => {
      // Handle 409 conflict error for version mismatch
      if (err.status === 409) {
        const currentVersion = await err.json()
        return res.status(409).json(currentVersion)
      }
      throw new Error(`Error in overwrite request: ${err.status} ${err.statusText}`)
    })
    if(res.headersSent) return
    const result = await response.json()
    const location = result?.["@id"] ?? result?.id
    if (location) {
      res.setHeader("Location", location)
    }
    res.status(response.status ?? 200)
    res.json(result)
  }
  catch (err) {
    res.status(500).send("Caught Error:" + err)
  }
})

router.all('/', (req, res, next) => {
  res.status(405).send("Method Not Allowed")
})

export default router
