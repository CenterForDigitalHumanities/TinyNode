import { httpError } from "./rest.js"

/**
 * Whether this TinyNode instance accepts caller-provided Authorization
 * headers (token passthrough).  Defaults to true so a deployed instance
 * can act as a machine-to-machine relay for registered RERUM agents.
 * Set ALLOW_PASSTHROUGH_TOKENS=false (case-insensitive) to force every
 * write to use this instance's own identity.
 */
export function isPassthroughAllowed() {
    return String(process.env.ALLOW_PASSTHROUGH_TOKENS ?? "").trim().toLowerCase() !== "false"
}

/**
 * The Authorization header value the request should carry upstream.
 * When the caller provided one and passthrough is allowed, their value
 * replaces this instance's ACCESS_TOKEN.  Otherwise the instance's
 * default identity is used.
 *
 * @param {import("express").Request} req
 * @returns {string} the full Authorization header value, e.g. "Bearer ..."
 */
export function resolveAuthorization(req) {
    const incoming = req?.headers?.authorization
    if (incoming && isPassthroughAllowed()) {
        return incoming
    }
    return `Bearer ${process.env.ACCESS_TOKEN}`
}

/**
 * Middleware guard for token passthrough.  When passthrough is disabled
 * and a caller supplies an Authorization header, reject the request
 * rather than silently attributing the write to this instance's agent.
 * The caller's token is not validated here; RERUM is the authority.
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */
export function requirePassthroughAllowed(req, res, next) {
    if (req?.headers?.authorization && !isPassthroughAllowed()) {
        return next(httpError(
            "Token passthrough is not allowed on this TinyNode instance. Remove the Authorization header to act as this instance's agent.",
            403
        ))
    }
    next()
}

/**
 * Whether the incoming request carries a caller-provided Authorization
 * header that will be honored upstream.  Used by checkAccessToken to
 * skip the instance token refresh cycle, and by modification routes to
 * decide whether an upstream 401/403 should be passed through to the
 * caller instead of mapped to TinyNode's 502 contract.
 *
 * @param {import("express").Request} req
 * @returns {boolean}
 */
export function isPassthroughRequest(req) {
    return Boolean(req?.headers?.authorization && isPassthroughAllowed())
}
