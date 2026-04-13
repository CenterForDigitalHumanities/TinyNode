const DEFAULT_RERUM_TIMEOUT_MS = 30000

const getRerumTimeoutMs = () => {
  const timeoutMs = Number.parseInt(process.env.RERUM_FETCH_TIMEOUT_MS ?? `${DEFAULT_RERUM_TIMEOUT_MS}`, 10)
  return Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : DEFAULT_RERUM_TIMEOUT_MS
}

/**
 * Build the generic upstream error used when RERUM cannot be reached or returns invalid data.
 *
 * @param {string} url - The RERUM URL being requested
 * @returns {Error}
 */
const createRerumNetworkError = (url) => {
  const err = new Error(`500: ${url} - A RERUM error occurred`)
  err.status = 502
  return err
}

/**
 * Build an upstream timeout error for requests that exceed the configured wait time.
 *
 * @param {string} url - The RERUM URL being requested
 * @param {number} timeoutMs - The timeout in milliseconds
 * @returns {Error}
 */
const createRerumTimeoutError = (url, timeoutMs) => {
  const err = new Error(`504: ${url} - RERUM did not respond within ${timeoutMs}ms`)
  err.status = 504
  return err
}

/**
 * Execute a fetch to RERUM with a bounded wait time so workers do not block indefinitely.
 *
 * @param {string} url - The RERUM URL being requested
 * @param {RequestInit} [options={}] - Fetch options
 * @returns {Promise<Response>}
 */
async function fetchRerum(url, options = {}) {
  const timeoutMs = getRerumTimeoutMs()
  const timeoutController = new AbortController()
  const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs)
  const signal = options.signal
    ? AbortSignal.any([options.signal, timeoutController.signal])
    : timeoutController.signal

  try {
    return await fetch(url, { ...options, signal })
  }
  catch (err) {
    if (err?.name === "AbortError" && timeoutController.signal.aborted) {
      throw createRerumTimeoutError(url, timeoutMs)
    }
    throw createRerumNetworkError(url)
  }
  finally {
    clearTimeout(timeoutId)
  }
}

export { createRerumNetworkError, fetchRerum }
