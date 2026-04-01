/**
 * Errors from RERUM are a response code with a text body (except those handled specifically upstream)
 * We want to send the same error code and message through.  It is assumed to be RESTful and useful.
 * This will also handle generic (500) app level errors, as well as app level 404 errors.
 *
 * @param rerum_error_res A Fetch API Response object from a fetch() to RERUM that encountered an error.  Explanatory text is in .text().  In some cases it is a unhandled generic (500) app level Error.
 * @param req The Express Request object from the request into TinyNode
 * @param res The Express Response object to send out of TinyNode
 * @param next The Express next() operator, unused here but required to support the middleware chain.
 */
export async function messenger(rerum_error_res, req, res, next) {
    if (res.headersSent) {
        return
    }

    const error = {
        message: rerum_error_res.statusMessage ?? rerum_error_res.message ?? "A server error has occured",
        status: rerum_error_res.statusCode ?? rerum_error_res.status ?? 500,
        body: rerum_error_res.body
    }

    if (error.body !== undefined) {
        console.error(error)
        res.status(error.status).json(error.body)
        return
    }

    try {
        const contentType = rerum_error_res.headers?.get?.("Content-Type")?.toLowerCase?.() ?? ""
        if (contentType.includes("json")) {
            error.body = await rerum_error_res.json()
            console.error(error)
            res.status(error.status).json(error.body)
            return
        }

        const rerumErrText = await rerum_error_res.text()
        if (rerumErrText) {
            error.message = rerumErrText
        }
    }
    catch (err) {
        // Fall back to the status/message values already collected above.
    }

    console.error(error)
    res.set("Content-Type", "text/plain; charset=utf-8")
    res.status(error.status).send(error.message)
}
