import express from "express"
const router = express.Router()

router.all('/', (req, res, next) => {
  res.status(405).send("Method Not Allowed")
})

export default router
