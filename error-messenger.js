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
    let error = {}
    let rerum_err_text
    try {
        rerum_err_text = await rerum_error_res.text()
    }
    catch (err) {
        rerum_err_text = undefined
    }
    if (rerum_err_text) error.message = rerum_err_text
    else { 
        // Perhaps this is a more generic 500 from the app and there is no good rerum_error_res
        error.message = rerum_error_res.statusMessage ?? rerum_error_res.message ?? `An unhandled error occured, perhaps with RERUM.` 
    }
    error.status = rerum_error_res.statusCode ?? rerum_error_res.status ?? 500
    console.error(error)
    res.set("Content-Type", "text/plain; charset=utf-8")
    res.status(error.status).send(error.message)
}
