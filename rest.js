const acceptedJsonContentTypes = new Set([
  "application/json",
  "application/ld+json"
])

export function httpError(message, status = 500, body) {
  const error = new Error(message)
  error.status = status
  if (body !== undefined) {
    error.payload = body
  }
  return error
}

function getContentType(req) {
  const rawContentType = req.headers?.["content-type"]
  if (!rawContentType) {
    return ""
  }
  if (rawContentType.includes(",")) {
    return "multiple"
  }
  return rawContentType.split(";")[0].trim().toLowerCase()
}

export function verifyJsonContentType(req, res, next) {
  const contentType = getContentType(req)
  if (contentType === "multiple") {
    res.status(415).send("Unsupported Media Type. Multiple Content-Type values are not allowed.")
    return
  }
  if (acceptedJsonContentTypes.has(contentType)) {
    next()
    return
  }
  res.status(415).send("Unsupported Media Type. Use application/json or application/ld+json.")
}
